import app from "./app.js";
import dotenv from "dotenv";
import { schedulerService } from "./services/schedulerService.js";

// Carrega as variáveis do arquivo .env
dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
    console.log(`Endpoint de chat: POST http://localhost:${PORT}/api/chat`);
    console.log(`Endpoint do Sensor LFG60: POST http://localhost:${PORT}/api/lfg60/analyze`);
    console.log(`Endpoint de Relatório PDF: POST http://localhost:${PORT}/api/lfg60/pdf`);
    console.log(`Endpoint de Envio por E-mail: POST http://localhost:${PORT}/api/lfg60/email/send`);
    console.log(`Endpoint de Agendamento: POST/GET http://localhost:${PORT}/api/lfg60/schedule`);

    // Inicia o serviço de agendamento automático
    schedulerService.start();
});