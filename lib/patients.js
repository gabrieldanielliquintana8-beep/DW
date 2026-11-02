export const MANIFESTACOES = [
  { key: "Hepático", icon: "🫀", label: "Hepático", color: "#f59e0b",
    fields: ["Manifestacao_hepatica", "Grau_acometimento_hepatico", "Manifestacao_hepatica_principal_atual", "Descricao_manifestacoes_hepaticas_idade_inicio"] },
  { key: "Neurológico", icon: "🧠", label: "Neurológico", color: "#8b5cf6",
    fields: ["Manifestacao_neurologica", "Grau_acometimento_neurologico", "Manifestacao_neurologica_principal_atual", "Descricao_manifestacoes_neurologicas_idade_inicio"] },
  { key: "Oftalmológico", icon: "👁️", label: "Oftalmológico", color: "#3b82f6",
    fields: ["Manifestacao_oftalmologica", "Aneis_Kayser_Fleischer", "Outras_manifestacoes_oftalmologicas"] },
  { key: "Psiquiátrico", icon: "🧘", label: "Psiquiátrico", color: "#ec4899",
    fields: ["Manifestacao_psiquiatrica", "Manifestacao_psiquiatrica_principal_atual", "Descricao_manifestacoes_psiquiatricas_idade_inicio"] },
  { key: "Renal", icon: "🫘", label: "Renal", color: "#14b8a6",
    fields: ["Manifestacao_renal", "Alteracao_funcao_renal"] },
  { key: "Hematológico", icon: "🩸", label: "Hematológico", color: "#ef4444",
    fields: ["Manifestacao_hematologica"] },
  { key: "Ósseo", icon: "🦴", label: "Ósseo", color: "#a16207",
    fields: ["Queixas_osteomusculares", "Alteracoes_identificadas_osteomuscular"] },
];

const KEYWORDS = {
  "Hepático": "hepat", "Neurológico": "neurol", "Oftalmológico": "oftalm",
  "Psiquiátrico": "psiqui", "Renal": "renal", "Hematológico": "hemat", "Ósseo": "osse",
};

const NEGATIVOS = new Set([
  "não", "nao", "no", "ausente", "negativo", "negativa", "neg",
  "-", "n", "false", "0", "sem", "n/a", "nega", "não tem",
]);

function normalizar(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function temPositivo(value) {
  if (value === null || value === undefined) return false;
  const v = normalizar(value);
  if (!v) return false;
  return !NEGATIVOS.has(v);
}

export function temManifestacao(patient, categoria) {
  for (const field of categoria.fields) {
    if (temPositivo(patient.values[`${categoria.key}||${field}`])) return true;
  }
  const principal = normalizar(patient.values["Manifestação Principal||Manifestacao_principal_atual"]);
  const kw = KEYWORDS[categoria.key];
  if (kw && principal.includes(kw)) return true;
  return false;
}

export const TOPIC_ICONS = {
  "POL": "🆔", "Demograficos": "👤", "Antropometria": "📏",
  "Informações Perinatais": "🤰", "Desenvolvimento": "🧒", "História Familiar": "👨‍👩‍👧",
  "Genotipagem": "🧬", "Escore de Leipzeig": "📊",
  "Manifestação incial / Exames iniciais": "🩺", "Manifestação Principal": "⚕️",
  "Hepático": "🫀", "Neurológico": "🧠", "Oftalmológico": "👁️", "Psiquiátrico": "🧘",
  "Renal": "🫘", "Hematológico": "🩸", "Reprodutivo": "🌸", "Tratamento": "💊",
  "Ósseo": "🦴", "Comorbidades Prévias": "📋", "Comorbidades atuais": "🗂️",
  "Consultas Atuais": "📅",
};

export function humanizarSubtopico(s) {
  return String(s || "").replace(/_/g, " ").trim();
}

export function limparTexto(value) {
  if (!value) return "";
  return String(value).replace(/<br\s*\/?>/gi, "\n").replace(/\r\n/g, "\n").trim();
}

// ---------- Configuração de campo (dropdown vs texto vs textarea) ----------

const DROPDOWN_FIELDS = {
  "Demograficos||Sexo": ["M", "F"],
  "História Familiar||Consanguinidade_parental": ["Sim", "Não"],
  "Desenvolvimento||Atraso_marcos_motores": ["Sim", "Não"],
  "Desenvolvimento||Atraso_desenvolvimento_global": ["Sim", "Não"],
  "Reprodutivo||Ja_gestou": ["Sim", "Não"],
  "Reprodutivo||Desejo_reprodutivo": ["Sim", "Não"],
  "Tratamento||Restricao_alimentar_cobre": ["Sim", "Não"],
  "Tratamento||Aderencia_restricao": ["Sim", "Não", "Parcial"],
  "Tratamento||Uso_quelantes_cobre": ["Sim", "Não"],
  "Tratamento||Regressao_sintomas": ["Sim", "Não"],
  "Tratamento||Sintomas_regrediram": ["Sim", "Não"],
  "Tratamento||Reavaliacao_tecidual_pos_tratamento": ["Sim", "Não"],
  "Oftalmológico||Aneis_Kayser_Fleischer": ["Presente", "Ausente"],
};

const LONG_TEXT_PATTERNS = [
  /^Descricao/i, /^Descrição/i, /^Laudo/i, /^Resultado/i,
  /^Outras_/i, /^Outros_/i, /^Exames_/i, /_descricao$/i, /_descrição$/i,
  /^Motivo_/i, /^Historia_/i, /^História_/i, /^Farmacos_/i, /^Fármacos_/i,
  /^Dosagem_/i, /^Comorbidades_/i, /_atual$/i, /_principal_atual$/i,
  /^Descricao_/i, /^Descrição_/i, /^Outras_manifestacoes/i, /^Outras_manifestações/i,
];

export function getFieldConfig(topic, subtopic, currentValue) {
  const key = `${topic}||${subtopic}`;
  const options = DROPDOWN_FIELDS[key];
  if (options) {
    const opts = [...options];
    if (currentValue && !opts.includes(currentValue)) opts.unshift(currentValue);
    if (!opts.includes("")) opts.unshift("");
    return { type: "select", options: opts };
  }
  if (LONG_TEXT_PATTERNS.some((p) => p.test(subtopic))) {
    return { type: "textarea" };
  }
  if (currentValue && currentValue.length > 60) {
    return { type: "textarea" };
  }
  return { type: "text" };
}
