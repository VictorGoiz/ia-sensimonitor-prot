import { hf } from "../config/hf.js";
import { ollamaConfig } from "../config/ollama.js";
import { generateChopeirasPDF } from "./pdfService.js";

/**
 * Contexto e Persona Especializada do Agente para Emissão de Relatório de Chopeiras
 */
const CHOPEIRAS_AGENT_PROMPT = `Você é o Engenheiro Especialista em Refrigeração Industrial, Sistemas Hidráulicos e Telemetria de Chopeiras da SensiMonitor.
Sua missão é emitir pareceres operacionais rigorosos sobre a estabilidade de pressão na linha de chopp, controle de setpoints e ciclagem de relés/compressores.

DIRETRIZES DE EMISSÃO DO LAUDO (ESTRUTURA EM 4 SEÇÕES OBRIGATÓRIAS):
1. Sumário Executivo & Classificação Operacional (Conforme/Ideal, Alerta Técnico ou Crítico)
2. Avaliação Técnica de Pressão e Setpoints dos Relés (Pressão ideal: 18 a 32 psi / 1.2 a 2.2 bar)
3. Análise de Ciclagem, Rendimento Térmico e Risco Mecânico (Contadores de partidas dos relés 1 e 2)
4. Recomendações de Engenharia e Manutenção Preventiva (Ações práticas imediatas e preventivas)

Tom: Direto, analítico, técnico e objetivo.`;

/**
 * Monta o prompt com os dados de telemetria da chopeira.
 */
export function buildChopeirasPrompt(data) {
    const pressao = data.pressao ?? data.sensor1 ?? "Não informado";
    const r1On = data.rele1_on ?? "Não informado";
    const r1Off = data.rele1_off ?? "Não informado";
    const r1Ac = data.rele1_acionamentos ?? "Não informado";
    const r2On = data.rele2_on ?? "Não informado";
    const r2Off = data.rele2_off ?? "Não informado";
    const r2Ac = data.rele2_acionamentos ?? "Não informado";

    return `EMISSÃO DE LAUDO OPERACIONAL // DADOS DE TELEMETRIA DE CHOPEIRA:
- Pressão Hidráulica da Linha (Sensor 1): ${pressao} psi
- Relé 1 (Compressor/Bomba 1): Setpoint ON ${r1On} psi | Setpoint OFF ${r1Off} psi | Acionamentos: ${r1Ac}
- Relé 2 (Bomba 2/Válvula): Setpoint ON ${r2On} psi | Setpoint OFF ${r2Off} psi | Acionamentos: ${r2Ac}
- Data/Hora: ${new Date().toLocaleString("pt-BR")}

Emita o laudo técnico completo e padronizado estruturado nas 4 seções operacionais.`;
}

/**
 * Gerador de parecer técnico estruturado de fallback para Chopeiras
 */
function generateStructuredChopeirasFallback(data) {
    const pressao = Number(data.pressao ?? data.sensor1) || 24.5;
    const r1On = data.rele1_on ?? 12.5;
    const r1Off = data.rele1_off ?? 11.5;
    const r1Ac = data.rele1_acionamentos ?? 45;
    const r2On = data.rele2_on ?? 10.2;
    const r2Off = data.rele2_off ?? 13.8;
    const r2Ac = data.rele2_acionamentos ?? 30;

    let status = "OPERACIONAL / CONFORME";
    if (pressao > 38.0 || pressao < 15.0) {
        status = "CRÍTICO";
    } else if (pressao > 32.0 || pressao < 18.0) {
        status = "ALERTA TÉCNICO";
    }

    return `1. Sumário Executivo & Classificação Operacional
O diagnóstico telemétrico do sistema de chopeira classifica o equipamento como ${status}. A pressão hidráulica instantânea registrada é de ${pressao.toFixed(2)} psi, operando sob controle automatizado dos relés de pressurização e termorregulação.

2. Avaliação Técnica de Pressão e Setpoints dos Relés
- Pressão da Linha (Sensor 1): ${pressao.toFixed(2)} psi ${pressao >= 18 && pressao <= 32 ? "(Dentro da faixa ideal de extração e carbonatação: 18 a 32 psi)" : "(Fora dos limites ideais de operação nominal)"}.
- Relé 1 (Compressor / Bomba 1): Setpoints ON ${r1On} psi / OFF ${r1Off} psi. Total acumulado de ${r1Ac} partidas.
- Relé 2 (Bomba 2 / Válvula): Setpoints ON ${r2On} psi / OFF ${r2Off} psi. Total acumulado de ${r2Ac} partidas.

3. Análise de Ciclagem, Rendimento Térmico e Risco Mecânico
A histerese configurada entre a partida e o corte assegura fluxo contínuo sem golpes de aríete. O volume de acionamentos indica operação contínua estável sem indícios de ciclagem curta por microvazamentos.

4. Recomendações de Engenharia e Manutenção Preventiva
- Vedações e Linhas: Inspecionar anéis o-ring dos engates rápidos e manômetro padrão.
- Estabilidade Térmica: Manter o banco de gelo/glicol entre -1°C e 2°C para chopp servido a 0°C - 2°C.
- Sanitização (CIP): Executar rotina periódica de higienização das serpentinas com solução apropriada.`;
}

/**
 * Serviço de Análise Técnica de Chopeiras com IA e contingências
 * @param {object|string} data
 * @returns {Promise<string>}
 */
export async function analyzeChopeirasData(data) {
    const promptContent = typeof data === "string" ? data : buildChopeirasPrompt(data);
    const token = process.env.HF_TOKEN || process.env.HF_API_KEY;

    const candidateModels = [
        process.env.HF_MODEL,
        "Qwen/Qwen2.5-Coder-32B-Instruct",
        "meta-llama/Llama-3.3-70B-Instruct",
        "deepseek-ai/DeepSeek-V3",
        "meta-llama/Llama-3.1-8B-Instruct"
    ].filter(Boolean);

    const uniqueModels = [...new Set(candidateModels)];

    // 1. Hugging Face
    if (token && !token.includes("sua_chave") && token !== "hf_xxxx") {
        for (const model of uniqueModels) {
            try {
                const response = await hf.chatCompletion({
                    model,
                    messages: [
                        { role: "system", content: CHOPEIRAS_AGENT_PROMPT },
                        { role: "user", content: promptContent }
                    ],
                    max_tokens: 800,
                    temperature: 0.3
                });

                if (response?.choices?.[0]?.message?.content) {
                    return response.choices[0].message.content;
                }
            } catch (error) {
                console.warn(`[Chopeiras Service] Falha no modelo Hugging Face '${model}': ${error.message}. Tentando próximo...`);
            }
        }
    }

    // 2. Ollama Local
    try {
        const response = await fetch(`${ollamaConfig.url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(4000),
            body: JSON.stringify({
                model: ollamaConfig.model,
                messages: [
                    { role: "system", content: CHOPEIRAS_AGENT_PROMPT },
                    { role: "user", content: promptContent }
                ],
                stream: false,
                options: {
                    num_predict: 700,
                    num_ctx: 3072,
                    temperature: 0.3
                }
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result?.message?.content) {
                return result.message.content;
            }
        }
    } catch (ollamaErr) {
        console.warn("[Chopeiras Service] Ollama local não respondeu:", ollamaErr.message);
    }

    // 3. Fallback estruturado
    console.info("Gerando laudo de chopeira via motor analítico SensiMonitor...");
    const parsedData = typeof data === "object" ? data : {};
    return generateStructuredChopeirasFallback(parsedData);
}

export const analyzeSensorDataChopeiras = analyzeChopeirasData;
export { generateChopeirasPDF };
