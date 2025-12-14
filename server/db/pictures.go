package db

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type PictureStore struct {
	S3Client   *s3.Client
	Presigner  *s3.PresignClient
	BucketName string
}

const bucketName = "rankrat-pictures"

func NewPictureStore() (*PictureStore, error) {

	// Get region from environment variable or use default
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1" // default region
	}

	// Validate region is not empty
	if region == "" {
		return nil, fmt.Errorf("AWS_REGION is required but was empty")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config with region %s: %w", region, err)
	}

	S3Client := s3.NewFromConfig(cfg)
	Presigner := s3.NewPresignClient(S3Client)

	return &PictureStore{
		S3Client:   S3Client,
		Presigner:  Presigner,
		BucketName: bucketName,
	}, nil

}

func (store *PictureStore) PresignUpload(ctx context.Context, key, contentType string) (string, error) {

	if key == "" {
		return "", nil
	}

	res, err := store.Presigner.PresignPutObject(
		ctx,
		&s3.PutObjectInput{
			Bucket:      aws.String(store.BucketName),
			Key:         aws.String(key),
			ContentType: aws.String(contentType),
		},
	)

	if err != nil {
		return "", err
	}

	return res.URL, nil

}

func (store *PictureStore) PresignDownload(ctx context.Context, key string, expiry time.Duration) (string, error) {

	if key == "" {
		return "", nil
	}

	res, err := store.Presigner.PresignGetObject(
		ctx,
		&s3.GetObjectInput{
			Bucket: aws.String(store.BucketName),
			Key:    aws.String(key),
		},
		s3.WithPresignExpires(expiry),
	)

	if err != nil {
		return "", err
	}

	return res.URL, nil

}
