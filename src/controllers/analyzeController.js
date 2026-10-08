import { analyzeSensorData } from "../services/analyzeService.js";
import { generateAnalysisPDF } from "../services/pdfService.js";
import { generateLfg60Excel, generateChopeirasExcel } from "../services/excelService.js";
import { sendReportEmail } from "../services/emailService.js";

/**
 * Normaliza os dados recebidos do sensor LFG60
 */
function extractLFG60Data(body) {
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
 * Registros estáticos de exemplo para testes de planilha
 */
const STATIC_TEST_RECORDS = [
    { id: 1, temperatura: 22.5, umidade: 48.0, co2: 420, pm25: 8.5, pm10: 16.0, voc: 0.10, formaldeido: 0.01, timestamp_leitura: new Date(Date.now() - 14400000) },
    { id: 2, temperatura: 23.1, umidade: 50.0, co2: 460, pm25: 9.2, pm10: 18.0, voc: 0.12, formaldeido: 0.02, timestamp_leitura: new Date(Date.now() - 10800000) },
    { id: 3, temperatura: 24.0, umidade: 53.0, co2: 510, pm25: 10.5, pm10: 19.5, voc: 0.14, formaldeido: 0.02, timestamp_leitura: new Date(Date.now() - 7200000) },
    { id: 4, temperatura: 24.8, umidade: 55.0, co2: 580, pm25: 12.0, pm10: 22.0, voc: 0.16, formaldeido: 0.03, timestamp_leitura: new Date(Date.now() - 3600000) },
    { id: 5, temperatura: 24.5, umidade: 54.0, co2: 450, pm25: 10.2, pm10: 18.0, voc: 0.15, formaldeido: 0.02, timestamp_leitura: new Date() }
];

/**
 * Endpoint para processar análise e retornar JSON ou PDF
 * POST /api/analyze (ou POST /api/analyze?format=pdf)
 */
export async function analyze(req, res) {
    try {
        const sensorData = extractLFG60Data(req.body);
        const analysis = await analyzeSensorData(sensorData);

        // Se o cliente pediu PDF diretamente via query param (?format=pdf) ou header
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

        // Se o cliente pediu Excel diretamente via query param (?format=excel)
        if (req.query.format === "excel" || req.query.format === "xlsx" || req.headers.accept?.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
            const excelBuffer = await generateLfg60Excel({
                records: STATIC_TEST_RECORDS,
                currentData: sensorData,
                deviceName: "LFG60"
            });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", 'attachment; filename="registros_lfg60.xlsx"');
            return res.send(excelBuffer);
        }

        // Retorno padrão em JSON
        return res.status(200).json({
            device: "LFG60",
            timestamp: new Date().toISOString(),
            data: sensorData,
            analysis,
            endpoints: {
                pdf: "/api/analyze/pdf",
                excel: "/api/analyze/excel",
                email: "/api/lfg60/email/send",
                staticTestEmail: "/api/analyze/test-excel-email"
            }
        });

    } catch (error) {
        console.error("Erro no analyzeController:", error);
        return res.status(500).json({
            error: error.message || "Erro ao processar análise do sensor LFG60."
        });
    }
}

/**
 * Endpoint específico para download do relatório em PDF
 * POST /api/analyze/pdf
 */
export async function generatePdf(req, res) {
    try {
        const sensorData = extractLFG60Data(req.body);
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
 * Endpoint para download de planilha Excel (.xlsx)
 * GET / POST /api/analyze/excel
 */
export async function generateExcel(req, res) {
    try {
        const sensorData = extractLFG60Data(req.body || {});
        const isChopeiras = req.query.type === "chopeiras" || req.body?.type === "chopeiras";

        let excelBuffer;
        let filename;

        if (isChopeiras) {
            excelBuffer = await generateChopeirasExcel({
                deviceName: req.body?.deviceName || "Chopeira Estática de Teste",
                currentData: req.body?.data || { pressao: 24.5, rele1_on: 12.5, rele1_off: 11.5, rele1_acionamentos: 45, rele2_on: 10.2, rele2_off: 13.8, rele2_acionamentos: 30 }
            });
            filename = `planilha_estatica_chopeiras_${Date.now()}.xlsx`;
        } else {
            excelBuffer = await generateLfg60Excel({
                records: STATIC_TEST_RECORDS,
                currentData: sensorData,
                deviceName: "LFG60-ESTATICO"
            });
            filename = `planilha_estatica_lfg60_${Date.now()}.xlsx`;
        }

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(excelBuffer);

    } catch (error) {
        console.error("Erro ao gerar Excel estático:", error);
        return res.status(500).json({
            error: error.message || "Erro ao gerar planilha Excel."
        });
    }
}

/**
 * Endpoint para envio imediato de planilha estática de teste por e-mail com PDF + Excel
 * POST /api/analyze/test-excel-email
 */
export async function sendStaticTestEmail(req, res) {
    try {
        const recipient = req.body.to || "victorgois122@gmail.com";
        const sensorData = {
            temperatura: 24.5,
            umidade: 54.0,
            co2: 450,
            pm25: 10.2,
            pm10: 18.0,
            voc: 0.15,
            formaldeido: 0.02
        };

        const analysis = "1. Sumário Executivo & Classificação Global\nO ambiente monitorado pelo sensor LFG60 apresenta parâmetros em perfeita conformidade técnica e regulatória.\n\n2. Avaliação Técnica Detalhada dos Parâmetros\n- Conforto Térmico: Temperatura de 24.5°C e Umidade de 54% (Faixa ideal NR-17 / ANVISA).\n- Qualidade do Ar: CO2 em 450 ppm e partículas finas dentro dos limites rigorosos da OMS.\n\n3. Impactos à Saúde e Ergonomia\nCondições ideais de aeração sem riscos de fadiga ou estresse ocupacional.\n\n4. Recomendações de Engenharia\nManter rotina preventiva e registros diários de telemetria.";

        const pdfBuffer = await generateAnalysisPDF({
            sensorData,
            analysis,
            deviceName: "LFG60 (Amostra Estática)"
        });

        const excelBuffer = await generateLfg60Excel({
            records: STATIC_TEST_RECORDS,
            currentData: sensorData,
            deviceName: "LFG60 (Amostra Estática)"
        });

        const result = await sendReportEmail({
            to: recipient,
            sensorData,
            pdfBuffer,
            excelBuffer,
            deviceName: "LFG60-TESTE",
            subject: "[SensiMonitor] Teste de Envio - Planilha Excel (.xlsx) e Laudo PDF"
        });

        return res.status(200).json({
            success: true,
            message: `Planilha estática e laudo PDF enviados com sucesso para ${recipient}`,
            recordsCount: STATIC_TEST_RECORDS.length,
            details: result
        });

    } catch (error) {
        console.error("Erro ao enviar planilha estática por e-mail:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Erro ao enviar e-mail de teste."
        });
    }
}
