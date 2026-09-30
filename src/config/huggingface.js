import dotenv from "dotenv";

dotenv.config();

export const huggingFaceConfig = {
    apiKey: process.env.HF_API_KEY || "",
    model: process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct"
};
