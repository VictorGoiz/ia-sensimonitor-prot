import { ollamaConfig } from "../config/ollama.js";
import { huggingFaceConfig } from "../config/huggingface.js";

// 1. Persona e Regras do Analista de Qualidade do Ar
const SYSTEM_PROMPT = {
    role: "system",
    content: `Você é um Analista de Qualidade do Ar do SensiMonitor.
Regras de Resposta:
- Seja DIRETO, CONCISO e OBJETIVO.
- Analise parâmetros de sensores (PM2.5, PM10, CO2, VOCs, temperatura, umidade).
- Destaque o status do ar e ações práticas.
- Responda em poucas frases ou em tópicos curtos.`
};

// 2. Histórico em memória
const history = [SYSTEM_PROMPT];


export async function sendMessage(message) {
    history.push({
        role: "user",
        content: message
    });

    const recentHistory = [
        SYSTEM_PROMPT,
        ...history.slice(1).slice(-6)
    ];

    try {
        const response = await fetch(`${ollamaConfig.url}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: ollamaConfig.model,
                messages: recentHistory,
                stream: false,
                options: {
                    num_predict: 200,
                    num_ctx: 1024,
                    temperature: 0.6
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erro ao comunicar com Ollama: ${error}`);
        }

        const data = await response.json();
        const assistantMessage = data.message.content;

        history.push({
            role: "assistant",
            content: assistantMessage
        });

        return assistantMessage;

    } catch (error) {
        if (error.cause && error.cause.code === "ECONNREFUSED") {
            throw new Error("Não foi possível conectar ao Ollama local. Verifique se o serviço está ligado no seu computador ('ollama serve').");
        }
        throw error;
    }
}

import { hf } from "../config/hf.js";

/**
 * =========================================================================
 * OPÇÃO 2: Enviar mensagem usando o HUGGING FACE (Nuvem / API) com Fallback
 * =========================================================================
 */
export async function sendMessageHuggingFace(message) {
    history.push({
        role: "user",
        content: message
    });

    const recentHistory = [
        SYSTEM_PROMPT,
        ...history.slice(1).slice(-6)
    ];

    const candidateModels = [
        huggingFaceConfig.model,
        "Qwen/Qwen2.5-Coder-32B-Instruct",
        "meta-llama/Llama-3.3-70B-Instruct",
        "deepseek-ai/DeepSeek-V3",
        "meta-llama/Llama-3.1-8B-Instruct"
    ].filter(Boolean);

    // Remove duplicatas mantendo a ordem de preferência
    const uniqueModels = [...new Set(candidateModels)];

    const token = (huggingFaceConfig.apiKey || process.env.HF_TOKEN || "").trim();

    // 1. Se houver token do Hugging Face, tenta a lista de modelos candidatos
    if (token && !token.includes("sua_chave") && token !== "hf_xxxx") {
        for (const model of uniqueModels) {
            try {
                const response = await hf.chatCompletion({
                    model,
                    messages: recentHistory,
                    max_tokens: 350,
                    temperature: 0.5
                });

                const assistantMessage = response?.choices?.[0]?.message?.content;
                if (assistantMessage) {
                    history.push({
                        role: "assistant",
                        content: assistantMessage
                    });
                    return assistantMessage;
                }
            } catch (err) {
                console.warn(`[ChatService] Modelo Hugging Face '${model}' indisponível: ${err.message}. Tentando próximo modelo...`);
            }
        }
    }

    // 2. Se Hugging Face falhar ou não tiver token, tenta Ollama local
    try {
        console.info("[ChatService] Tentando resposta via Ollama local...");
        const response = await fetch(`${ollamaConfig.url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(4000),
            body: JSON.stringify({
                model: ollamaConfig.model,
                messages: recentHistory,
                stream: false,
                options: {
                    num_predict: 300,
                    num_ctx: 1024,
                    temperature: 0.6
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const assistantMessage = data.message.content;
            history.push({
                role: "assistant",
                content: assistantMessage
            });
            return assistantMessage;
        }
    } catch (ollamaErr) {
        console.warn("[ChatService] Ollama local inacessível:", ollamaErr.message);
    }

    // 3. Fallback inteligente determinístico do analista de ar SensiMonitor
    const fallbackResponse = `**SensiMonitor // Assistente Técnico:**\nRecebi sua consulta sobre monitoramento de qualidade do ar e conformidade regulatória. Para análise detalhada de telemetria em tempo real, você pode enviar o JSON do sensor LFG60 (com temperatura, umidade, CO2, PM2.5, PM10, VOC e HCHO) para obter o laudo pericial completo fundamentado na ANVISA RE nº 09/2003, OMS e NR-17.`;

    history.push({
        role: "assistant",
        content: fallbackResponse
    });

    return fallbackResponse;
}

/**
 * Limpa o histórico de conversa mantendo o prompt de sistema
 */
export function clearHistory() {
    history.length = 0;
    history.push(SYSTEM_PROMPT);
}