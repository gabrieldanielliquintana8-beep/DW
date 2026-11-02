export const MANIFESTACOES = [
  {
    key: "Hepático",
    icon: "🫀",
    label: "Hepático",
    color: "#f59e0b",
    fields: [
      "Manifestacao_hepatica",
      "Grau_acometimento_hepatico",
      "Manifestacao_hepatica_principal_atual",
      "Descricao_manifestacoes_hepaticas_idade_inicio",
    ],
  },
  {
    key: "Neurológico",
    icon: "🧠",
    label: "Neurológico",
    color: "#8b5cf6",
    fields: [
      "Manifestacao_neurologica",
      "Grau_acometimento_neurologico",
      "Manifestacao_neurologica_principal_atual",
      "Descricao_manifestacoes_neurologicas_idade_inicio",
    ],
  },
  {
    key: "Oftalmológico",
    icon: "👁️",
    label: "Oftalmológico",
    color: "#3b82f6",
    fields: [
      "Manifestacao_oftalmologica",
      "Aneis_Kayser_Fleischer",
      "Outras_manifestacoes_oftalmologicas",
    ],
  },
  {
    key: "Psiquiátrico",
    icon: "🧘",
    label: "Psiquiátrico",
    color: "#ec4899",
    fields: [
      "Manifestacao_psiquiatrica",
      "Manifestacao_psiquiatrica_principal_atual",
      "Descricao_manifestacoes_psiquiatricas_idade_inicio",
    ],
  },
  {
    key: "Renal",
    icon: "🫘",
    label: "Renal",
    color: "#14b8a6",
    fields: ["Manifestacao_renal", "Alteracao_funcao_renal"],
  },
  {
    key: "Hematológico",
    icon: "🩸",
    label: "Hematológico",
    color: "#ef4444",
    fields: ["Manifestacao_hematologica"],
  },
  {
    key: "Ósseo",
    icon: "🦴",
    label: "Ósseo",
    color: "#a16207",
    fields: ["Queixas_osteomusculares", "Alteracoes_identificadas_osteomuscular"],
  },
];

// Palavras-chave para detectar manifestação na coluna "Manifestacao_principal_atual"
// (que costuma ter a forma feminina: "Hepática", "Neurológica", etc.)
const KEYWORDS = {
  "Hepático": "hepat",
  "Neurológico": "neurol",
  "Oftalmológico": "oftalm",
  "Psiquiátrico": "psiqui",
  "Renal": "renal",
  "Hematológico": "hemat",
  "Ósseo": "osse",
};

const NEGATIVOS = new Set([
  "não", "nao", "no", "ausente", "negativo", "negativa", "neg",
  "-", "n", "false", "0", "sem", "n/a", "nega", "não tem",
]);

function normalizar(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function temPositivo(value) {
  if (value === null || value === undefined) return false;
  const v = normalizar(value);
  if (!v) return false;
  return !NEGATIVOS.has(v);
}

export function temManifestacao(patient, categoria) {
  // 1. Campos explícitos da categoria
  for (const field of categoria.fields) {
    const key = `${categoria.key}||${field}`;
    if (temPositivo(patient.values[key])) return true;
  }
  // 2. Fallback: coluna "Manifestacao_principal_atual" mencionando a categoria
  const principal = normalizar(
    patient.values["Manifestação Principal||Manifestacao_principal_atual"]
  );
  const kw = KEYWORDS[categoria.key];
  if (kw && principal.includes(kw)) return true;
  return false;
}

export const TOPIC_ICONS = {
  "POL": "🆔",
  "Demograficos": "👤",
  "Antropometria": "📏",
  "Informações Perinatais": "🤰",
  "Desenvolvimento": "🧒",
  "História Familiar": "👨‍👩‍👧",
  "Genotipagem": "🧬",
  "Escore de Leipzeig": "📊",
  "Manifestação incial / Exames iniciais": "🩺",
  "Manifestação Principal": "⚕️",
  "Hepático": "🫀",
  "Neurológico": "🧠",
  "Oftalmológico": "👁️",
  "Psiquiátrico": "🧘",
  "Renal": "🫘",
  "Hematológico": "🩸",
  "Reprodutivo": "🌸",
  "Tratamento": "💊",
  "Ósseo": "🦴",
  "Comorbidades Prévias": "📋",
  "Comorbidades atuais": "🗂️",
  "Consultas Atuais": "📅",
};

export function humanizarSubtopico(s) {
  return String(s || "").replace(/_/g, " ").trim();
}

export function limparTexto(value) {
  if (!value) return "";
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}
