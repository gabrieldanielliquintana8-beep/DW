import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function colLetter(n) {
  let s = "";
  n += 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const METADATA_COUNT = 4;

function buildColumns(topicRow, subtopicRow) {
  const filled = [];
  let current = "";
  for (let i = 0; i < subtopicRow.length; i++) {
    const t = (topicRow[i] || "").trim();
    if (t) current = t;
    filled.push(current);
  }
  const columns = [];
  for (let i = 0; i < subtopicRow.length; i++) {
    const topic = filled[i] || "";
    const subtopic = (subtopicRow[i] || "").trim();
    if (!topic && !subtopic) continue;
    columns.push({ index: i, topic, subtopic });
  }
  return columns;
}

export async function readTable() {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${process.env.SHEET_NAME}!A:ZZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const raw = res.data.values || [];
  if (raw.length < 3) return { topics: [], columns: [], patients: [] };

  const topicRow = raw[0];
  const subtopicRow = raw[1];
  const dataRows = raw.slice(2);

  const columns = buildColumns(topicRow, subtopicRow).filter(
    (c) => c.index >= METADATA_COUNT
  );

  const topics = [];
  const seen = new Set();
  for (const c of columns) {
    if (c.topic && !seen.has(c.topic)) {
      topics.push(c.topic);
      seen.add(c.topic);
    }
  }

  const patients = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const values = {};
    for (const c of columns) {
      values[`${c.topic}||${c.subtopic}`] = (row[c.index] ?? "").toString();
    }
    const id = (values["POL||ID"] || "").trim();
    if (!id) continue;
    patients.push({ id, values, spreadsheetRow: 3 + i });
  }

  return { topics, columns, patients };
}

async function ensureLogSheet(sheets) {
  try {
    const info = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });
    const titles = (info.data.sheets || []).map((s) => s.properties.title);
    if (titles.includes("Log")) return true;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "Log" } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Log!A1:G1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Timestamp",
            "Email",
            "PatientID",
            "Topic",
            "Subtopic",
            "OldValue",
            "NewValue",
          ],
        ],
      },
    });
    return true;
  } catch (err) {
    console.warn("Não foi possível criar/verificar aba Log:", err.message);
    return false;
  }
}

export async function updatePatientEdits({
  patientId,
  spreadsheetRow,
  edits,
  userEmail,
}) {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });

  // Re-lê o cabeçalho para validar e recalcular índices no servidor (segurança)
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${process.env.SHEET_NAME}!A1:ZZ2`,
  });
  const [topicRow, subtopicRow] = headerRes.data.values || [[], []];
  const columns = buildColumns(topicRow, subtopicRow);
  const columnMap = new Map();
  for (const c of columns) {
    columnMap.set(`${c.topic}||${c.subtopic}`, c.index);
  }

  const BLOCKED = new Set(["POL||ID"]);

  const validEdits = [];
  for (const e of edits) {
    const key = `${e.topic}||${e.subtopic}`;
    if (BLOCKED.has(key)) {
      throw new Error(`Campo bloqueado: ${key}`);
    }
    const idx = columnMap.get(key);
    if (idx === undefined || idx < METADATA_COUNT) {
      throw new Error(`Campo desconhecido: ${key}`);
    }
    validEdits.push({
      topic: e.topic,
      subtopic: e.subtopic,
      columnIndex: idx,
      oldValue: e.oldValue ?? "",
      newValue: e.newValue ?? "",
    });
  }

  if (validEdits.length === 0) {
    return { updated: 0 };
  }

  // Batch update
  const data = validEdits.map((e) => ({
    range: `${process.env.SHEET_NAME}!${colLetter(e.columnIndex)}${spreadsheetRow}`,
    values: [[e.newValue]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });

  // Log (best-effort)
  try {
    const ok = await ensureLogSheet(sheets);
    if (ok) {
      const ts = new Date().toISOString();
      const logRows = validEdits.map((e) => [
        ts,
        userEmail,
        patientId,
        e.topic,
        e.subtopic,
        e.oldValue,
        e.newValue,
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "Log!A:G",
        valueInputOption: "RAW",
        requestBody: { values: logRows },
      });
    }
  } catch (logErr) {
    console.warn("Log falhou:", logErr.message);
  }

  return { updated: validEdits.length };
}
