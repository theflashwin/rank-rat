import { useState } from "react";
import type { FormValues, Candidate } from "../types/createGame";

const initialFormValues: FormValues = {
    name: "",
    gameCode: "",
    questions: [""],
    candidates: [{ name: "", picture: "" }],
};

type FormField = keyof FormValues;
type ListField = "questions" | "candidates";

export const useCreateGameForm = () => {
    const [formValues, setFormValues] = useState<FormValues>(initialFormValues);

    const updateField = (field: FormField, value: string) => {
        setFormValues((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const updateListField = (field: ListField, index: number, value: string | Candidate) => {
        setFormValues((previous) => {
            const nextList = [...previous[field]];
            nextList[index] = value;
            return { ...previous, [field]: nextList };
        });
    };

    const addListField = (field: ListField) => {
        setFormValues((previous) => {
            if (field === "candidates") {
                return {
                    ...previous,
                    [field]: [...previous[field], { name: "", picture: "" }],
                };
            }
            return {
                ...previous,
                [field]: [...previous[field], ""],
            };
        });
    };

    const removeListField = (field: ListField, indexToRemove: number) => {
        setFormValues((previous) => {
            const nextList = previous[field].filter(
                (_, index) => index !== indexToRemove
            );
            if (nextList.length === 0) {
                if (field === "candidates") {
                    nextList.push({ name: "", picture: "" });
                } else {
                    nextList.push("");
                }
            }
            return { ...previous, [field]: nextList };
        });
    };

    return {
        formValues,
        setFormValues,
        updateField,
        updateListField,
        addListField,
        removeListField,
    };
};

