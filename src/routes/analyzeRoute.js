import express from "express";
import * as controller from "../controllers/analyzeController.js";

const router = express.Router();

// Rota para análise dos dados do sensor LFG60 (JSON, PDF via ?format=pdf ou Excel via ?format=excel)
router.post("/analyze", controller.analyze);

// Rota direta para download do relatório em PDF
router.post("/analyze/pdf", controller.generatePdf);

// Rota direta para download de planilha estática ou dinâmica em Excel (.xlsx)
router.get("/analyze/excel", controller.generateExcel);
router.post("/analyze/excel", controller.generateExcel);

// Rota para envio imediato de planilha estática + PDF de teste para um e-mail
router.post("/analyze/test-excel-email", controller.sendStaticTestEmail);

export default router;
