import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SEARCH_URL = "https://html.duckduckgo.com/html/";
const DEFAULT_AI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_AI_MODEL = "gpt-4o-mini";
const AI_PRESETS = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-flash",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-20b",
  },
};
const MAX_QUESTION_LENGTH = 600;
const MAX_SEARCH_RESULTS = 5;
const MAX_CONTEXT_LENGTH = 7000;
const REQUEST_TIMEOUT_MS = 15_000;
const MIN_INTERVAL_MS = 4_000;
const STYLES = {
  tranquilo: "sereno, paciente y fácil de entender",
  agresivo: "firme, directo y contundente; no insultes, amenaces ni ataques a personas o grupos",
  insultos: "irreverente y vulgar; puedes usar palabrotas e insultos genéricos dirigidos a ideas, errores o situaciones, pero no amenazas, insultos discriminatorios, slurs ni acoso contra una persona identificable",
  formal: "profesional, estructurado y preciso",
  divertido: "ameno, ingenioso y ligero sin perder exactitud",
  sarcastico: "sarcástico con moderación, sin humillar ni insultar",
  breve: "muy conciso, en pocas frases y sin rodeos",
  amable: "cálido, cercano y respetuoso",
};
const LANGUAGES = {
  "es-ES": { name: "español de España", aliases: ["es", "es-es", "españa", "espana"] },
  "es-MX": { name: "español de México", aliases: ["es-mx", "méxico", "mexico"] },
  "es-AR": { name: "español de Argentina", aliases: ["es-ar", "argentina"] },
  "es-CO": { name: "español de Colombia", aliases: ["es-co", "colombia"] },
  "en-US": { name: "inglés de Estados Unidos", aliases: ["en", "en-us", "eeuu", "usa"] },
  "en-GB": { name: "inglés del Reino Unido", aliases: ["en-gb", "uk", "reino unido"] },
  "it-IT": { name: "italiano de Italia", aliases: ["it", "it-it", "italia"] },
  "pt-BR": { name: "portugués de Brasil", aliases: ["pt", "pt-br", "brasil"] },
  "pt-PT": { name: "portugués de Portugal", aliases: ["pt-pt", "portugal"] },
  "fr-FR": { name: "francés de Francia", aliases: ["fr", "fr-fr", "francia"] },
  "de-DE": { name: "alemán de Alemania", aliases: ["de", "de-de", "alemania"] },
};
let requestInFlight = false;
let lastRequestAt = 0;
let manualStyle = null;
let manualLanguage = null;

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function timeoutSignal(ms) {
  return AbortSignal.timeout(envNumber("AI_TIMEOUT_MS", ms));
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function searchResultsFromHtml(html) {
  const results = [];
  const pattern = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    let url = decodeURIComponent(match[1].replace(/&amp;/g, "&"));
    if (url.startsWith("//duckduckgo.com/l/?")) {
      try {
        url = new URL(`https:${url}`).searchParams.get("uddg") || url;
      } catch {
        // Se descarta más abajo si el enlace no queda en HTTP(S).
      }
    }
    if (!/^https?:\/\//i.test(url)) continue;
    results.push({ title: cleanText(match[2]), url, snippet: cleanText(match[3]) });
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }
  return results;
}

async function duckDuckGoSearch(question) {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(question)}`;
  const response = await fetch(url, {
    headers: { "user-agent": "InfoPlayerLeft/1.0 (web search)" },
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`búsqueda web HTTP ${response.status}`);
  return searchResultsFromHtml(await response.text());
}

async function webSearch(question) {
  try {
    return await duckDuckGoSearch(question);
  } catch (error) {
    console.error("DuckDuckGo no disponible:", error?.message || error);
    return [];
  }
}

function aiConfig() {
  const key = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  const provider = (process.env.AI_PROVIDER || "openai").trim().toLowerCase();
  const preset = AI_PRESETS[provider];
  const url = (process.env.AI_API_URL || preset?.url || DEFAULT_AI_URL).trim();
  const model = (process.env.AI_MODEL || preset?.model || DEFAULT_AI_MODEL).trim();
  return { key, url, model };
}

async function askModel(question, style, sources, includeSources) {
  const { key, url, model } = aiConfig();
  if (!key) return null;
  const context = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`).join("\n\n")
    : "No se encontraron resultados web verificables.";
  const sourceInstruction = includeSources
    ? "Incluye las fuentes como [1], [2] al final y usa los enlaces proporcionados."
    : "Responde solo con texto; no incluyas URLs, enlaces ni una lista de fuentes salvo que la persona los pida explícitamente.";
  const language = manualLanguage || (process.env.AI_LANGUAGE || "es").trim();
  const languageInfo = LANGUAGES[language] || LANGUAGES["es-ES"];
  const languageName = languageInfo.name;
  const locale = LANGUAGES[language] ? language : "es-ES";
  const dateContext = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date());
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: `Responde en ${languageName} con criterio, de forma clara y útil. Fecha actual del sistema: ${dateContext}. Si preguntan por hoy, ayer o mañana, usa esa fecha y no digas que no está disponible. Usa el contexto web para datos actuales; separa hechos, inferencias y dudas, y no inventes información. Usa este tono: ${style}. Puedes usar humor adulto, doble sentido y palabrotas entre adultos cuando el contexto sea amistoso, pero no sexualices menores, no promuevas coerción ni generes amenazas, insultos discriminatorios, slurs, doxxing o acoso dirigido a una persona identificable. ${sourceInstruction}`,
        },
        { role: "user", content: `Pregunta: ${question}\n\nContexto web:\n${context.slice(0, MAX_CONTEXT_LENGTH)}` },
      ],
    }),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`API de IA HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "La IA no devolvió una respuesta.";
}

export function aiConfigured() {
  return Boolean(aiConfig().key);
}

function configuredStyle() {
  const defaultStyle = (process.env.AI_DEFAULT_STYLE || "insultos").toLowerCase();
  const styleName = STYLES[defaultStyle] ? defaultStyle : "insultos";
  return { styleName, style: STYLES[styleName] };
}

export function cmdTono(value) {
  const requested = String(value || "").trim().toLowerCase();
  if (!requested || requested === "lista") {
    return `Tonos: ${Object.keys(STYLES).join(", ")}\nUso: !tono <estilo>`;
  }
  if (!STYLES[requested]) {
    return `Tono no válido. Usa: ${Object.keys(STYLES).join(", ")}`;
  }

  manualStyle = requested;
  process.env.AI_DEFAULT_STYLE = requested;
  const file = process.env.ENV_FILE || ".env";
  try {
    if (existsSync(file)) {
      let content = readFileSync(file, "utf8");
      const pattern = /^AI_DEFAULT_STYLE\s*=.*$/m;
      if (pattern.test(content)) content = content.replace(pattern, `AI_DEFAULT_STYLE=${requested}`);
      else content += `\nAI_DEFAULT_STYLE=${requested}\n`;
      writeFileSync(file, content, { mode: 0o600 });
    }
  } catch (error) {
    console.error("No se pudo guardar el tono en .env:", error?.message || error);
  }
  return `Tono cambiado a: ${requested}`;
}

export function cmdIdioma(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input || input === "lista") {
    return `Idiomas: ${Object.entries(LANGUAGES).map(([code, info]) => `${code} (${info.name})`).join(", ")}\nUso: !idioma <país o código>`;
  }
  const requested = Object.entries(LANGUAGES).find(([code, info]) => code.toLowerCase() === input || info.aliases.includes(input))?.[0];
  if (!requested) {
    return `Idioma no válido o país no reconocido. Usa: ${Object.keys(LANGUAGES).join(", ")}`;
  }
  manualLanguage = requested;
  process.env.AI_LANGUAGE = requested;
  const file = process.env.ENV_FILE || ".env";
  try {
    if (existsSync(file)) {
      let content = readFileSync(file, "utf8");
      const pattern = /^AI_LANGUAGE\s*=.*$/m;
      if (pattern.test(content)) content = content.replace(pattern, `AI_LANGUAGE=${requested}`);
      else content += `\nAI_LANGUAGE=${requested}\n`;
      writeFileSync(file, content, { mode: 0o600 });
    }
  } catch (error) {
    console.error("No se pudo guardar el idioma en .env:", error?.message || error);
  }
  return `Idioma cambiado a: ${LANGUAGES[requested].name}`;
}

export function detectStyle(question) {
  const text = String(question || "").trim();
  if (!text) return null;
  if (/\b(breve|rápido|rapido|resumen|resumido|en una frase|sin explicar mucho)\b/i.test(text)) return "breve";
  if (/\b(jaja|jeje|lol|😂|🤣|broma|chiste|divertido|gracioso)\b/i.test(text)) return "divertido";
  if (/\b(sarcasmo|sarcástico|sarcastico|irónico|ironico|claro, cómo no|ya veo)\b/i.test(text)) return "sarcastico";
  if (/\b(por favor|podría|podria|usted|solicito|explique formalmente|informe)\b/i.test(text)) return "formal";
  if (/\b(tono de insulto|tono insulto|insulta|insulto|insultos|vulgar|palabrotas)\b/i.test(text)) return "insultos";
  if (/\b(mierda|joder|coño|cabrón|cabron|pendejo|imbécil|imbecil|idiota|puto|carajo)\b/i.test(text)) return "insultos";
  if (/\b(ahora mismo|contesta ya|deja de|sin rodeos|directo|espabila|rápido)\b/i.test(text) || /!{2,}|\?{2,}/.test(text)) return "agresivo";
  if (/\b(gracias|porfa|ayuda|amigo|amiga|hola|buenas)\b/i.test(text)) return "amable";
  return null;
}

function requestsSources(question) {
  return /\b(fuente|fuentes|enlace|enlaces|link|links|url|urls|referencia|referencias|origen|orígenes|cita|citas)\b/i.test(question);
}

export async function cmdIA(question) {
  const query = String(question || "").trim();
  const configured = configuredStyle();
  const styleName = manualStyle || detectStyle(query) || configured.styleName;
  const style = STYLES[styleName];
  const includeSources = requestsSources(query);
  if (!query) return "Uso: `!ai <pregunta>`\nEjemplo: `!ai ¿qué novedades hay hoy sobre Left 4 Dead 2?`";
  if (query.length > MAX_QUESTION_LENGTH) return `La pregunta no puede superar ${MAX_QUESTION_LENGTH} caracteres.`;
  if (!aiConfigured()) {
    return "La IA no está configurada. Añade `AI_API_KEY` (o `OPENAI_API_KEY`) en el entorno y vuelve a intentarlo.";
  }
  if (requestInFlight) return "Ya hay una consulta de IA en curso. Intenta de nuevo en unos segundos.";
  const now = Date.now();
  const interval = envNumber("AI_MIN_INTERVAL_MS", MIN_INTERVAL_MS);
  if (now - lastRequestAt < interval) return "Espera unos segundos antes de hacer otra consulta de IA.";

  requestInFlight = true;
  lastRequestAt = now;
  try {
    let sources = [];
    try {
      sources = await webSearch(query);
    } catch (error) {
      // La búsqueda aporta contexto, pero no debe impedir usar la IA cuando
      // DuckDuckGo está lento, bloqueado o no disponible en Termux.
      console.error("Búsqueda web no disponible; se continuará sin fuentes:", error?.message || error);
    }
    const answer = await askModel(query, style, sources, includeSources);
    if (!answer) return "No se pudo consultar la IA.";
    const sourceLines = includeSources && sources.length
      ? `\n\nFuentes:\n${sources.map((s, i) => `[${i + 1}] ${s.url}`).join("\n")}`
      : "";
    return `_${styleName}_\n${answer}${sourceLines}`.slice(0, 3900);
  } catch (error) {
    console.error("Error en !ai:", error?.message || error);
    return "No pude consultar Internet o la IA ahora. Intenta de nuevo más tarde.";
  } finally {
    requestInFlight = false;
  }
}
