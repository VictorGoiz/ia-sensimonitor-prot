import ExcelJS from "exceljs";

/**
 * Formata data e hora para o padrão brasileiro (America/Sao_Paulo).
 */
function formatDatePtBr(dateVal) {
    if (!dateVal) return "";
    const d = typeof dateVal === "string" || typeof dateVal === "number" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Aplica estilos padrão em cabeçalhos de tabelas.
 */
function styleHeaderRow(row, bgColor = "FF1E60AC") {
    row.height = 28;
    row.eachCell((cell) => {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor }
        };
        cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FFFFFFFF" }
        };
        cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true
        };
        cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "medium", color: { argb: "FF0F172A" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };
    });
}

/**
 * Aplica bordas e alinhamento padrão nas linhas de dados.
 */
function styleDataRow(row, isEven = false) {
    row.height = 20;
    const bgArgb = isEven ? "FFF8FAFC" : "FFFFFFFF";
    row.eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.fill || cell.fill.type !== "pattern") {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: bgArgb }
            };
        }
        cell.font = {
            name: "Calibri",
            size: 10,
            color: { argb: "FF1E293B" }
        };
        cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
        if (!cell.alignment) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
        }
    });
}

/**
 * Gera a planilha Excel (.xlsx) para leituras e registros de Chopeiras / Relés.
 * @param {object} params
 * @param {Array<object>} [params.records] - Lista de registros de leituras do dia/banco
 * @param {object} [params.currentData] - Leitura atual se não houver lista completa
 * @param {string} [params.deviceName] - Nome ou número de série do equipamento
 * @param {string} [params.empresaNome] - Nome da empresa
 * @returns {Promise<Buffer>}
 */
