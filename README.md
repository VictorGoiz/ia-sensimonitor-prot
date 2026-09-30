# SensiMonitor AI — Microsserviço de Inteligência Artificial para Análise de Telemetria Ambiental (LFG60)

Este projeto fornece uma **API REST de processamento inteligente e emissão de laudos periciais ambientais**, projetada para ser consumida como serviço externo por sistemas de terceiros (plataformas IoT, dashboards industriais, ERPs, sistemas de gestão predial BMS/SCADA).

O serviço recebe as leituras dos sensores ambientais do dispositivo **LFG60**, processa os parâmetros através de um **Agente Especialista em Engenharia Ambiental e Higiene Ocupacional**, e disponibiliza:
1. **Laudo pericial estruturado em JSON** em conformidade com normas regulatórias.
2. **Relatório técnico diagramado em PDF corporativo** de alta fidelidade visual (com paginação dinâmica, marca d'água e tabela comparativa).
3. **Mecanismo de envio e agendamento automático por E-mail** (via SMTP ou rotina diária configurável).

---

## 📋 Sumário
- [Arquitetura do Agente de IA & Normas Regulatórias](#-arquitetura-do-agente-de-ia--normas-regulatórias)
- [Variáveis do Sensor LFG60](#-variáveis-do-sensor-lfg60)
- [Referência Completa da API REST](#-referência-completa-da-api-rest)
  - [1. Análise de Telemetria com IA (`POST /api/lfg60/analyze`)](#1-análise-de-telemetria-com-ia-post-apilfg60analyze)
  - [2. Geração Direta de Relatório PDF (`POST /api/lfg60/pdf`)](#2-geração-direta-de-relatório-pdf-post-apilfg60pdf)
  - [3. Envio Sob Demanda por E-mail (`POST /api/lfg60/email/send`)](#3-envio-sob-demanda-por-e-mail-post-apilfg60emailsend)
  - [4. Consulta do Status de Agendamento (`GET /api/lfg60/schedule`)](#4-consulta-do-status-de-agendamento-get-apilfg60schedule)
  - [5. Atualização do Agendamento Diário (`POST /api/lfg60/schedule`)](#5-atualização-do-agendamento-diário-post-apilfg60schedule)
  - [6. Disparo Imediato da Rotina Agendada (`POST /api/lfg60/schedule/trigger`)](#6-disparo-imediato-da-rotina-agendada-post-apilfg60scheduletrigger)
- [Exemplos de Integração em Sistemas Externos](#-exemplos-de-integração-em-sistemas-externos)
  - [cURL](#curl)
  - [Python](#python)
  - [Node.js (Fetch / Axios)](#nodejs-fetch--axios)
  - [C# (.NET)](#c-net)
- [Configuração do Ambiente (.env)](#-configuração-do-ambiente-env)
- [Dependências do Projeto & Finalidade](#-dependências-do-projeto--finalidade)
- [Instalação e Execução](#-instalação-e-execução)

---

## 🧠 Arquitetura do Agente de IA & Normas Regulatórias

O motor de IA atua com uma persona calibrada de **Especialista em Engenharia Ambiental e Gestão de Qualidade do Ar Interior**, fundamentando todas as análises nas normas vigentes:

- **ANVISA RE nº 09/2003**: Padrões referenciais de qualidade do ar em ambientes climatizados de uso coletivo e público.
- **Diretrizes Globais da OMS (Organização Mundial da Saúde)**: Limites de corte para material particulado respirável e inalável.
- **NR-17 (Norma Regulamentadora 17)**: Conforto termo-higrométrico e ergonomia em ambientes de trabalho.

### Estrutura Padronizada do Laudo (4 Seções Obrigatórias):
1. **Sumário Executivo & Classificação Global**: Resumo executivo com status global do ambiente (*Satisfatório/Conforme*, *Alerta Técnico* ou *Crítico*).
2. **Avaliação Técnica Detalhada dos Parâmetros**:
   - Conforto Termo-higrométrico (Temperatura e Umidade frente à NR-17 e ANVISA).
   - Carga de Partículas (PM2.5 e PM10 frente às diretrizes da OMS).
   - Gases e Compostos Químicos (CO2 para taxa de renovação, VOCs e Formaldeído/HCHO < 0.08 mg/m³).
3. **Impactos à Saúde Humana e Segurança Ocupacional**: Descrição de efeitos fisiológicos (fadiga, estresse térmico, irritação de mucosas, síndrome do edifício enfermo).
4. **Plano de Ação Corretiva & Recomendações de Engenharia**: Ações práticas de controle de HVAC, renovação de ar exterior e manutenção preventiva.

---

## 📊 Variáveis do Sensor LFG60

| Variável | Tipo | Unidade | Descrição | Faixa de Referência |
| :--- | :--- | :--- | :--- | :--- |
| `temperatura` | `number` | °C | Temperatura ambiente | $20.0^\circ\text{C}$ a $26.0^\circ\text{C}$ (NR-17 / ANVISA) |
| `umidade` | `number` | % | Umidade relativa do ar | $40.0\%$ a $60.0\%$ |
| `co2` | `number` | ppm | Concentração de Dióxido de Carbono | $< 1000\text{ ppm}$ (ANVISA RE 09/2003) |
| `pm25` | `number` | µg/m³ | Material particulado fino | $< 15.0\ \mu\text{g/m}^3$ (Diretriz OMS) |
| `pm10` | `number` | µg/m³ | Material particulado inalável | $< 45.0\ \mu\text{g/m}^3$ (Diretriz OMS) |
| `voc` | `number` | ppm | Compostos Orgânicos Voláteis | $< 0.30\text{ ppm}$ |
| `formaldeido` | `number` | mg/m³ | Concentração de Formaldeído (HCHO) | $< 0.08\text{ mg/m}^3$ (ANVISA) |

---

## 🚀 Referência Completa da API REST

URL Base padrão: `http://localhost:3000` (ou endereço do servidor onde a API for hospedada).

---

### 1. Análise de Telemetria com IA (`POST /api/lfg60/analyze`)

Processa os dados telemétricos recebidos e retorna o parecer pericial emitido pelo modelo de IA.

- **URL:** `/api/lfg60/analyze` (ou `/api/analyze`)
- **Método:** `POST`
- **Headers:** `Content-Type: application/json`

#### Corpo da Requisição (Request Body):
```json
{
  "temperatura": 37.5,
  "umidade": 55.0,
  "co2": 450,
  "pm25": 10.2,
  "pm10": 18.0,
  "voc": 0.15,
  "formaldeido": 0.02
}
```

#### Resposta de Sucesso (200 OK):
```json
{
  "device": "LFG60",
  "timestamp": "2026-09-25T11:00:00.000Z",
  "data": {
    "temperatura": 37.5,
    "umidade": 55,
    "co2": 450,
    "pm25": 10.2,
    "pm10": 18,
    "voc": 0.15,
    "formaldeido": 0.02
  },
  "analysis": "1. Sumário Executivo & Classificação Global\nO diagnóstico ambiental realizado a partir dos dados telemétricos do sensor LFG60 classifica o ambiente sob monitoramento como ALERTA TÉCNICO...\n\n2. Avaliação Técnica Detalhada dos Parâmetros\n- Conforto Termo-higrométrico: A temperatura registrada foi de 37.5 °C, encontrando-se ACIMA do limite recomendado pela NR-17...\n\n3. Impactos à Saúde Humana e Segurança Ocupacional\nA elevação térmica detectada induz estresse térmico moderado a severo...\n\n4. Plano de Ação Corretiva & Recomendações de Engenharia\n- Climatização e Termorregulação: Realizar calibração e ajuste imediato no setpoint...",
  "pdfEndpoint": "/api/lfg60/pdf",
  "emailEndpoint": "/api/lfg60/email/send"
}
```

> **Dica:** Se adicionar `?format=pdf` na URL (`POST /api/lfg60/analyze?format=pdf`), o endpoint retorna diretamente o arquivo binário do PDF.

---

### 2. Geração Direta de Relatório PDF (`POST /api/lfg60/pdf`)

Gera o relatório visual diagramado em PDF corporativo de múltiplas páginas com cabeçalho institucional, marca d'água, tabela de conformidade e parecer pericial completo.

- **URL:** `/api/lfg60/pdf` (ou `/api/analyze/pdf`)
- **Método:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "temperatura": 37.5,
  "umidade": 55.0,
  "co2": 450,
  "pm25": 10.2,
  "pm10": 18.0,
  "voc": 0.15,
  "formaldeido": 0.02
}
```
- **Resposta:** Arquivo binário `application/pdf` (`Content-Disposition: attachment; filename="relatorio_lfg60.pdf"`).

---

### 3. Envio Sob Demanda por E-mail (`POST /api/lfg60/email/send`)

Gera a análise, cria o relatório em PDF e envia imediatamente como anexo para o e-mail informado.

- **URL:** `/api/lfg60/email/send`
- **Método:** `POST`
- **Body:**
```json
{
  "to": "gestor.ambiental@empresa.com.br",
  "subject": "[SensiMonitor] Parecer Técnico LFG60 - Setor Produção",
  "temperatura": 37.5,
  "umidade": 55.0,
  "co2": 450,
  "pm25": 10.2,
  "pm10": 18.0,
  "voc": 0.15,
  "formaldeido": 0.02
}
```
- **Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Relatório ambiental enviado com sucesso para gestor.ambiental@empresa.com.br",
  "details": {
    "success": true,
    "messageId": "<e94efdf2-104c-a262-4619-786fa4db8a0a@gmail.com>",
    "recipient": "gestor.ambiental@empresa.com.br",
    "previewUrl": null
  }
}
```

---

### 4. Consulta do Status de Agendamento (`GET /api/lfg60/schedule`)

- **URL:** `/api/lfg60/schedule`
- **Método:** `GET`
- **Resposta de Sucesso (200 OK):**
```json
{
  "active": true,
  "time": "08:00",
  "cron": "0 8 * * *",
  "recipient": "gestao.ambiental@empresa.com.br",
  "timezone": "America/Sao_Paulo",
  "lastRun": "2026-09-24T16:28:18.000Z",
  "lastStatus": "Sucesso - Enviado para gestao.ambiental@empresa.com.br",
  "lastError": null,
  "history": [
    {
      "timestamp": "2026-09-24T16:28:18.000Z",
      "recipient": "gestao.ambiental@empresa.com.br",
      "status": "success",
      "messageId": "<...>"
    }
  ]
}
```

---

### 5. Atualização do Agendamento Diário (`POST /api/lfg60/schedule`)

Configura ou reprograma o horário de disparo diário, o e-mail destinatário ou o status de ativação da rotina.

- **URL:** `/api/lfg60/schedule`
- **Método:** `POST`
- **Body:**
```json
{
  "time": "08:30",
  "recipient": "diretoria.operacoes@empresa.com.br",
  "active": true
}
```

---

### 6. Disparo Imediato da Rotina Agendada (`POST /api/lfg60/schedule/trigger`)

Força a execução imediata da rotina de auditoria ambiental, gerando o parecer com as últimas leituras em memória e enviando o e-mail.

- **URL:** `/api/lfg60/schedule/trigger`
- **Método:** `POST`
- **Body:** (Opcional: pode enviar dados do sensor para sobrescrever a última leitura)
```json
{
  "to": "auditoria@empresa.com.br"
}
```

---

## 💻 Exemplos de Integração em Sistemas Externos

### cURL
```bash
curl -X POST http://localhost:3000/api/lfg60/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "temperatura": 37.5,
    "umidade": 55.0,
    "co2": 450,
    "pm25": 10.2,
    "pm10": 18.0,
    "voc": 0.15,
    "formaldeido": 0.02
  }'
```

### Python
```python
import requests

url = "http://localhost:3000/api/lfg60/analyze"
payload = {
    "temperatura": 37.5,
    "umidade": 55.0,
    "co2": 450,
    "pm25": 10.2,
    "pm10": 18.0,
    "voc": 0.15,
    "formaldeido": 0.02
}

response = requests.post(url, json=payload)
data = response.json()

print(f"Status do Dispositivo: {data['device']}")
print(f"Parecer Técnico da IA:\n{data['analysis']}")
```

### Node.js (Fetch / Axios)
```javascript
import axios from "axios";

async function analyzeSensorTelemetry() {
  const telemetry = {
    temperatura: 37.5,
    umidade: 55.0,
    co2: 450,
    pm25: 10.2,
    pm10: 18.0,
    voc: 0.15,
    formaldeido: 0.02
  };

  const response = await axios.post("http://localhost:3000/api/lfg60/analyze", telemetry);
  console.log("Diagnóstico Recebido:", response.data.analysis);
}

analyzeSensorTelemetry();
```

### C# (.NET)
```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var client = new HttpClient();
        var payload = new
        {
            temperatura = 37.5,
            umidade = 55.0,
            co2 = 450,
            pm25 = 10.2,
            pm10 = 18.0,
            voc = 0.15,
            formaldeido = 0.02
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("http://localhost:3000/api/lfg60/analyze", content);
        
        var responseBody = await response.Content.ReadAsStringAsync();
        Console.WriteLine(responseBody);
    }
}
```

---

## ⚙️ Configuração do Ambiente (.env)

Crie ou edite o arquivo `.env` na pasta raiz ou em `src/.env` com as configurações desejadas:

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
EMAIL_FROM="SensiMonitor Ambiental" <seu_email@gmail.com>

# Configurações do Agendador
DEFAULT_REPORT_RECIPIENT=gestao.ambiental@empresa.com.br
DEFAULT_SCHEDULE_TIME=08:00
SCHEDULE_TIMEZONE=America/Sao_Paulo
```

---

## 📦 Dependências do Projeto & Finalidade

O projeto utiliza um conjunto enxuto de bibliotecas para garantir alto desempenho, confiabilidade e facilidade de manutenção. A seguir, o detalhamento de cada dependência e seu papel na arquitetura:

| Pacote | Versão | Categoria | Finalidade no Projeto |
| :--- | :--- | :--- | :--- |
| **`helmet`** | `^8.0.0` | Segurança / Produção | Adiciona cabeçalhos de segurança HTTP essenciais (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, etc.) para proteção contra ataques comuns da web em ambientes de produção e instâncias de nuvem como **AWS EC2**. |
| **`morgan`** | `^1.10.0` | Observabilidade / Logs | Middleware de log detalhado para todas as requisições HTTP recebidas (método, rota, status HTTP, tempo de resposta e payload), adaptando o formato automaticamente para desenvolvimento (`dev`) ou produção (`combined` para CloudWatch / logs de servidor). |
| **`@huggingface/inference`** | `^4.13.30` | Inteligência Artificial | SDK oficial para comunicação com a API de inferência do Hugging Face. Executa o **Agente Especialista** em nuvem (ex: `Llama-3.2-3B-Instruct`), gerando os pareceres periciais estruturados com base no contexto regulatório. |
| **`express`** | `^5.2.1` | Servidor Web / API | Framework HTTP rápido e minimalista para Node.js. Gerencia o roteamento REST, middlewares de requisição e disponibiliza os endpoints de análise (`/analyze`), geração de PDF (`/pdf`), e-mail (`/email/send`) e agendamento (`/schedule`). |
| **`cors`** | `^2.8.6` | Segurança / Integração | Middleware que habilita o *Cross-Origin Resource Sharing* (CORS). Permite que aplicações web externas, frontends e dashboards rodando em outros domínios ou portas consumam a API com segurança. |
| **`dotenv`** | `^18.0.1` | Configuração | Carrega variáveis de ambiente a partir do arquivo `.env` para `process.env`, garantindo que credenciais de SMTP, chaves de API e portas fiquem isoladas do código-fonte. |
| **`pdfkit`** | `^0.20.2` | Geração de Documentos | Motor de geração dinâmica de arquivos PDF vetoriais em Node.js. Constrói o relatório técnico institucional com suporte a múltiplas páginas (`bufferPages`), marca d'água centralizada, tabelas comparativas e fluxo contínuo de texto sem corte. |
| **`nodemailer`** | `^10.0.10` | Comunicação / E-mail | Biblioteca para transporte e envio de e-mails via protocolo SMTP. Conecta-se a servidores corporativos, Gmail ou Outlook, anexa o arquivo PDF gerado e formata o corpo do e-mail com layout HTML executivo. Também provê suporte automático ao *Ethereal Mail* para testes locais. |
| **`node-cron`** | `^4.6.0` | Automação / Scheduler | Agendador de tarefas periódicas baseado na sintaxe cron do Unix. Permite automatizar o disparo diário dos relatórios em horários parametrizados (ex: `08:00`), respeitando o fuso horário configurado (`America/Sao_Paulo`). |
| **`ollama`** | `^0.6.3` | IA Local / Fallback | Cliente de integração com instâncias locais do Ollama. Atua como contingência de inteligência artificial caso a conexão com a nuvem (Hugging Face) esteja indisponível ou para ambientes industriais *air-gapped* (offline). |

---

## ☁️ Preparação para Deploy em Nuvem (AWS EC2 / Produção)

O projeto já conta com boas práticas para execução em servidores cloud como **AWS EC2**:
- **Cabeçalhos de Segurança:** Configurados via `helmet` para conformidade com auditorias de segurança web.
- **Registro de Acessos:** Ativado via `morgan`, gravando logs no formato Apache/Combined quando `NODE_ENV=production`.
- **Health Check Endpoint:** Disponível em `GET /health` para integração direta com **AWS Application Load Balancer (ALB) Target Groups**, **PM2**, ou ferramentas de monitoramento (Uptime Kuma, Datadog).
  - Resposta do health check:
    ```json
    {
      "status": "ok",
      "uptime": 1240.5,
      "timestamp": "2026-09-30T16:48:00.000Z",
      "service": "SensiMonitor AI API"
    }
    ```

---

## 🛠️ Instalação e Execução

1. **Instalar as dependências:**
   ```bash
   cd src
   npm install
   ```

2. **Iniciar o servidor em desenvolvimento:**
   ```bash
   npm start
   # ou
   node server.js
   ```

3. **Execução em Produção (ex: com PM2 na EC2):**
   ```bash
   NODE_ENV=production pm2 start server.js --name sensimonitor-api
   ```

4. **Acesso:**
   - **Health Check:** `http://localhost:3000/health`
   - **API REST:** `http://localhost:3000/api/lfg60/analyze`
   - **Interface Web Corporativa:** Abra `index.html` ou acesse `http://localhost:3000`


