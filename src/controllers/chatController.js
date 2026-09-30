// =========================================================================
// ESCOLHA DO PROVEDOR:
// =========================================================================

// OPÇÃO 1: Usar OLLAMA local (Padrão)
import { sendMessage, clearHistory, sendMessageHuggingFace } from "../services/chatService.js";

// OPÇÃO 2: Usar HUGGING FACE na nuvem (basta descomentar a linha abaixo e comentar a Opção 1)
// import { sendMessageHuggingFace as sendMessage, clearHistory } from "../services/chatService.js";

export async function chat(req, res) {
    try {
        const { message } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                error: "A mensagem é obrigatória."
            });
        }

        // Executa a função do provedor selecionado
        const response = await sendMessageHuggingFace(message);

        return res.status(200).json({
            message: response
        });

    } catch (error) {
        console.error("Erro no chat:", error.message || error);

        return res.status(500).json({
            error: error.message || "Erro ao processar mensagem."
        });
    }
}

export function clear(req, res) {
    clearHistory();
    return res.status(200).json({
        message: "Histórico limpo com sucesso."
    });
}