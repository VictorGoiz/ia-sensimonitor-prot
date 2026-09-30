import { analyzeSensorData, generateAnalysisPDF } from "../services/lfg60Service.js";
import { sendReportEmail } from "../services/emailService.js";
import { schedulerService } from "../services/schedulerService.js";

/**
 * Normaliza os dados do sensor LFG60
 */
function extractData(body) {
    const data = body.data || body;
    return {
        temperatura: data.temperatura !== undefined ? Number(data.temperatura) : undefined,
        umidade: data.umidade !== undefined ? Number(data.umidade) : undefined,
        co2: data.co2 !== undefined ? Number(data.co2) : undefined,
        pm25: data.pm25 !== undefined ? Number(data.pm25) : undefined,
        pm10: data.pm10 !== undefined ? Number(data.pm10) : undefined,
        voc: data.voc !== undefined ? Number(data.voc) : undefined,
        formaldeido: data.formaldeido !== undefined ? Number(data.formaldeido) : undefined
    };
}

/**
 * Endpoint para processar análise do LFG60
 * POST /api/lfg60/analyze
 */
export async function analyzeValuesLfg60(req, res) {
    try {
        const sensorData = extractData(req.body);

        if (!sensorData || Object.values(sensorData).every(v => v === undefined)) {
            return res.status(400).json({
                error: "Dados de leitura do sensor LFG60 são obrigatórios."
            });
        }

        // Atualiza a última telemetria no agendador
        schedulerService.updateLatestSensorData(sensorData);

        const analysis = await analyzeSensorData(sensorData);

        // Se solicitado diretamente em PDF
        if (req.query.format === "pdf" || req.headers.accept?.includes("application/pdf")) {
            const pdfBuffer = await generateAnalysisPDF({
                sensorData,
                analysis,
                deviceName: "LFG60"
            });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", 'attachment; filename="relatorio_lfg60.pdf"');
            return res.send(pdfBuffer);
        }

        return res.status(200).json({
            device: "LFG60",
            timestamp: new Date().toISOString(),
            data: sensorData,
            analysis,
            pdfEndpoint: "/api/lfg60/pdf",
            emailEndpoint: "/api/lfg60/email/send"
        });

    } catch (error) {
        console.error("Erro no lfg60Controller:", error);
        return res.status(500).json({
            error: error.message || "Erro ao processar análise do sensor LFG60."
        });
    }
}

/**
 * Endpoint para geração direta de PDF
 * POST /api/lfg60/pdf
 */
export async function generatePdf(req, res) {
    try {
        const sensorData = extractData(req.body);
        const analysis = req.body.analysis || await analyzeSensorData(sensorData);

        const pdfBuffer = await generateAnalysisPDF({
            sensorData,
            analysis,
            deviceName: "LFG60"
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="relatorio_lfg60.pdf"');
        return res.send(pdfBuffer);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        return res.status(500).json({
            error: error.message || "Erro ao gerar arquivo PDF."
        });
    }
}

/**
 * Endpoint para envio imediato de relatório por e-mail com anexo em PDF
 * POST /api/lfg60/email/send
 */
export async function sendEmailReport(req, res) {
    try {
        const { to, subject } = req.body;
        const sensorData = extractData(req.body);
        const analysis = req.body.analysis || await analyzeSensorData(sensorData);

        const pdfBuffer = await generateAnalysisPDF({
            sensorData,
            analysis,
            deviceName: "LFG60"
        });

        const result = await sendReportEmail({
            to,
            sensorData,
            pdfBuffer,
            deviceName: "LFG60",
            subject
        });

        return res.status(200).json({
            success: true,
            message: `Relatório ambiental enviado com sucesso para ${result.recipient}`,
            details: result
        });
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Erro ao enviar relatório por e-mail."
        });
    }
}

/**
 * Endpoint para consultar status do agendamento
 * GET /api/lfg60/schedule
 */
export function getScheduleStatus(req, res) {
    try {
        const status = schedulerService.getStatus();
        return res.status(200).json(status);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Endpoint para configurar horário e destinatário do agendamento
 * POST /api/lfg60/schedule
 */
export function updateScheduleConfig(req, res) {
    try {
        const { time, recipient, active, cronExp } = req.body;
        const updated = schedulerService.configure({ time, recipient, active, cronExp });
        return res.status(200).json({
            success: true,
            message: "Configurações de agendamento atualizadas com sucesso.",
            schedule: updated
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Endpoint para acionar o disparo do relatório agendado manualmente
 * POST /api/lfg60/schedule/trigger
 */
export async function triggerScheduleNow(req, res) {
    try {
        const sensorData = Object.values(extractData(req.body)).some(v => v !== undefined) ? extractData(req.body) : null;
        const recipient = req.body.to || req.body.recipient || null;

        const result = await schedulerService.executeReportJob(sensorData, recipient);
        return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

// Exporta alias para compatibilidade com outros nomes
export const analyzeValuesLFG60 = analyzeValuesLfg60;

