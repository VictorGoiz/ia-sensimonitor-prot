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

// 3. Configuração Restrita de CORS (Cross-Origin Resource Sharing)
const defaultAllowedOrigins = [
    "https://www.sensimonitor.com.br",
    "https://sensimonitor.com.br",
    "http://www.sensimonitor.com.br",
    "http://sensimonitor.com.br"
];

const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

const corsOptions = {
    origin: (origin, callback) => {
        // Permite requisições sem origin (como chamadas backend-to-backend, cURL, mobile apps)
        if (!origin) return callback(null, true);

        // Em desenvolvimento local, permite localhost e 127.0.0.1
        if (process.env.NODE_ENV !== "production" && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
            return callback(null, true);
        }

        // Valida se a origem do navegador está na lista autorizada
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Acesso negado por CORS: Origem '${origin}' não autorizada.`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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

// 6. Middleware Global de Tratamento de Erros (incluindo bloqueios de CORS)
app.use((err, req, res, next) => {
    if (err.message && err.message.includes("CORS")) {
        return res.status(403).json({
            error: err.message
        });
    }

    console.error("[App Error]:", err.message || err);
    return res.status(500).json({
        error: err.message || "Erro interno do servidor."
    });
});

export default app;


