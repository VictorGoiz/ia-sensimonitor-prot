import express from "express";
import * as controller from "../controllers/lfg60Controller.js";

const router = express.Router();

// Rota POST /api/lfg60/analyze (Gera análise IA textual, PDF ou Excel via query)
router.post("/analyze", controller.analyzeValuesLfg60);

// Rota POST /api/lfg60/pdf (Gera e baixa diretamente o arquivo PDF)
router.post("/pdf", controller.generatePdf);

// Rota POST /api/lfg60/excel (Gera e baixa diretamente a planilha de registros em .xlsx)
router.post("/excel", controller.generateExcel);

// Rota POST /api/lfg60/email/send (Envia o relatório com PDF e Excel anexados por e-mail sob demanda)
router.post("/email/send", controller.sendEmailReport);

// Rota GET /api/lfg60/schedule (Consulta configuração e histórico do agendamento)
router.get("/schedule", controller.getScheduleStatus);

// Rota POST /api/lfg60/schedule (Atualiza horário, destinatário ou status de ativação)
router.post("/schedule", controller.updateScheduleConfig);

// Rota POST /api/lfg60/schedule/trigger (Dispara a rotina agendada imediatamente)
router.post("/schedule/trigger", controller.triggerScheduleNow);

export default router;
