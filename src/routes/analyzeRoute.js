import express from "express";
import * as controller from "../controllers/analyzeController.js";

const router = express.Router();

// Rota para análise dos dados do sensor LFG60 (JSON ou PDF via ?format=pdf)
router.post("/analyze", controller.analyze);

// Rota direta para download do relatório em PDF
router.post("/analyze/pdf", controller.generatePdf);

export default router;
