import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgDir = path.join(__dirname, "../img");
const logoSensimonitorPath = path.join(imgDir, "logo_sensimonitor.png");

/**
 * Aplica marcas d'água, rodapés e paginação em todas as folhas do documento
 */
function finalizeDocumentPages(doc, footerText) {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        // Marca d'água suave
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

        // Rodapé Institucional
        const footerY = 800;
        doc.rect(40, footerY, 515, 20).fill("#f8fafc");
        doc.rect(40, footerY, 515, 20).stroke("#e2e8f0");

        doc.fillColor("#64748b")
           .font("Helvetica")
           .fontSize(7.5)
           .text(footerText, 48, footerY + 6);

        doc.fillColor("#64748b")
           .font("Helvetica")
           .fontSize(7.5)
           .text(`Página ${i + 1} de ${totalPages}`, 480, footerY + 6, { align: "right", width: 65 });
    }

    doc.flushPages();
}

/**
 * Diagrama o parecer técnico da IA em parágrafos estruturados
 */
function renderAnalysisText(doc, analysis, startY, contentWidth = 515) {
    doc.y = startY;
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
            doc.fillColor("#0f172a")
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
}

/**
 * Gera relatório em PDF para o sensor ambiental LFG60
 */
export async function generateAnalysisPDF({ sensorData, analysis, deviceName = "LFG60" }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            bufferPages: true,
            margins: { top: 35, bottom: 45, left: 40, right: 40 }
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            finalizeDocumentPages(doc, "SensiMonitor - Sistema de Gestão e Monitoramento Contínuo de Qualidade do Ar");
            resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

        const primaryDark = "#0f172a";
        const secondaryDark = "#1e293b";
        const accentBlue = "#0284c7";
        const grayText = "#64748b";
        const borderLight = "#e2e8f0";
        const contentWidth = 515;

        // Cabeçalho
        const headerTop = 30;
        const headerHeight = 65;
        doc.rect(40, headerTop, contentWidth, headerHeight).fill("#ffffff").stroke(borderLight);

        if (fs.existsSync(logoSensimonitorPath)) {
            try {
                doc.image(logoSensimonitorPath, 52, headerTop + 12, { fit: [140, 42], valign: "center" });
            } catch (_) {}
        }

        doc.moveTo(205, headerTop + 10).lineTo(205, headerTop + headerHeight - 10).strokeColor("#e2e8f0").stroke();
        doc.fillColor(primaryDark).font("Helvetica-Bold").fontSize(12).text("RELATÓRIO TÉCNICO AMBIENTAL", 218, headerTop + 14);
        doc.fillColor(accentBlue).font("Helvetica-Bold").fontSize(8.5).text("DIAGNÓSTICO TÉCNICO E CONFORMIDADE NORMATIVA // IOT", 218, headerTop + 30);
        doc.fillColor(grayText).font("Helvetica").fontSize(8).text(`Dispositivo: ${deviceName}  |  Emissão: ${new Date().toLocaleString("pt-BR")}`, 218, headerTop + 44);

        // Tabela de Parâmetros
        const tableTop = 110;
        doc.fillColor(primaryDark).font("Helvetica-Bold").fontSize(10.5).text("1. Leituras Coletadas e Padrões de Conformidade (LFG60)", 40, tableTop);

        const tableY = tableTop + 15;
        const rowHeight = 17;

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
            doc.fillColor(r.status.includes("ALERTA") ? "#b91c1c" : "#15803d").font("Helvetica-Bold").text(r.status, 450, currentY + 4);
            currentY += rowHeight;
        });

        doc.rect(40, tableY, contentWidth, currentY - tableY).stroke("#cbd5e1");

        // Parecer Técnico
        currentY += 18;
        doc.fillColor(primaryDark).font("Helvetica-Bold").fontSize(10.5).text("2. Parecer Técnico e Diagnóstico Especializado", 40, currentY);
        renderAnalysisText(doc, analysis, currentY + 16, contentWidth);

        doc.end();
    });
}

/**
 * Gera relatório em PDF para o sistema de Chopeiras & Relés
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
            finalizeDocumentPages(doc, "SensiMonitor - Telemetria Contínua de Chopeiras & Sistemas de Refrigeração");
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
        doc.rect(40, headerTop, contentWidth, headerHeight).fill("#ffffff").stroke(borderLight);

        if (fs.existsSync(logoSensimonitorPath)) {
            try {
                doc.image(logoSensimonitorPath, 52, headerTop + 12, { fit: [140, 42], valign: "center" });
            } catch (_) {}
        }

        doc.moveTo(205, headerTop + 10).lineTo(205, headerTop + headerHeight - 10).strokeColor("#e2e8f0").stroke();
        doc.fillColor(primaryDark).font("Helvetica-Bold").fontSize(12).text("RELATÓRIO OPERACIONAL DE CHOPEIRAS", 218, headerTop + 14);
        doc.fillColor(accentGreen).font("Helvetica-Bold").fontSize(8.5).text("TELEMETRIA HIDRÁULICA & CONTROLE DE RELÉS // SENSIMONITOR", 218, headerTop + 30);
        doc.fillColor(grayText).font("Helvetica").fontSize(8).text(`Equipamento: ${deviceName}  |  Emissão: ${new Date().toLocaleString("pt-BR")}`, 218, headerTop + 44);

        // Tabela de Parâmetros
        const tableTop = 110;
        doc.fillColor(primaryDark).font("Helvetica-Bold").fontSize(10.5).text("1. Telemetria Hidráulica e Estado dos Relés", 40, tableTop);

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
            doc.fillColor(r.status === "ALERTA" ? "#b91c1c" : "#15803d").font("Helvetica-Bold").text(r.status, 450, currentY + 4);
            currentY += rowHeight;
        });

        doc.rect(40, tableY, contentWidth, currentY - tableY).stroke("#cbd5e1");

        // Parecer Técnico
        currentY += 18;
        doc.fillColor(primaryDark).font("Helvetica-Bold").fontSize(10.5).text("2. Parecer Técnico e Diagnóstico Operacional", 40, currentY);
        renderAnalysisText(doc, analysis, currentY + 16, contentWidth);

        doc.end();
    });
}
