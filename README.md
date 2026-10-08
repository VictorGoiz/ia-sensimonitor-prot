# SensiMonitor AI — Microsserviço de Inteligência Artificial para Análise de Telemetria Ambiental (LFG60) e Chopeiras & Relés

Este projeto fornece uma **API REST de processamento inteligente, emissão de laudos técnicos e geração de planilhas Excel (.xlsx)**, projetada para ser consumida como serviço externo por sistemas de terceiros (plataformas IoT, dashboards industriais, ERPs, sistemas de gestão predial BMS/SCADA).

O serviço suporta o monitoramento de dois módulos operacionais especializados:
1. **Transmissor Ambiental LFG60:** Processamento de telemetria de qualidade do ar e conformidade regulatória (ANVISA RE nº 09/2003, OMS e NR-17).
2. **Sistema de Chopeiras & Relés:** Análise de pressão hidráulica na linha de chopp, ciclagem de compressores/bombas (Relés 1 e 2), detecção de vazamentos e diagnóstico operacional.

---

## 📋 Sumário
- [Recursos Principais](#-recursos-principais)
- [Variáveis de Telemetria](#-variáveis-de-telemetria)
  - [1. Transmissor Ambiental LFG60](#1-transmissor-ambiental-lfg60)
  - [2. Sistema de Chopeiras & Relés](#2-sistema-de-chopeiras--relés)
- [Referência Completa da API REST](#-referência-completa-da-api-rest)
  - [Módulo LFG60 (Ambiental)](#módulo-lfg60-ambiental)
    - [1. Análise de Telemetria LFG60 (`POST /api/lfg60/analyze`)](#1-análise-de-telemetria-lfg60-post-apilfg60analyze)
    - [2. Download do Laudo PDF LFG60 (`POST /api/lfg60/pdf`)](#2-download-do-laudo-pdf-lfg60-post-apilfg60pdf)
    - [3. Download de Planilha Excel (.xlsx) LFG60 (`POST /api/lfg60/excel`)](#3-download-de-planilha-excel-xlsx-lfg60-post-apilfg60excel)
    - [4. Envio por E-mail com PDF + Excel (`POST /api/lfg60/email/send`)](#4-envio-por-e-mail-com-pdf--excel-post-apilfg60emailsend)
    - [5. Agendamento Diário LFG60 (`GET` e `POST /api/lfg60/schedule`)](#5-agendamento-diário-lfg60-get-e-post-apilfg60schedule)
  - [Módulo Chopeiras & Relés](#módulo-chopeiras--relés)
    - [1. Análise de Telemetria de Chopeiras (`POST /api/chopeiras/analyze`)](#1-análise-de-telemetria-de-chopeiras-post-apichopeirasanalyze)
    - [2. Download do Laudo PDF de Chopeiras (`POST /api/chopeiras/pdf`)](#2-download-do-laudo-pdf-de-chopeiras-post-apichopeiraspdf)
    - [3. Download de Planilha Excel (.xlsx) de Chopeiras (`POST /api/chopeiras/excel`)](#3-download-de-planilha-excel-xlsx-de-chopeiras-post-apichopeirasexcel)
    - [4. Envio por E-mail de Chopeiras com PDF + Excel (`POST /api/chopeiras/email/send`)](#4-envio-por-e-mail-de-chopeiras-com-pdf--excel-post-apichopeirasemailsend)
    - [5. Agendamento Diário de Chopeiras (`GET` e `POST /api/chopeiras/schedule`)](#5-agendamento-diário-de-chopeiras-get-e-post-apichopeirasschedule)
- [Configuração do Ambiente (.env)](#-configuração-do-ambiente-env)
- [Dependências do Projeto & Finalidade](#-dependências-do-projeto--finalidade)
- [Instalação e Execução](#-instalação-e-execução)

---

## 🚀 Recursos Principais

1. **Laudo Pericial Estruturado com IA:** Diagnóstico técnico emitido em conformidade com normas regulatórias e de refrigeração.
2. **Relatório Diagramado em PDF Corporativo:** Documento vetorial multipágina gerado via `pdfkit`, com marca d'água, paginação dinâmica e tabelas de parâmetros.
3. **Planilha Excel (`.xlsx`) Estilizada:** Geração automática via `exceljs` com registros detalhados das leituras diárias, resumo estatístico (mínimo, média, máximo, total de ciclos) e cabeçalhos corporativos.
4. **Envio de E-mail com Múltiplos Anexos:** Disparo sob demanda ou automatizado via `node-cron` com o **Laudo PDF** e a **Planilha Excel (.xlsx)** anexados simultaneamente.

---

## 📊 Variáveis de Telemetria

### 1. Transmissor Ambiental LFG60

| Variável | Tipo | Unidade | Descrição | Faixa de Referência |
| :--- | :--- | :--- | :--- | :--- |
| `temperatura` | `number` | °C | Temperatura ambiente | $20.0^\circ\text{C}$ a $26.0^\circ\text{C}$ (NR-17 / ANVISA) |
| `umidade` | `number` | % | Umidade relativa do ar | $40.0\%$ a $60.0\%$ |
| `co2` | `number` | ppm | Dióxido de Carbono | $< 1000\text{ ppm}$ (ANVISA RE 09/2003) |
| `pm25` | `number` | µg/m³ | Material particulado fino | $< 15.0\ \mu\text{g/m}^3$ (Diretriz OMS) |
| `pm10` | `number` | µg/m³ | Material particulado inalável | $< 45.0\ \mu\text{g/m}^3$ (Diretriz OMS) |
| `voc` | `number` | ppm | Compostos Orgânicos Voláteis | $< 0.30\text{ ppm}$ |
| `formaldeido` | `number` | mg/m³ | Formaldeído (HCHO) | $< 0.08\text{ mg/m}^3$ (ANVISA) |

### 2. Sistema de Chopeiras & Relés

| Variável | Tipo | Unidade | Descrição | Faixa de Referência |
| :--- | :--- | :--- | :--- | :--- |
| `pressao` / `sensor1` | `number` | psi | Pressão da linha hidráulica de chopp | $18.0$ a $35.0\text{ psi}$ ($1.2$ a $2.4\text{ bar}$) |
| `rele1_on` | `number` | psi | Setpoint de partida do Compressor / Bomba 1 | Setpoint operacional configurado |
| `rele1_off` | `number` | psi | Setpoint de corte do Compressor / Bomba 1 | Setpoint operacional configurado |
| `rele1_acionamentos`| `number` | ciclos | Contador acumulado de partidas do Relé 1 | Histórico de ciclagem |
| `rele2_on` | `number` | psi | Setpoint de partida da Bomba 2 / Válvula | Setpoint operacional configurado |
| `rele2_off` | `number` | psi | Setpoint de corte da Bomba 2 / Válvula | Setpoint operacional configurado |
| `rele2_acionamentos`| `number` | ciclos | Contador acumulado de partidas do Relé 2 | Histórico de ciclagem |

---

## 🌐 Referência Completa da API REST

### Módulo LFG60 (Ambiental)

#### 1. Análise de Telemetria LFG60 (`POST /api/lfg60/analyze`)
- **Body:** `{ "temperatura": 24.5, "umidade": 55.0, "co2": 450, "pm25": 10.2, "pm10": 18.0, "voc": 0.15, "formaldeido": 0.02 }`
- **Query Params Opcionais:**
  - `?format=pdf`: Retorna diretamente o arquivo PDF.
  - `?format=excel`: Retorna diretamente a planilha `.xlsx`.

#### 2. Download do Laudo PDF LFG60 (`POST /api/lfg60/pdf`)
- Gera e faz streaming do arquivo `application/pdf`.

#### 3. Download de Planilha Excel (.xlsx) LFG60 (`POST /api/lfg60/excel`)
- Gera e faz streaming da planilha `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

#### 4. Envio por E-mail com PDF + Excel (`POST /api/lfg60/email/send`)
- **Body:**
```json
{
  "to": "gestor.ambiental@empresa.com.br",
  "subject": "[SensiMonitor] Relatório Ambiental LFG60",
  "data": { "temperatura": 24.5, "umidade": 55.0, "co2": 450, "pm25": 10.2, "pm10": 18.0, "voc": 0.15, "formaldeido": 0.02 }
}
```

#### 5. Agendamento Diário LFG60 (`GET` e `POST /api/lfg60/schedule`)
- Configura o horário de envio automático e o e-mail destinatário com anexação conjunta de PDF e Excel.

---

### Módulo Chopeiras & Relés

#### 1. Análise de Telemetria de Chopeiras (`POST /api/chopeiras/analyze`)
- **Body:**
```json
{
  "deviceName": "Chopeira Principal",
  "pressao": 24.5,
  "rele1_on": 12.5,
  "rele1_off": 11.5,
  "rele1_acionamentos": 45,
  "rele2_on": 10.2,
  "rele2_off": 13.8,
  "rele2_acionamentos": 30
}
```

#### 2. Download do Laudo PDF de Chopeiras (`POST /api/chopeiras/pdf`)
- Retorna o arquivo binário PDF diagramado especificamente para chopeiras e refrigeração.

#### 3. Download de Planilha Excel (.xlsx) de Chopeiras (`POST /api/chopeiras/excel`)
- Retorna a planilha `.xlsx` com as abas *Registros das Leituras* e *Resumo Estatístico*.

#### 4. Envio por E-mail de Chopeiras com PDF + Excel (`POST /api/chopeiras/email/send`)
- **Body:**
```json
{
  "to": "manutencao.chopeiras@empresa.com.br",
  "subject": "[SensiMonitor] Relatório Diário de Chopeiras",
  "data": {
    "deviceName": "Chopeira Master 01",
    "pressao": 24.5,
    "rele1_on": 12.5,
    "rele1_off": 11.5,
    "rele1_acionamentos": 45,
    "rele2_on": 10.2,
    "rele2_off": 13.8,
    "rele2_acionamentos": 30
  }
}
```

#### 5. Agendamento Diário de Chopeiras (`GET` e `POST /api/chopeiras/schedule`)
- **GET:** Consulta o status, último disparo e histórico.
- **POST:** `{ "time": "08:00", "recipient": "operacoes@empresa.com.br", "active": true }`
- **Trigger Imediato (`POST /api/chopeiras/schedule/trigger`):** Dispara a rotina agora.

---

## ⚙️ Configuração do Ambiente (.env)

```env
# Porta do Servidor
PORT=3000

# Provedor de IA (Hugging Face ou Ollama local)
HF_TOKEN=hf_sua_chave_aqui
HF_MODEL=meta-llama/Llama-3.2-3B-Instruct

# Configurações de SMTP para Envio de E-mails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_app_google
EMAIL_FROM="SensiMonitor Relatórios" <seu_email@gmail.com>

# Configurações do Agendador Diário
DEFAULT_REPORT_RECIPIENT=gestao@empresa.com.br
DEFAULT_SCHEDULE_TIME=08:00
SCHEDULE_TIMEZONE=America/Sao_Paulo

# Restrição de CORS (Domínios autorizados separados por vírgula)
ALLOWED_ORIGINS=https://www.sensimonitor.com.br,https://sensimonitor.com.br
```

---

## 📦 Dependências do Projeto & Finalidade

| Pacote | Versão | Finalidade no Projeto |
| :--- | :--- | :--- |
| **`exceljs`** | `^4.4.0` | **Geração dinâmica de planilhas Excel (.xlsx)** estilizadas com cabeçalhos institucionais, abas de registros diários e sumários estatísticos operacionais. |
| **`pdfkit`** | `^0.20.2` | **Geração de laudos periciais em PDF** corporativo com marca d'água, paginação dinâmica e tabelas comparativas. |
| **`nodemailer`** | `^10.0.10` | **Transporte e envio de e-mails** via SMTP com suporte a múltiplos anexos simultâneos (PDF + Excel). |
| **`node-cron`** | `^4.6.0` | **Agendamento automatizado** de rotinas diárias para auditoria e disparo de relatórios. |
| **`helmet`** | `^8.3.0` | **Segurança HTTP** para ambiente de produção e instâncias cloud (AWS EC2). |
| **`morgan`** | `^1.12.1` | **Log de requisições HTTP** adaptado para desenvolvimento e produção. |
| **`@huggingface/inference`** | `^4.13.30` | **Agente Especialista de IA** em nuvem para diagnóstico de telemetria. |
| **`ollama`** | `^0.6.3` | **IA Local / Contingência** para ambientes offline ou air-gapped. |
| **`express`** | `^5.2.1` | Framework Web e roteamento REST dos módulos ambientais e de chopeiras. |
| **`cors`** | `^2.8.6` | Configuração de segurança de Cross-Origin Resource Sharing. |
| **`dotenv`** | `^18.0.1` | Carregamento de variáveis de ambiente. |

---

## 🛠️ Instalação e Execução

```bash
cd src
npm install
npm start
```
