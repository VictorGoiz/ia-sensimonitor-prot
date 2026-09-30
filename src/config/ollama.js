import dotenv from "dotenv";

dotenv.config();

export const ollamaConfig = {
    url: process.env.OLLAMA_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "qwen2.5:7b"
};