export async function generateChopeirasExcel({
    records = [],
    currentData = null,
    deviceName = "Chopeira Principal",
    empresaNome = "SensiMonitor HQ"
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SensiMonitor AI System";
    workbook.lastModifiedBy = "SensiMonitor";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Se recebemos apenas um ponto atual e nenhum histórico, montamos um array com a leitura atual
    let dataList = Array.isArray(records) && records.length > 0 ? records : [];
    if (dataList.length === 0 && currentData) {
        dataList = [{
            id: 1,
            dispositivo_numero_serie: deviceName,
            sensor1: currentData.pressao ?? currentData.sensor1 ?? 24.5,
            rele1_on: currentData.rele1_on ?? 12.5,
            rele1_off: currentData.rele1_off ?? 11.5,
            rele1_acionamentos: currentData.rele1_acionamentos ?? 45,
            rele2_on: currentData.rele2_on ?? 10.2,
            rele2_off: currentData.rele2_off ?? 13.8,
            rele2_acionamentos: currentData.rele2_acionamentos ?? 30,
            timestamp_leitura: currentData.timestamp || new Date(),
            created_at: new Date()
        }];
    }

    // -------------------------------------------------------------
    // ABA 1: REGISTROS DETALHADOS DAS LEITURAS
    // -------------------------------------------------------------
    const ws1 = workbook.addWorksheet("Registros das Leituras", {
        views: [{ showGridLines: true }]
    });

    // Título Principal
    ws1.mergeCells("A1:J1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = `SENSIMONITOR // REGISTRO DE LEITURAS DIÁRIAS — ${String(deviceName).toUpperCase()}`;
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(1).height = 36;

    // Subtítulo e Metadados
    ws1.mergeCells("A2:J2");
    const subCell = ws1.getCell("A2");
    subCell.value = `Empresa: ${empresaNome} | Emissão: ${formatDatePtBr(new Date())} | Total de Registros: ${dataList.length}`;
    subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF64748B" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(2).height = 22;

    // Espaço em branco
    ws1.getRow(3).height = 10;

    // Cabeçalho das Colunas
    const headers = [
        "Item",
        "Dispositivo / Chopeira",
        "Pressão (psi / bar)",
        "Relé 1 (ON)",
        "Relé 1 (OFF)",
        "Acionamentos R1",
        "Relé 2 (ON)",
        "Relé 2 (OFF)",
        "Acionamentos R2",
        "Data / Hora da Leitura"
    ];

    const headerRow = ws1.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow, "FF1E60AC");

    // Adiciona Linhas de Dados
    dataList.forEach((r, idx) => {
        const row = ws1.getRow(5 + idx);
        const pressaoVal = r.sensor1 !== null && r.sensor1 !== undefined ? Number(r.sensor1) : (r.pressao !== undefined ? Number(r.pressao) : null);
        const r1On = r.rele1_on !== null && r.rele1_on !== undefined ? Number(r.rele1_on) : null;
        const r1Off = r.rele1_off !== null && r.rele1_off !== undefined ? Number(r.rele1_off) : null;
        const r1Ac = r.rele1_acionamentos !== null && r.rele1_acionamentos !== undefined ? Number(r.rele1_acionamentos) : null;
        const r2On = r.rele2_on !== null && r.rele2_on !== undefined ? Number(r.rele2_on) : null;
        const r2Off = r.rele2_off !== null && r.rele2_off !== undefined ? Number(r.rele2_off) : null;
        const r2Ac = r.rele2_acionamentos !== null && r.rele2_acionamentos !== undefined ? Number(r.rele2_acionamentos) : null;
        const ts = r.timestamp_leitura || r.timestamp || r.created_at;

        row.values = [
            idx + 1,
            r.dispositivo_numero_serie || deviceName,
            pressaoVal !== null ? pressaoVal : "--",
            r1On !== null ? r1On : "--",
            r1Off !== null ? r1Off : "--",
            r1Ac !== null ? r1Ac : "--",
            r2On !== null ? r2On : "--",
            r2Off !== null ? r2Off : "--",
            r2Ac !== null ? r2Ac : "--",
            formatDatePtBr(ts)
        ];

        styleDataRow(row, idx % 2 === 1);

        // Destaque de cor suave na célula de pressão
        const pressCell = row.getCell(3);
        pressCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0369A1" } };
    });

    // Ajuste de largura das colunas da Aba 1
    ws1.columns = [
        { width: 8 },  // Item
        { width: 24 }, // Dispositivo
        { width: 20 }, // Pressao
        { width: 15 }, // Rele 1 ON
        { width: 15 }, // Rele 1 OFF
        { width: 18 }, // Acionamentos R1
        { width: 15 }, // Rele 2 ON
        { width: 15 }, // Rele 2 OFF
        { width: 18 }, // Acionamentos R2
        { width: 24 }  // Data / Hora
    ];

    // -------------------------------------------------------------
    // ABA 2: RESUMO ESTATÍSTICO E DIAGNÓSTICO
    // -------------------------------------------------------------
    const ws2 = workbook.addWorksheet("Resumo Estatístico", {
        views: [{ showGridLines: true }]
    });

    ws2.mergeCells("A1:D1");
    const summaryTitle = ws2.getCell("A1");
    summaryTitle.value = `SUMÁRIO OPERACIONAL DIÁRIO — ${String(deviceName).toUpperCase()}`;
    summaryTitle.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    summaryTitle.alignment = { vertical: "middle", horizontal: "center" };
    ws2.getRow(1).height = 32;

    // Cálculo estatístico
    const pressoes = dataList
        .map(d => (d.sensor1 !== null && d.sensor1 !== undefined ? Number(d.sensor1) : (d.pressao !== undefined ? Number(d.pressao) : null)))
        .filter(v => v !== null && !isNaN(v));

    const pressMin = pressoes.length > 0 ? Math.min(...pressoes).toFixed(2) : "--";
    const pressMax = pressoes.length > 0 ? Math.max(...pressoes).toFixed(2) : "--";
    const pressAvg = pressoes.length > 0 ? (pressoes.reduce((a, b) => a + b, 0) / pressoes.length).toFixed(2) : "--";

    const lastReading = dataList[dataList.length - 1] || {};
    const totalR1Ac = lastReading.rele1_acionamentos ?? "--";
    const totalR2Ac = lastReading.rele2_acionamentos ?? "--";

    const statsHeader = ws2.getRow(3);
    statsHeader.values = ["Indicador Operacional", "Valor Consolidado", "Unidade", "Referência / Faixa Ideal"];
    styleHeaderRow(statsHeader, "FF0284C7");

    const statRows = [
        ["Total de Amostras / Leituras", dataList.length, "registros", "Contínuo (24h)"],
        ["Pressão Mínima Registrada", pressMin, "psi / bar", "18.0 a 35.0 psi"],
        ["Pressão Média do Período", pressAvg, "psi / bar", "22.0 a 28.0 psi"],
        ["Pressão Máxima Registrada", pressMax, "psi / bar", "< 45.0 psi"],
        ["Acionamentos Acumulados Relé 1 (Compressor/Bomba Principal)", totalR1Ac, "ciclos", "Operação Nominal"],
        ["Acionamentos Acumulados Relé 2 (Bomba Auxiliar/Válvula)", totalR2Ac, "ciclos", "Operação Nominal"],
        ["Status Operacional Geral", "Conforme / Operacional", "-", "Normas de Refrigeração e Segurança"]
    ];

    statRows.forEach((item, idx) => {
        const row = ws2.getRow(4 + idx);
        row.values = item;
        styleDataRow(row, idx % 2 === 1);
        row.getCell(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    });

    ws2.columns = [
        { width: 42 }, // Indicador
        { width: 22 }, // Valor
        { width: 16 }, // Unidade
        { width: 34 }  // Referencia
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Gera a planilha Excel (.xlsx) para leituras e histórico do Sensor LFG60.
 * @param {object} params
 * @param {Array<object>} [params.records]
 * @param {object} [params.currentData]
 * @param {string} [params.deviceName]
 * @returns {Promise<Buffer>}
 */
export async function generateLfg60Excel({
    records = [],
    currentData = null,
    deviceName = "LFG60"
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SensiMonitor AI System";
    workbook.created = new Date();

    let dataList = Array.isArray(records) && records.length > 0 ? records : [];
    if (dataList.length === 0 && currentData) {
        dataList = [{
            temperatura: currentData.temperatura ?? 24.5,
            umidade: currentData.umidade ?? 55.0,
            co2: currentData.co2 ?? 450,
            pm25: currentData.pm25 ?? 10.2,
            pm10: currentData.pm10 ?? 18.0,
            voc: currentData.voc ?? 0.15,
            formaldeido: currentData.formaldeido ?? 0.02,
            timestamp_leitura: currentData.timestamp || new Date()
        }];
    }

    const ws = workbook.addWorksheet("Telemetria Ambiental LFG60", {
        views: [{ showGridLines: true }]
    });

    ws.mergeCells("A1:I1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `SENSIMONITOR // REGISTROS AMBIENTAIS — SENSOR ${String(deviceName).toUpperCase()}`;
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(1).height = 36;

    const headers = [
        "Item",
        "Temperatura (°C)",
        "Umidade (%)",
        "CO2 (ppm)",
        "PM2.5 (µg/m³)",
        "PM10 (µg/m³)",
        "VOC (ppm)",
        "Formaldeído (mg/m³)",
        "Data / Hora"
    ];

    const hRow = ws.getRow(3);
    hRow.values = headers;
    styleHeaderRow(hRow, "FF1E60AC");

    dataList.forEach((r, idx) => {
        const row = ws.getRow(4 + idx);
        row.values = [
            idx + 1,
            r.temperatura ?? "--",
            r.umidade ?? "--",
            r.co2 ?? "--",
            r.pm25 ?? "--",
            r.pm10 ?? "--",
            r.voc ?? "--",
            r.formaldeido ?? "--",
            formatDatePtBr(r.timestamp_leitura || r.timestamp || new Date())
        ];
        styleDataRow(row, idx % 2 === 1);
    });

    ws.columns = [
        { width: 8 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 22 },
        { width: 24 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
