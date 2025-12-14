import type { Candidate, CandidateWithPicture } from "../types/createGame";
import { API_BASE_URL } from "../constants/createGameConstants";

/**
 * Uploads a file directly to S3 from the frontend using a presigned URL
 * @param file - The file to upload
 * @param gameCode - The game code
 * @param candidateName - The candidate name
 * @returns The S3 key/path of the uploaded file (to be stored in database)
 */
export const uploadFileToS3 = async (
    file: File,
    gameCode: string,
    candidateName: string
): Promise<string> => {

    // Generate S3 key: gamecode/candidate-name-timestamp.extension
    const timestamp = Date.now();
    const sanitizedName = candidateName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const fileExtension = file.name.split(".").pop() || "jpg";
    const key = `${gameCode}/${sanitizedName}-${timestamp}.${fileExtension}`;

    // Step 1: Get presigned URL from backend
    const presignResponse = await fetch(`${API_BASE_URL}/pictures/presign-upload`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            key: key,
            content_type: file.type || "application/octet-stream",
        }),
    });

    if (!presignResponse.ok) {
        const errorText = await presignResponse.text();
        throw new Error(`Failed to get presigned URL: ${errorText}`);
    }

    const presignResult = await presignResponse.json() as {
        status: string;
        data: {
            signed_url: string;
        };
    };

    const signedUrl = presignResult.data.signed_url;

    // Step 2: Upload file directly to S3 using the presigned URL
    // Important: Content-Type must exactly match what was used to generate the presigned URL
    const contentType = file.type || "application/octet-stream";
    
    // Ensure we use the exact same content type that was sent to the backend
    const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => "");
        throw new Error(
            `Failed to upload file to S3: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`
        );
    }

    // Step 3: Return the S3 key (not the presigned URL) to be stored in database
    return key;
};

/**
 * Uploads multiple candidate pictures to S3
 * @param candidates - Array of candidate objects with name and pictureFile
 * @param gameCode - The game code
 * @returns Array of candidates with S3 paths
 */
export const uploadCandidatePictures = async (
    candidates: Candidate[],
    gameCode: string
): Promise<CandidateWithPicture[]> => {
    const uploadPromises = candidates.map(async (candidate): Promise<CandidateWithPicture> => {
        const candidateName = candidate.name || "";
        const pictureFile = candidate.pictureFile;

        if (!pictureFile) {
            // No file to upload, return empty string for picture
            return {
                ...candidate,
                picture: "",
            };
        }

        try {
            const s3Path = await uploadFileToS3(pictureFile, gameCode, candidateName);
            return {
                ...candidate,
                picture: s3Path,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to upload picture for ${candidateName}:`, error);
            throw new Error(`Failed to upload picture for ${candidateName}: ${errorMessage}`);
        }
    });

    return Promise.all(uploadPromises);
};

