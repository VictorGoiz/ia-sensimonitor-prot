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

/**
 * =========================================================================
 * OPÇÃO 2: Enviar mensagem usando o HUGGING FACE (Nuvem / API)
 * =========================================================================
 */
export async function sendMessageHuggingFace(message) {
    const token = (huggingFaceConfig.apiKey || "").trim();

    // Validação de token antes de fazer a requisição
    if (!token || token.includes("sua_chave") || token === "hf_xxxx") {
        throw new Error("Token HF_API_KEY inválido ou não configurado no arquivo .env. Obtenha seu token gratuito em https://huggingface.co/settings/tokens e cole no seu arquivo .env.");
    }

    history.push({
        role: "user",
        content: message
    });

    const recentHistory = [
        SYSTEM_PROMPT,
        ...history.slice(1).slice(-6)
    ];

    const modelName = huggingFaceConfig.model || "meta-llama/Llama-3.2-3B-Instruct";

    try {
        // Usa o novo endpoint oficial do Hugging Face Router
        const response = await fetch("https://router.huggingface.co/hf-inference/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelName,
                messages: recentHistory,
                max_tokens: 250,
                temperature: 0.6
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401 || errorText.includes("Invalid username or password")) {
                throw new Error("Token do Hugging Face inválido (401). Verifique se você copiou o token correto com permissão 'Read' em https://huggingface.co/settings/tokens.");
            }
            if (errorText.includes("Model not supported")) {
                throw new Error(`O modelo '${modelName}' não é suportado pelo Hugging Face gratuito. Sugestão: defina HF_MODEL=meta-llama/Llama-3.2-3B-Instruct no arquivo .env.`);
            }
            throw new Error(`Erro no Hugging Face (Status ${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        const assistantMessage = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : "Sem resposta gerada pelo modelo.";

        history.push({
            role: "assistant",
            content: assistantMessage
        });

        return assistantMessage;

    } catch (error) {
        if (error.cause && (error.cause.code === "ENOTFOUND" || error.message.includes("fetch failed"))) {
            throw new Error("Erro de conexão com o Hugging Face. Verifique sua conexão com a internet.");
        }
        throw error;
    }
}

/**
 * Limpa o histórico de conversa mantendo o prompt de sistema
 */
export function clearHistory() {
    history.length = 0;
    history.push(SYSTEM_PROMPT);
}