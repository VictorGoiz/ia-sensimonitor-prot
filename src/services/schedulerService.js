import cron from "node-cron";
import { emailConfig } from "../config/emailConfig.js";
import { analyzeSensorData, generateAnalysisPDF } from "./lfg60Service.js";
import { sendReportEmail } from "./emailService.js";

class SensorReportScheduler {
    constructor() {
        this.task = null;
        this.active = false;
        this.timeString = emailConfig.defaultScheduleTime; // Ex: "08:00"
        this.cronExpression = this.convertTimeToCron(this.timeString);
        this.recipient = emailConfig.defaultRecipient;
        this.timezone = emailConfig.defaultTimezone;
        this.lastRun = null;
        this.lastStatus = "Nenhum disparo realizado";
        this.lastError = null;
        this.history = [];
        
        // Armazena a última leitura telemétrica recebida dos sensores LFG60
        this.latestSensorData = {
            temperatura: 24.5,
            umidade: 52.0,
            co2: 450,
            pm25: 10.2,
            pm10: 18.0,
            voc: 0.15,
            formaldeido: 0.02
        };
    }

    /**
     * Converte horário "HH:mm" em expressão cron "m H * * *"
     */
    convertTimeToCron(timeStr) {
        if (!timeStr || !timeStr.includes(":")) {
            return "0 8 * * *"; // Padrão 08:00 todos os dias
        }
        const [hour, minute] = timeStr.split(":").map(s => parseInt(s.trim(), 10));
        const safeHour = isNaN(hour) ? 8 : Math.max(0, Math.min(23, hour));
        const safeMinute = isNaN(minute) ? 0 : Math.max(0, Math.min(59, minute));
        return `${safeMinute} ${safeHour} * * *`;
    }

    /**
     * Atualiza a última telemetria em memória para os disparos agendados
     */
    updateLatestSensorData(data) {
        if (data && typeof data === "object") {
            this.latestSensorData = { ...this.latestSensorData, ...data };
        }
    }

    /**
     * Inicia ou reinicia o agendamento
     */
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
                    console.log(`[Scheduler] Disparo automático agendado iniciado (${new Date().toISOString()})...`);
                    await this.executeReportJob();
                },
                {
                    scheduled: true,
                    timezone: this.timezone
                }
            );

            this.active = true;
            console.log(`[Scheduler] Agendamento ativo para as ${this.timeString} (Cron: '${this.cronExpression}') | Timezone: ${this.timezone}`);
            return true;
        } catch (error) {
            console.error("[Scheduler] Erro ao iniciar agendador:", error.message);
            this.active = false;
            this.lastError = error.message;
            return false;
        }
    }

    /**
     * Para o agendamento
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
        this.active = false;
        console.log("[Scheduler] Agendamento de envio de relatórios pausado.");
    }

    /**
     * Configura um novo horário e/ou destinatário
     */
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
     * Executa o fluxo completo: Análise IA -> Criação do PDF -> Envio por E-mail
     */
    async executeReportJob(overrideSensorData = null, overrideRecipient = null) {
        const sensorData = overrideSensorData || this.latestSensorData;
        const targetRecipient = overrideRecipient || this.recipient;
        const executionTimestamp = new Date();

        try {
            console.log(`[Scheduler] 1/3 Gerando análise técnica com o agente SensiMonitor...`);
            const analysis = await analyzeSensorData(sensorData);

            console.log(`[Scheduler] 2/3 Gerando PDF diagramado do relatório ambiental...`);
            const pdfBuffer = await generateAnalysisPDF({
                sensorData,
                analysis,
                deviceName: "LFG60"
            });

            console.log(`[Scheduler] 3/3 Enviando e-mail com anexo para: ${targetRecipient}...`);
            const sendResult = await sendReportEmail({
                to: targetRecipient,
                sensorData,
                pdfBuffer,
                deviceName: "LFG60"
            });

            this.lastRun = executionTimestamp;
            this.lastStatus = `Sucesso - Enviado para ${targetRecipient}`;
            this.lastError = null;

            const logEntry = {
                timestamp: executionTimestamp,
                recipient: targetRecipient,
                status: "success",
                messageId: sendResult.messageId,
                previewUrl: sendResult.previewUrl
            };
            this.history.unshift(logEntry);
            if (this.history.length > 20) this.history.pop();

            return {
                success: true,
                message: `Relatório gerado e enviado com sucesso para ${targetRecipient}`,
                details: sendResult
            };
        } catch (error) {
            console.error("[Scheduler] Falha na rotina de geração/envio do relatório:", error);
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

    /**
     * Retorna o status atual do serviço de agendamento
     */
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

export const schedulerService = new SensorReportScheduler();
