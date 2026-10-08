import { analyzeChopeirasData, generateChopeirasPDF } from "../services/chopeirasService.js";
import { generateChopeirasExcel } from "../services/excelService.js";
import { sendChopeirasEmail } from "../services/emailService.js";
import { chopeirasSchedulerService } from "../services/chopeirasSchedulerService.js";

/**
 * Normaliza os dados da chopeira recebidos no corpo da requisição
 */
function extractData(body) {
    const data = body.data || body;
    const records = Array.isArray(body.records) ? body.records : (Array.isArray(data.records) ? data.records : []);
    const deviceName = body.deviceName || body.numeroSerie || data.deviceName || data.numero_serie || "Chopeira Principal";
    const empresaNome = body.empresaNome || data.empresaNome || "SensiMonitor HQ";

    const pressao = data.pressao !== undefined ? Number(data.pressao) : (data.sensor1 !== undefined ? Number(data.sensor1) : undefined);
    const rele1_on = data.rele1_on !== undefined ? Number(data.rele1_on) : undefined;
    const rele1_off = data.rele1_off !== undefined ? Number(data.rele1_off) : undefined;
    const rele1_acionamentos = data.rele1_acionamentos !== undefined ? Number(data.rele1_acionamentos) : undefined;
    const rele2_on = data.rele2_on !== undefined ? Number(data.rele2_on) : undefined;
    const rele2_off = data.rele2_off !== undefined ? Number(data.rele2_off) : undefined;
    const rele2_acionamentos = data.rele2_acionamentos !== undefined ? Number(data.rele2_acionamentos) : undefined;

    return {
        data: {
            pressao,
            sensor1: pressao,
            rele1_on,
            rele1_off,
            rele1_acionamentos,
            rele2_on,
            rele2_off,
            rele2_acionamentos,
            deviceName,
            empresaNome,
            timestamp: data.timestamp || new Date()
        },
        records,
        deviceName,
        empresaNome
    };
}

/**
 * Endpoint para processar análise técnica de Chopeiras
 * POST /api/chopeiras/analyze
 */
export async function analyzeValuesChopeiras(req, res) {
    try {
        const { data, records, deviceName, empresaNome } = extractData(req.body);

        // Atualiza a última telemetria no agendador de chopeiras
        chopeirasSchedulerService.updateLatestData(data, records);

        const analysis = await analyzeChopeirasData(data);

        // Se solicitado diretamente em PDF
        if (req.query.format === "pdf" || req.headers.accept?.includes("application/pdf")) {
            const pdfBuffer = await generateChopeirasPDF({
                data,
                analysis,
                deviceName
            });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="relatorio_chopeira_${Date.now()}.pdf"`);
            return res.send(pdfBuffer);
        }

        // Se solicitado diretamente em Excel (.xlsx)
        if (req.query.format === "excel" || req.query.format === "xlsx" || req.headers.accept?.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
            const excelBuffer = await generateChopeirasExcel({
                records,
                currentData: data,
                deviceName,
                empresaNome
            });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="registros_chopeira_${Date.now()}.xlsx"`);
            return res.send(excelBuffer);
        }

        return res.status(200).json({
            device: deviceName,
            timestamp: new Date().toISOString(),
            data,
            recordsCount: records.length,
            analysis,
            endpoints: {
                pdf: "/api/chopeiras/pdf",
                excel: "/api/chopeiras/excel",
                email: "/api/chopeiras/email/send"
            }
        });

    } catch (error) {
        console.error("Erro no analyzeValuesChopeiras:", error);
        return res.status(500).json({
            error: error.message || "Erro ao processar análise da chopeira."
        });
    }
}

/**
 * Endpoint para geração direta de PDF de chopeiras
 * POST /api/chopeiras/pdf
 */
export async function generatePdf(req, res) {
    try {
        const { data, deviceName } = extractData(req.body);
        const analysis = req.body.analysis || await analyzeChopeirasData(data);

        const pdfBuffer = await generateChopeirasPDF({
            data,
            analysis,
            deviceName
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="relatorio_chopeira_${Date.now()}.pdf"`);
        return res.send(pdfBuffer);

    } catch (error) {
        console.error("Erro ao gerar PDF de chopeiras:", error);
        return res.status(500).json({
            error: error.message || "Erro ao gerar arquivo PDF."
        });
    }
}

/**
 * Endpoint para geração e download de Planilha Excel (.xlsx) de chopeiras
 * POST /api/chopeiras/excel
 */
export async function generateExcel(req, res) {
    try {
        const { data, records, deviceName, empresaNome } = extractData(req.body);

        const excelBuffer = await generateChopeirasExcel({
            records,
            currentData: data,
            deviceName,
            empresaNome
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="registros_chopeira_${Date.now()}.xlsx"`);
        return res.send(excelBuffer);

    } catch (error) {
        console.error("Erro ao gerar Excel de chopeiras:", error);
        return res.status(500).json({
            error: error.message || "Erro ao gerar planilha Excel."
        });
    }
}

/**
 * Endpoint para envio imediato de relatório por e-mail com PDF + Excel anexados
 * POST /api/chopeiras/email/send
 */
export async function sendEmailReport(req, res) {
    try {
        const { to, subject } = req.body;
        const { data, records, deviceName, empresaNome } = extractData(req.body);
        const analysis = req.body.analysis || await analyzeChopeirasData(data);

        // 1. Gera o PDF do laudo
        const pdfBuffer = await generateChopeirasPDF({
            data,
            analysis,
            deviceName
        });

        // 2. Gera a Planilha Excel (.xlsx) das leituras diárias
        const excelBuffer = await generateChopeirasExcel({
            records,
            currentData: data,
            deviceName,
            empresaNome
        });

        // 3. Envia o e-mail corporativo com ambos os anexos
        const result = await sendChopeirasEmail({
            to,
            data,
            pdfBuffer,
            excelBuffer,
            deviceName,
            subject
        });

        return res.status(200).json({
            success: true,
            message: `Relatório de Chopeiras enviado com sucesso para ${result.recipient} contendo 2 anexos (PDF + Excel).`,
            details: result
        });
    } catch (error) {
        console.error("Erro ao enviar e-mail de chopeiras:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Erro ao enviar relatório por e-mail."
        });
    }
}

/**
 * Endpoint para consultar status do agendamento de chopeiras
 * GET /api/chopeiras/schedule
 */
export function getScheduleStatus(req, res) {
    try {
        const status = chopeirasSchedulerService.getStatus();
        return res.status(200).json(status);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Endpoint para configurar horário e destinatário do agendamento de chopeiras
 * POST /api/chopeiras/schedule
 */
export function updateScheduleConfig(req, res) {
    try {
        const { time, recipient, active, cronExp } = req.body;
        const updated = chopeirasSchedulerService.configure({ time, recipient, active, cronExp });
        return res.status(200).json({
            success: true,
            message: "Configurações de agendamento de chopeiras atualizadas com sucesso.",
            schedule: updated
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Endpoint para acionar o disparo do relatório agendado de chopeiras manualmente
 * POST /api/chopeiras/schedule/trigger
 */
export async function triggerScheduleNow(req, res) {
    try {
        const { data, records } = extractData(req.body);
        const recipient = req.body.to || req.body.recipient || null;

        const result = await chopeirasSchedulerService.executeReportJob(data, recipient, records);
        return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
