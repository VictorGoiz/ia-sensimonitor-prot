import dotenv from "dotenv";

dotenv.config();

export const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || ""
    },
    from: process.env.EMAIL_FROM || '"SensiMonitor - Qualidade do Ar" <relatorios@sensimonitor.com.br>',
    defaultRecipient: process.env.DEFAULT_REPORT_RECIPIENT || "gestao.ambiental@empresa.com.br",
    defaultScheduleTime: process.env.DEFAULT_SCHEDULE_TIME || "08:00", // Formato HH:mm
    defaultTimezone: process.env.SCHEDULE_TIMEZONE || "America/Sao_Paulo"
};
