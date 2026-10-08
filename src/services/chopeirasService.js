import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { HfInference } from "@huggingface/inference";
import ollama from "ollama";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgDir = path.join(__dirname, "../img");
const logoSensimonitorPath = path.join(imgDir, "logo_sensimonitor.png");

const HF_TOKEN = process.env.HF_TOKEN || "";
const HF_MODEL = process.env.HF_MODEL || "meta-llama/Llama-3.2-3B-Instruct";
const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;

/**
 * Prompt de sistema calibrado para Engenharia de Refrigeração e Telemetria de Chopeiras
 */
const CHOPEIRAS_SYSTEM_PROMPT = `Você é um Engenheiro Mecânico Especialista em Refrigeração Industrial, Sistemas Hidráulicos e Telemetria de Chopeiras e Dispensadores de Chopp da SensiMonitor.

Sua tarefa é analisar os dados de telemetria da chopeira/linha de chopp e emitir um laudo pericial técnico estruturado.

Parâmetros de Referência da Chopeira:
- Pressão de Trabalho Ideal da Linha de Chopp: 20.0 a 30.0 psi (1.4 a 2.1 bar).
- Faixa de Alerta Baixa Pressão: < 18.0 psi (risco de perda de carbonatação, chopp sem espuma ou linha vazia).
- Faixa de Alerta Alta Pressão: > 38.0 psi (risco de espumamento excessivo, sobrecarga na serpentina e conexões).
- Ciclagem de Relés:
  - Relé 1 (Geralmente Compressor de Refrigeração ou Bomba Principal de Pressão): monitorar setpoints de corte (OFF) e partida (ON), e número de partidas acumuladas.
  - Relé 2 (Bomba Secundária / Válvula de Extração): monitorar setpoints e ciclo de acionamento.

Estruture sua resposta EXATAMENTE com as seguintes 4 seções:
1. Sumário Executivo & Classificação Operacional (Conforme/Ideal, Alerta Técnico ou Crítico)
2. Avaliação Técnica de Pressão e Setpoints dos Relés (Comparações com as faixas de trabalho)
3. Análise de Ciclagem, Rendimento Térmico e Risco Mecânico (Avaliação de partidas e estabilidade)
4. Recomendações de Engenharia e Manutenção Preventiva (Ações práticas imediatas e preventivas)

Responda em português brasileiro de forma técnica, direta, objetiva e profissional.`;

/**
 * Análise heurística de contingência para chopeiras (Fallback)
 */
