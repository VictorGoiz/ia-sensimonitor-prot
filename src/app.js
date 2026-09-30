import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import chatRoute from "./routes/chatRoute.js";
import lfg60Route from "./routes/lfg60Route.js";
import analyzeRoute from "./routes/analyzeRoute.js";

const app = express();

// 1. Segurança HTTP com Helmet (Preparado para ambiente de produção EC2 / Nuvem)
app.use(helmet({
    contentSecurityPolicy: false,       // Permite compatibilidade com scripts/estilos locais e APIs externas
    crossOriginResourcePolicy: false    // Permite consumo de PDFs e assets por outros domínios
}));

// 2. Log de Requisições HTTP com Morgan
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat));

// 3. CORS e Parser de JSON
app.use(cors());                        // Permite acesso de frontends e serviços externos
app.use(express.json());                // Permite leitura de payloads JSON

// 4. Endpoint de Health Check (Essencial para EC2 / AWS ALB / Monitoramento)
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: "SensiMonitor AI API"
    });
});

// 5. Rotas da API
app.use("/api", chatRoute);
app.use("/api", analyzeRoute);
app.use("/api/lfg60", lfg60Route);

export default app;

