import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// Colunas A-D (Timestamp, Nome, Email, Mensagem) são metadados da submissão e
// não fazem parte do prontuário — são puladas.
const METADATA_COUNT = 4;

export async function readTable() {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${process.env.SHEET_NAME}!A:ZZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const raw = res.data.values || [];
  if (raw.length < 3) {
    return { topics: [], columns: [], patients: [] };
  }

  const topicRow = raw[0];
  const subtopicRow = raw[1];
  const dataRows = raw.slice(2);

  // Forward-fill: células vazias herdam o tópico anterior
  const filledTopics = [];
  let current = "";
  for (let i = 0; i < subtopicRow.length; i++) {
    const t = (topicRow[i] || "").trim();
    if (t) current = t;
    filledTopics.push(current);
  }

  // Monta colunas (a partir da coluna E)
  const columns = [];
  for (let i = METADATA_COUNT; i < subtopicRow.length; i++) {
    const topic = filledTopics[i] || "";
    const subtopic = (subtopicRow[i] || "").trim();
    if (!topic && !subtopic) continue;
    columns.push({ index: i, topic, subtopic });
  }

  // Ordem única dos tópicos
  const topics = [];
  const seen = new Set();
  for (const c of columns) {
    if (c.topic && !seen.has(c.topic)) {
      topics.push(c.topic);
      seen.add(c.topic);
    }
  }

  // Pacientes (linhas com ID preenchido)
  const patients = [];
  for (const row of dataRows) {
    const values = {};
    for (const c of columns) {
      const key = `${c.topic}||${c.subtopic}`;
      values[key] = (row[c.index] ?? "").toString();
    }
    const id = (values["POL||ID"] || "").trim();
    if (!id) continue;
    patients.push({ id, values });
  }

  return { topics, columns, patients };
}
