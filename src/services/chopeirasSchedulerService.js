import cron from "node-cron";
import { emailConfig } from "../config/emailConfig.js";
import { analyzeChopeirasData, generateChopeirasPDF } from "./chopeirasService.js";
import { generateChopeirasExcel } from "./excelService.js";
import { sendChopeirasEmail } from "./emailService.js";

class ChopeirasReportScheduler {
    constructor() {
        this.task = null;
        this.active = false;
        this.timeString = emailConfig.defaultScheduleTime || "08:00";
        this.cronExpression = this.convertTimeToCron(this.timeString);
        this.recipient = emailConfig.defaultRecipient;
        this.timezone = emailConfig.defaultTimezone;
        this.lastRun = null;
        this.lastStatus = "Nenhum disparo realizado";
        this.lastError = null;
        this.history = [];
        
        // Dados telemétricos padrão / última leitura em memória
        this.latestChopeirasData = {
            deviceName: "Chopeira Principal",
            pressao: 24.5,
            sensor1: 24.5,
            rele1_on: 12.5,
            rele1_off: 11.5,
            rele1_acionamentos: 45,
            rele2_on: 10.2,
            rele2_off: 13.8,
            rele2_acionamentos: 30
        };

        // Cache de registros do dia (se recebidos via API)
        this.dailyRecords = [];
    }

    convertTimeToCron(timeStr) {
        if (!timeStr || !timeStr.includes(":")) {
            return "0 8 * * *";
        }
        const [hour, minute] = timeStr.split(":").map(s => parseInt(s.trim(), 10));
        const safeHour = isNaN(hour) ? 8 : Math.max(0, Math.min(23, hour));
        const safeMinute = isNaN(minute) ? 0 : Math.max(0, Math.min(59, minute));
        return `${safeMinute} ${safeHour} * * *`;
    }

    updateLatestData(data, records = null) {
        if (data && typeof data === "object") {
            this.latestChopeirasData = { ...this.latestChopeirasData, ...data };
        }
        if (Array.isArray(records)) {
            this.dailyRecords = records;
        }
    }

    start() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }

        try {
            if (!cron.validate(this.cronExpression)) {
                throw new Error(`Expressão cron inválida: ${this.cronExpression}`);
            }

            this.task = cron.schedule(
                this.cronExpression,
                async () => {
                    console.log(`[Chopeiras Scheduler] Disparo diário agendado iniciado (${new Date().toISOString()})...`);
                    await this.executeReportJob();
                },
                {
                    scheduled: true,
                    timezone: this.timezone
                }
            );

            this.active = true;
            console.log(`[Chopeiras Scheduler] Agendamento ativo para as ${this.timeString} (Cron: '${this.cronExpression}') | Timezone: ${this.timezone}`);
            return true;
        } catch (error) {
            console.error("[Chopeiras Scheduler] Erro ao iniciar agendador:", error.message);
            this.active = false;
            this.lastError = error.message;
            return false;
        }
    }

    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
        this.active = false;
        console.log("[Chopeiras Scheduler] Agendamento de envio de relatórios pausado.");
    }

    configure({ time, recipient, active = true, cronExp }) {
        if (time) {
            this.timeString = time;
            this.cronExpression = this.convertTimeToCron(time);
        }
        if (cronExp && cron.validate(cronExp)) {
            this.cronExpression = cronExp;
            this.timeString = `Custom (${cronExp})`;
        }
        if (recipient) {
            this.recipient = recipient;
        }

        if (active) {
            this.start();
        } else {
            this.stop();
        }

        return this.getStatus();
    }

    /**
     * Executa a rotina: Análise IA -> Criação do PDF -> Geração do Excel (.xlsx) -> Envio por E-mail com ambos anexados
     */
    async executeReportJob(overrideData = null, overrideRecipient = null, overrideRecords = null) {
        const data = overrideData || this.latestChopeirasData;
        const targetRecipient = overrideRecipient || this.recipient;
        const records = overrideRecords || this.dailyRecords;
        const deviceName = data.deviceName || data.numero_serie || "Chopeira Principal";
        const executionTimestamp = new Date();

        try {
            console.log(`[Chopeiras Scheduler] 1/4 Gerando parecer operacional de IA para Chopeiras...`);
            const analysis = await analyzeChopeirasData(data);

            console.log(`[Chopeiras Scheduler] 2/4 Gerando laudo técnico em PDF...`);
            const pdfBuffer = await generateChopeirasPDF({
                data,
                analysis,
                deviceName
            });

            console.log(`[Chopeiras Scheduler] 3/4 Gerando planilha Excel (.xlsx) com registros das leituras do dia...`);
            const excelBuffer = await generateChopeirasExcel({
                records,
                currentData: data,
                deviceName
            });

            console.log(`[Chopeiras Scheduler] 4/4 Enviando e-mail corporativo com anexos (PDF + Excel) para: ${targetRecipient}...`);
            const sendResult = await sendChopeirasEmail({
                to: targetRecipient,
                data,
                pdfBuffer,
                excelBuffer,
                deviceName
            });

            this.lastRun = executionTimestamp;
            this.lastStatus = `Sucesso - Enviado para ${targetRecipient} com 2 anexos (PDF + Excel)`;
            this.lastError = null;

            const logEntry = {
                timestamp: executionTimestamp,
                recipient: targetRecipient,
                status: "success",
                attachments: ["PDF", "Excel (.xlsx)"],
                messageId: sendResult.messageId,
                previewUrl: sendResult.previewUrl
            };
            this.history.unshift(logEntry);
            if (this.history.length > 20) this.history.pop();

            return {
                success: true,
                message: `Relatório de Chopeira (PDF + Excel) enviado com sucesso para ${targetRecipient}`,
                details: sendResult
            };
        } catch (error) {
            console.error("[Chopeiras Scheduler] Falha na rotina de geração/envio do relatório:", error);
            this.lastRun = executionTimestamp;
            this.lastStatus = `Erro: ${error.message}`;
            this.lastError = error.message;

            const logEntry = {
                timestamp: executionTimestamp,
                recipient: targetRecipient,
                status: "error",
                error: error.message
            };
            this.history.unshift(logEntry);
            if (this.history.length > 20) this.history.pop();

            return {
                success: false,
                error: error.message
            };
        }
    }

    getStatus() {
        return {
            active: this.active,
            time: this.timeString,
            cron: this.cronExpression,
            recipient: this.recipient,
            timezone: this.timezone,
            lastRun: this.lastRun,
            lastStatus: this.lastStatus,
            lastError: this.lastError,
            history: this.history
        };
    }
}

export const chopeirasSchedulerService = new ChopeirasReportScheduler();
