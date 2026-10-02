import dotenv from "dotenv";

dotenv.config();

export const huggingFaceConfig = {
    apiKey: process.env.HF_API_KEY || process.env.HF_TOKEN || "",
    model: process.env.HF_MODEL || "Qwen/Qwen2.5-Coder-32B-Instruct"
};