function generateHeuristicChopeirasAnalysis(data) {
    const pressao = Number(data.pressao ?? data.sensor1 ?? 24.5);
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
O diagnóstico telemétrico do sistema de chopeira classifica o equipamento como ${status}. A pressão hidráulica instantânea registrada é de ${pressao.toFixed(2)} psi, com controle automático ativo através dos relés de pressurização e termorregulação.

2. Avaliação Técnica de Pressão e Setpoints dos Relés
- Pressão da Linha (Sensor 1): ${pressao.toFixed(2)} psi ${pressao >= 18 && pressao <= 32 ? "(Dentro da faixa ideal de extração e carbonatação: 18 a 32 psi)" : "(Fora dos limites recomendados de operação nominal)"}.
- Relé 1 (Compressor / Bomba Principal): Setpoint ON em ${r1On} psi / Setpoint OFF em ${r1Off} psi. Total de ${r1Ac} acionamentos acumulados.
- Relé 2 (Bomba Auxiliar / Válvula): Setpoint ON em ${r2On} psi / Setpoint OFF em ${r2Off} psi. Total de ${r2Ac} acionamentos acumulados.

3. Análise de Ciclagem, Rendimento Térmico e Risco Mecânico
O diferencial de pressão (histerese) configurado entre a partida e o corte dos relés garante estabilidade à serpentina de chopp, evitando golpes de aríete e cavitação na sucção. O número de partidas registradas indica operação contínua sem indícios de ciclagem excessiva por microvazamentos.

4. Recomendações de Engenharia e Manutenção Preventiva
- Inspeção Periódica: Verificar vedações das conexões Engate Rápido / Espigões e o manômetro analógico padrão de checagem.
- Controle Térmico: Manter a temperatura do banco de gelo/glicol entre -1.0°C e 2.0°C para assegurar temperatura na torneira entre 0°C e 2°C.
- Limpeza e Sanitização (CIP): Realizar procedimento de sanitização química das linhas com solução peracética/alcalina no intervalo regulamentar.`;
}

/**
 * Processa a análise de telemetria de chopeiras via IA
 * @param {object} data
 * @returns {Promise<string>}
 */
export async function analyzeChopeirasData(data) {
    const pressao = Number(data.pressao ?? data.sensor1 ?? 24.5);
    const r1On = data.rele1_on ?? 12.5;
    const r1Off = data.rele1_off ?? 11.5;
    const r1Ac = data.rele1_acionamentos ?? 45;
    const r2On = data.rele2_on ?? 10.2;
    const r2Off = data.rele2_off ?? 13.8;
    const r2Ac = data.rele2_acionamentos ?? 30;

    const userPrompt = `Telemetria Atual da Chopeira / Sistema de Relés:
- Pressão Hidráulica da Linha (Sensor 1): ${pressao.toFixed(2)} psi
- Relé 1: Setpoint Partida (ON): ${r1On} psi | Setpoint Corte (OFF): ${r1Off} psi | Acionamentos: ${r1Ac}
- Relé 2: Setpoint Partida (ON): ${r2On} psi | Setpoint Corte (OFF): ${r2Off} psi | Acionamentos: ${r2Ac}
- Timestamp: ${new Date().toISOString()}

Por favor, emita o parecer pericial completo seguindo a estrutura padrão das 4 seções.`;

    // 1. Hugging Face
    if (hf && HF_TOKEN) {
        try {
            const response = await hf.chatCompletion({
                model: HF_MODEL,
                messages: [
                    { role: "system", content: CHOPEIRAS_SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 1200,
                temperature: 0.3
            });

            if (response?.choices?.[0]?.message?.content) {
                return response.choices[0].message.content.trim();
            }
        } catch (err) {
            console.warn("[Chopeiras AI] Falha ao consultar Hugging Face, tentando contingência:", err.message);
        }
    }

    // 2. Ollama Local
    try {
        const ollamaRes = await ollama.chat({
            model: "llama3.2",
            messages: [
                { role: "system", content: CHOPEIRAS_SYSTEM_PROMPT },
                { role: "user", content: userPrompt }
            ]
        });

        if (ollamaRes?.message?.content) {
            return ollamaRes.message.content.trim();
        }
    } catch (_) {}

    // 3. Fallback Heurístico
    return generateHeuristicChopeirasAnalysis(data);
}

/**
 * Gera o relatório visual em PDF corporativo para Chopeiras & Relés
 * @param {object} params
 * @param {object} params.data - Dados de telemetria da chopeira
 * @param {string} params.analysis - Texto do parecer técnico
 * @param {string} [params.deviceName] - Nome da chopeira
 * @returns {Promise<Buffer>}
 */
export async function generateChopeirasPDF({ data, analysis, deviceName = "Chopeira Principal" }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            bufferPages: true,
            margins: { top: 35, bottom: 45, left: 40, right: 40 }
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const range = doc.bufferedPageRange();
            const totalPages = range.count;

            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);

                if (fs.existsSync(logoSensimonitorPath)) {
                    doc.save();
                    doc.opacity(0.04);
                    doc.image(logoSensimonitorPath, 127, 330, {
                        fit: [340, 160],
                        align: "center",
                        valign: "center"
                    });
                    doc.restore();
                }

                const footerY = 800;
                doc.rect(40, footerY, 515, 20).fill("#f8fafc");
                doc.rect(40, footerY, 515, 20).stroke("#e2e8f0");

                doc.fillColor("#64748b")
                   .font("Helvetica")
                   .fontSize(7.5)
                   .text("SensiMonitor - Telemetria Contínua de Chopeiras & Sistemas de Refrigeração", 48, footerY + 6);

                doc.fillColor("#64748b")
                   .font("Helvetica")
                   .fontSize(7.5)
                   .text(`Página ${i + 1} de ${totalPages}`, 480, footerY + 6, { align: "right", width: 65 });
            }

            doc.flushPages();
            resolve(Buffer.concat(buffers));
        });

        doc.on("error", reject);

        const primaryDark = "#0f172a";
        const secondaryDark = "#1e293b";
        const accentGreen = "#10b981";
        const grayText = "#64748b";
        const borderLight = "#e2e8f0";
        const contentWidth = 515;

        // Cabeçalho
        const headerTop = 30;
        const headerHeight = 65;

        doc.rect(40, headerTop, contentWidth, headerHeight).fill("#ffffff");
        doc.rect(40, headerTop, contentWidth, headerHeight).stroke(borderLight);

        if (fs.existsSync(logoSensimonitorPath)) {
            try {
                doc.image(logoSensimonitorPath, 52, headerTop + 12, {
                    fit: [140, 42],
                    valign: "center"
                });
            } catch (_) {}
        }

        doc.moveTo(205, headerTop + 10)
           .lineTo(205, headerTop + headerHeight - 10)
           .strokeColor("#e2e8f0")
           .stroke();

        doc.fillColor(primaryDark)
           .font("Helvetica-Bold")
           .fontSize(12)
           .text("RELATÓRIO OPERACIONAL DE CHOPEIRAS", 218, headerTop + 14);

        doc.fillColor(accentGreen)
           .font("Helvetica-Bold")
           .fontSize(8.5)
           .text("TELEMETRIA HIDRÁULICA & CONTROLE DE RELÉS // SENSIMONITOR", 218, headerTop + 30);

        doc.fillColor(grayText)
           .font("Helvetica")
           .fontSize(8)
           .text(`Equipamento: ${deviceName}  |  Emissão: ${new Date().toLocaleString("pt-BR")}`, 218, headerTop + 44);

        // Tabela de Parâmetros
        const tableTop = 110;
        doc.fillColor(primaryDark)
           .font("Helvetica-Bold")
           .fontSize(10.5)
           .text("1. Telemetria Hidráulica e Estado dos Relés", 40, tableTop);

        const tableY = tableTop + 15;
        const rowHeight = 18;

        doc.rect(40, tableY, contentWidth, rowHeight).fill(secondaryDark);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
        doc.text("PARÂMETRO", 48, tableY + 5);
        doc.text("VALOR MEDIDO", 170, tableY + 5);
        doc.text("SETPOINTS / FAIXA OPERACIONAL", 285, tableY + 5);
        doc.text("STATUS", 450, tableY + 5);

        const pressaoVal = Number(data.pressao ?? data.sensor1 ?? 24.5).toFixed(2);
        const r1On = data.rele1_on !== undefined && data.rele1_on !== null ? Number(data.rele1_on).toFixed(1) : "--";
        const r1Off = data.rele1_off !== undefined && data.rele1_off !== null ? Number(data.rele1_off).toFixed(1) : "--";
        const r1Ac = data.rele1_acionamentos ?? "--";
        const r2On = data.rele2_on !== undefined && data.rele2_on !== null ? Number(data.rele2_on).toFixed(1) : "--";
        const r2Off = data.rele2_off !== undefined && data.rele2_off !== null ? Number(data.rele2_off).toFixed(1) : "--";
        const r2Ac = data.rele2_acionamentos ?? "--";

        const rows = [
            { param: "Pressão Hidráulica (Sensor 1)", val: `${pressaoVal} psi`, ref: "18.0 a 35.0 psi (Extração Ideal)", status: (Number(pressaoVal) > 38 || Number(pressaoVal) < 15) ? "ALERTA" : "NORMAL" },
            { param: "Relé 1: Setpoint Partida (ON)", val: `${r1On} psi`, ref: "Limite de ativação do compressor", status: "CONFIGURADO" },
            { param: "Relé 1: Setpoint Corte (OFF)", val: `${r1Off} psi`, ref: "Limite de corte do compressor", status: "CONFIGURADO" },
            { param: "Relé 1: Contador de Partidas", val: `${r1Ac} ciclos`, ref: "Total acumulado de acionamentos", status: "OPERACIONAL" },
            { param: "Relé 2: Setpoint Partida (ON)", val: `${r2On} psi`, ref: "Limite de ativação bomba aux.", status: "CONFIGURADO" },
            { param: "Relé 2: Setpoint Corte (OFF)", val: `${r2Off} psi`, ref: "Limite de corte bomba aux.", status: "CONFIGURADO" },
            { param: "Relé 2: Contador de Partidas", val: `${r2Ac} ciclos`, ref: "Total acumulado de acionamentos", status: "OPERACIONAL" }
        ];

        let currentY = tableY + rowHeight;
        rows.forEach((r, idx) => {
            const isEven = idx % 2 === 0;
            doc.rect(40, currentY, contentWidth, rowHeight).fill(isEven ? "#f8fafc" : "#ffffff");

            doc.fillColor(primaryDark).font("Helvetica").fontSize(8);
            doc.text(r.param, 48, currentY + 4);
            doc.font("Helvetica-Bold").text(r.val, 170, currentY + 4);
            doc.font("Helvetica").fillColor(grayText).text(r.ref, 285, currentY + 4);

            if (r.status === "ALERTA") {
                doc.fillColor("#b91c1c").font("Helvetica-Bold").text(r.status, 450, currentY + 4);
            } else {
                doc.fillColor("#15803d").font("Helvetica-Bold").text(r.status, 450, currentY + 4);
            }

            currentY += rowHeight;
        });

        doc.rect(40, tableY, contentWidth, currentY - tableY).stroke("#cbd5e1");

        // Parecer Técnico
        currentY += 18;
        doc.fillColor(primaryDark)
           .font("Helvetica-Bold")
           .fontSize(10.5)
           .text("2. Parecer Técnico e Diagnóstico Operacional", 40, currentY);

        doc.y = currentY + 16;
        doc.x = 40;

        const cleanAnalysis = (analysis || "").trim();
        const paragraphs = cleanAnalysis.split(/\n+/);

        paragraphs.forEach(para => {
            const cleanPara = para.trim();
            if (!cleanPara) return;

            const isHeader = /^(###|##|#|\d+\.)\s*(.*)/.test(cleanPara) || (cleanPara.startsWith("**") && cleanPara.endsWith("**"));
            
            if (isHeader) {
                doc.moveDown(0.4);
                const headerText = cleanPara.replace(/^[#\d\.\s*]+/, "").replace(/\*\*/g, "").trim();
                doc.fillColor(primaryDark)
                   .font("Helvetica-Bold")
                   .fontSize(9.5)
                   .text(headerText, { width: contentWidth });
                doc.moveDown(0.2);
            } else {
                const bodyText = cleanPara.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`/g, "");
                doc.fillColor("#1e293b")
                   .font("Helvetica")
                   .fontSize(8.5)
                   .text(bodyText, {
                       width: contentWidth,
                       align: "justify",
                       lineGap: 2.5
                   });
                doc.moveDown(0.3);
            }
        });

        doc.end();
    });
}
