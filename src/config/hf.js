import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

export const hf = new InferenceClient(
    process.env.HF_TOKEN || process.env.HF_API_KEY
);