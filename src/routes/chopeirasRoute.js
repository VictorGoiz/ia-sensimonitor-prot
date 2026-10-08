import express from "express";
import * as controller from "../controllers/chopeirasController.js";

const router = express.Router();

// Rota POST /api/chopeiras/analyze (Gera análise IA com suporte a ?format=pdf ou ?format=excel)
router.post("/analyze", controller.analyzeValuesChopeiras);

// Rota POST /api/chopeiras/pdf (Gera e baixa diretamente o laudo técnico em PDF)
router.post("/pdf", controller.generatePdf);

// Rota POST /api/chopeiras/excel (Gera e baixa diretamente a planilha de registros em .xlsx)
router.post("/excel", controller.generateExcel);

// Rota POST /api/chopeiras/email/send (Envia relatório por e-mail com PDF + Excel anexados)
router.post("/email/send", controller.sendEmailReport);

// Rota GET /api/chopeiras/schedule (Consulta configuração e histórico do agendamento)
router.get("/schedule", controller.getScheduleStatus);

// Rota POST /api/chopeiras/schedule (Atualiza horário, destinatário ou status de ativação)
router.post("/schedule", controller.updateScheduleConfig);

// Rota POST /api/chopeiras/schedule/trigger (Dispara a rotina diária de chopeiras imediatamente)
router.post("/schedule/trigger", controller.triggerScheduleNow);

export default router;
