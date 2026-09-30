import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgDir = path.join(__dirname, "../img");
const logoSensimonitorPath = path.join(imgDir, "logo_sensimonitor.png");

/**
 * Gera um relatório em PDF corporativo de alta qualidade, sem restrição de tamanho de texto,
 * com suporte a múltiplas páginas, marca d'água e formatação técnica estruturada.
 * @param {object} params
 * @param {object} params.sensorData - Leituras dos sensores do LFG60
 * @param {string} params.analysis - Texto do parecer técnico gerado pela IA
 * @param {string} [params.deviceName] - Nome do dispositivo (Padrão: LFG60)
 * @returns {Promise<Buffer>}
 */
export async function generateAnalysisPDF({ sensorData, analysis, deviceName = "LFG60" }) {
    return new Promise((resolve, reject) => {
        // Habilita bufferPages para podermos aplicar cabeçalhos, rodapés e numeração de páginas em todas as folhas
        const doc = new PDFDocument({
            size: "A4",
            bufferPages: true,
            margins: { top: 35, bottom: 45, left: 40, right: 40 }
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            // Pós-processamento de todas as páginas (Marca d'água, Rodapés e Numeração)
            const range = doc.bufferedPageRange();
            const totalPages = range.count;

            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);

                // 1. Marca d'água suave no centro de cada folha A4 (595.28 x 841.89)
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

                // 2. Rodapé Institucional em cada página
                const footerY = 800;
                doc.rect(40, footerY, 515, 20).fill("#f8fafc");
                doc.rect(40, footerY, 515, 20).stroke("#e2e8f0");

                doc.fillColor("#64748b")
                   .font("Helvetica")
                   .fontSize(7.5)
                   .text("SensiMonitor - Sistema de Gestão e Monitoramento Contínuo de Qualidade do Ar", 48, footerY + 6);

                doc.fillColor("#64748b")
                   .font("Helvetica")
                   .fontSize(7.5)
                   .text(`Página ${i + 1} de ${totalPages}`, 480, footerY + 6, { align: "right", width: 65 });
            }

            // Finaliza e envia o buffer completo
            doc.flushPages();
            resolve(Buffer.concat(buffers));
        });

        doc.on("error", reject);

        const primaryDark = "#0f172a";   // Dark Slate
        const secondaryDark = "#1e293b"; // Charcoal Navy
        const accentBlue = "#0284c7";    // Sensi Blue
        const grayText = "#64748b";
        const borderLight = "#e2e8f0";
        const contentWidth = 515;

        // =====================================================================
        // 1. CABEÇALHO CORPORATIVO
        // =====================================================================
        const headerTop = 30;
        const headerHeight = 65;

        doc.rect(40, headerTop, contentWidth, headerHeight).fill("#ffffff");
        doc.rect(40, headerTop, contentWidth, headerHeight).stroke(borderLight);

        // Logo SensiMonitor
        if (fs.existsSync(logoSensimonitorPath)) {
            try {
                doc.image(logoSensimonitorPath, 52, headerTop + 12, {
                    fit: [140, 42],
                    valign: "center"
                });
            } catch (_) {}
        }

        // Linha divisória vertical
        doc.moveTo(205, headerTop + 10)
           .lineTo(205, headerTop + headerHeight - 10)
           .strokeColor("#e2e8f0")
           .stroke();

        // Títulos e Metadados
        doc.fillColor(primaryDark)
           .font("Helvetica-Bold")
           .fontSize(12)
           .text("RELATÓRIO TÉCNICO AMBIENTAL", 218, headerTop + 14);

        doc.fillColor(accentBlue)
           .font("Helvetica-Bold")
           .fontSize(8.5)
           .text("DIAGNÓSTICO TÉCNICO E CONFORMIDADE NORMATIVA // IOT", 218, headerTop + 30);

        doc.fillColor(grayText)
           .font("Helvetica")
           .fontSize(8)
           .text(`Dispositivo: ${deviceName}  |  Emissão: ${new Date().toLocaleString("pt-BR")}`, 218, headerTop + 44);

        // =====================================================================
        // 2. TABELA DE TELEMETRIA (SENSOR LFG60)
        // =====================================================================
        const tableTop = 110;
        doc.fillColor(primaryDark)
           .font("Helvetica-Bold")
           .fontSize(10.5)
           .text("1. Leituras Coletadas e Padrões de Conformidade (LFG60)", 40, tableTop);

        const tableY = tableTop + 15;
        const rowHeight = 17;

        // Cabeçalho da Tabela
        doc.rect(40, tableY, contentWidth, rowHeight).fill(secondaryDark);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
        doc.text("PARÂMETRO", 48, tableY + 5);
        doc.text("LEITURA ATUAL", 170, tableY + 5);
        doc.text("REFERÊNCIA REGULATÓRIA", 285, tableY + 5);
        doc.text("STATUS", 450, tableY + 5);

        const rows = [
            { param: "Temperatura", val: `${sensorData.temperatura ?? "N/A"} °C`, ref: "20.0 a 26.0 °C (Conforto Térmico)", status: (sensorData.temperatura > 30) ? "ALERTA / ALTA" : "NORMAL" },
            { param: "Umidade Relativa", val: `${sensorData.umidade ?? "N/A"} %`, ref: "40.0 a 60.0 % (Faixa Ideal)", status: "NORMAL" },
            { param: "Dióxido de Carbono (CO2)", val: `${sensorData.co2 ?? "N/A"} ppm`, ref: "< 800 a 1000 ppm (Padrão OMS)", status: (sensorData.co2 > 1000) ? "ALERTA" : "EXCELENTE" },
            { param: "Material Particulado (PM2.5)", val: `${sensorData.pm25 ?? "N/A"} µg/m³`, ref: "< 15.0 µg/m³ (Diretriz OMS)", status: (sensorData.pm25 > 15) ? "MODERADO" : "CONFORME" },
            { param: "Material Particulado (PM10)", val: `${sensorData.pm10 ?? "N/A"} µg/m³`, ref: "< 45.0 µg/m³ (Diretriz OMS)", status: "CONFORME" },
            { param: "Compostos Orgânicos (VOC)", val: `${sensorData.voc ?? "N/A"} ppm`, ref: "< 0.30 ppm (Nível Seguro)", status: "CONFORME" },
            { param: "Formaldeído (HCHO)", val: `${sensorData.formaldeido ?? "N/A"} mg/m³`, ref: "< 0.08 mg/m³ (ANVISA RE 09/2003)", status: "SEGURO" }
        ];

        let currentY = tableY + rowHeight;

        rows.forEach((r, idx) => {
            const isEven = idx % 2 === 0;
            doc.rect(40, currentY, contentWidth, rowHeight).fill(isEven ? "#f8fafc" : "#ffffff");

            doc.fillColor(primaryDark).font("Helvetica").fontSize(8);
            doc.text(r.param, 48, currentY + 4);
            doc.font("Helvetica-Bold").text(r.val, 170, currentY + 4);
            doc.font("Helvetica").fillColor(grayText).text(r.ref, 285, currentY + 4);

            if (r.status.includes("ALERTA")) {
                doc.fillColor("#b91c1c").font("Helvetica-Bold").text(r.status, 450, currentY + 4);
            } else {
                doc.fillColor("#15803d").font("Helvetica-Bold").text(r.status, 450, currentY + 4);
            }

            currentY += rowHeight;
        });

        doc.rect(40, tableY, contentWidth, currentY - tableY).stroke("#cbd5e1");

        // =====================================================================
        // 3. PARECER TÉCNICO & DIAGNÓSTICO DA IA (TEXTO COMPLETO SEM RESTRIÇÕES)
        // =====================================================================
        currentY += 18;
        doc.fillColor(primaryDark)
           .font("Helvetica-Bold")
           .fontSize(10.5)
           .text("2. Parecer Técnico e Diagnóstico Especializado", 40, currentY);

        // Posiciona o cursor para fluxo natural de texto
        doc.y = currentY + 16;
        doc.x = 40;

        // Processa o texto da IA dividindo por seções/parágrafos para diagramação profissional
        const cleanAnalysis = (analysis || "").trim();
        const paragraphs = cleanAnalysis.split(/\n+/);

        paragraphs.forEach(para => {
            const cleanPara = para.trim();
            if (!cleanPara) return;

            // Se for título de seção (ex: 1. Sumário Executivo ou ### Título)
            const isHeader = /^(###|##|#|\d+\.)\s*(.*)/.test(cleanPara) || cleanPara.startsWith("**") && cleanPara.endsWith("**");
            
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
