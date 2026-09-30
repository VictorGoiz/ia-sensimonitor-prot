import nodemailer from "nodemailer";
import { emailConfig } from "../config/emailConfig.js";

let cachedTransporter = null;

/**
 * Cria ou recupera o transporter de e-mail adequado (SMTP Real ou Ethereal para testes).
 */
async function getTransporter() {
    if (cachedTransporter) return cachedTransporter;

    const hasCredentials = Boolean(emailConfig.auth.user && emailConfig.auth.pass);

    if (hasCredentials) {
        cachedTransporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            auth: {
                user: emailConfig.auth.user,
                pass: emailConfig.auth.pass
            }
        });
        return cachedTransporter;
    }

    // Se não houver credenciais SMTP configuradas no .env, cria conta de teste automática (Ethereal)
    console.info("Nenhuma credencial SMTP configurada. Inicializando conta de teste Ethereal Mail...");
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
    return cachedTransporter;
}

/**
 * Monta o template HTML corporativo para o corpo do e-mail.
 */
function buildEmailHtml({ sensorData, deviceName = "LFG60", timestamp = new Date() }) {
    const dateFormatted = timestamp.toLocaleString("pt-BR", { timeZone: emailConfig.defaultTimezone });
    
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 24px; text-align: left; border-bottom: 3px solid #0284c7;">
            <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;">
                SensiMonitor // Relatório Técnico Ambiental
            </h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 12px;">
                Dispositivo: ${deviceName} | Emissão: ${dateFormatted}
            </p>
        </div>

        <div style="padding: 24px;">
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
                Prezado(a) Gestor(a),
            </p>
            <p style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                O sistema de monitoramento contínuo <strong>SensiMonitor</strong> emitiu o relatório técnico com as leituras de telemetria e o parecer especializado de qualidade do ar e conformidade regulatória (ANVISA RE 09/2003, OMS e NR-17).
            </p>

            <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 14px; color: #475569; font-weight: 600;">Parâmetro</th>
                            <th style="padding: 10px 14px; color: #475569; font-weight: 600;">Leitura</th>
                            <th style="padding: 10px 14px; color: #475569; font-weight: 600;">Referência</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 14px;">Temperatura</td>
                            <td style="padding: 8px 14px; font-weight: 600; color: ${sensorData.temperatura > 26 ? '#b91c1c' : '#0f172a'};">${sensorData.temperatura ?? 'N/A'} °C</td>
                            <td style="padding: 8px 14px; color: #64748b;">20.0 a 26.0 °C</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9; background-color: #fafbfc;">
                            <td style="padding: 8px 14px;">Umidade Relativa</td>
                            <td style="padding: 8px 14px; font-weight: 600;">${sensorData.umidade ?? 'N/A'} %</td>
                            <td style="padding: 8px 14px; color: #64748b;">40.0 a 60.0 %</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 14px;">Dióxido de Carbono (CO2)</td>
                            <td style="padding: 8px 14px; font-weight: 600; color: ${sensorData.co2 > 1000 ? '#b91c1c' : '#0f172a'};">${sensorData.co2 ?? 'N/A'} ppm</td>
                            <td style="padding: 8px 14px; color: #64748b;">&lt; 1000 ppm</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9; background-color: #fafbfc;">
                            <td style="padding: 8px 14px;">Particulados (PM2.5 / PM10)</td>
                            <td style="padding: 8px 14px; font-weight: 600;">${sensorData.pm25 ?? 'N/A'} / ${sensorData.pm10 ?? 'N/A'} µg/m³</td>
                            <td style="padding: 8px 14px; color: #64748b;">OMS (&lt;15 / &lt;45)</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 14px;">VOC / Formaldeído (HCHO)</td>
                            <td style="padding: 8px 14px; font-weight: 600;">${sensorData.voc ?? 'N/A'} ppm / ${sensorData.formaldeido ?? 'N/A'} mg/m³</td>
                            <td style="padding: 8px 14px; color: #64748b;">HCHO &lt; 0.08 mg/m³</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #475569; background-color: #f1f5f9; padding: 12px; border-left: 4px solid #0284c7; border-radius: 4px;">
                📎 <strong>Arquivo Anexo:</strong> O relatório técnico completo e diagramado em PDF com o laudo pericial detalhado da IA encontra-se anexado a esta mensagem.
            </p>
        </div>

        <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
            SensiMonitor &bull; Plataforma Inteligente de Gestão e Monitoramento de Qualidade do Ar Interior
        </div>
    </div>
    `;
}

/**
 * Envia o relatório ambiental em PDF para o(s) e-mail(s) de destino.
 * @param {object} params
 * @param {string} params.to - Destinatário(s)
 * @param {object} params.sensorData - Leituras dos sensores do LFG60
 * @param {Buffer} params.pdfBuffer - Buffer do relatório PDF gerado
 * @param {string} [params.deviceName] - Nome do equipamento
 * @param {string} [params.subject] - Assunto personalizado
 * @returns {Promise<{ success: boolean, messageId: string, previewUrl?: string }>}
 */
export async function sendReportEmail({
    to,
    sensorData,
    pdfBuffer,
    deviceName = "LFG60",
    subject
}) {
    const recipient = to || emailConfig.defaultRecipient;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(":", "h");
    
    const emailSubject = subject || `[SensiMonitor] Relatório Técnico Ambiental - ${deviceName} (${dateStr} às ${timeStr})`;
    const htmlContent = buildEmailHtml({ sensorData, deviceName, timestamp: now });
    const filename = `Relatorio_Ambiental_${deviceName}_${dateStr}_${timeStr}.pdf`;

    const transporter = await getTransporter();

    const mailOptions = {
        from: emailConfig.from,
        to: recipient,
        subject: emailSubject,
        html: htmlContent,
        attachments: [
            {
                filename,
                content: pdfBuffer,
                contentType: "application/pdf"
            }
        ]
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
        console.info(`[Email Service] E-mail de teste enviado! URL de visualização: ${previewUrl}`);
    } else {
        console.info(`[Email Service] E-mail enviado com sucesso para ${recipient}. ID: ${info.messageId}`);
    }

    return {
        success: true,
        messageId: info.messageId,
        recipient,
        previewUrl: previewUrl || null
    };
}
