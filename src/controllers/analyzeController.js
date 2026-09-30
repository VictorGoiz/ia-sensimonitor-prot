import { analyzeSensorData } from "../services/analyzeService.js";
import { generateAnalysisPDF } from "../services/pdfService.js";

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

        // Retorno padrão em JSON
        return res.status(200).json({
            device: "LFG60",
            timestamp: new Date().toISOString(),
            data: sensorData,
            analysis,
            pdfEndpoint: "/api/analyze/pdf"
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
        
        // Se já vier a análise no corpo, reutiliza; caso contrário, gera na hora
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
