import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SEARCH_URL = "https://html.duckduckgo.com/html/";
const DEFAULT_AI_URL = "http://127.0.0.1:8080/v1/chat/completions";
const DEFAULT_AI_MODEL = "local-model";
const AI_PRESETS = {
  local: {
    url: "http://127.0.0.1:8080/v1/chat/completions",
    model: "local-model",
  },
  ollama: {
    url: "http://127.0.0.1:11434/v1/chat/completions",
    model: "gpt-oss:20b",
  },
  llama_cpp: {
    url: "http://127.0.0.1:8080/v1/chat/completions",
    model: "local-model",
  },
  localai: {
    url: "http://127.0.0.1:8081/v1/chat/completions",
    model: "local-model",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-flash",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-20b",
  },
  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small-4-0-26-03",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/auto",
  },
  hermes: {
    url: "http://127.0.0.1:8642/v1/chat/completions",
    model: "hermes-agent",
  },
};
const PROVIDER_ALIASES = { local: "local", llamacpp: "llama_cpp", "llama.cpp": "llama_cpp", llama: "llama_cpp", ollama: "ollama", localai: "localai", gemini: "gemini", google: "gemini", groq: "groq", mistral: "mistral", openrouter: "openrouter", hermes: "hermes", "hermes-agent": "hermes" };
const PROVIDER_KEY_ENV = { local: "AI_LOCAL_API_KEY", ollama: "OLLAMA_API_KEY", llama_cpp: "LLAMA_CPP_API_KEY", localai: "LOCALAI_API_KEY", gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", mistral: "MISTRAL_API_KEY", openrouter: "OPENROUTER_API_KEY", hermes: "HERMES_API_KEY" };
const MAX_QUESTION_LENGTH = 600;
const MAX_SEARCH_RESULTS = 5;
const MAX_CONTEXT_LENGTH = 7000;
const REMOTE_AI_TIMEOUT_MS = 15_000;
const LOCAL_AI_TIMEOUT_MS = 120_000;
const SEARCH_TIMEOUT_MS = 8_000;
const LOCAL_MAX_TOKENS = 256;
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
let memoryLoaded = false;
let memory = {};

const RISK_KEYWORDS = ["suicid", "matarme", "me quiero morir", "no quiero vivir", "lastimarme", "quitarme la vida"];
const VIOLENT_OUTPUT_PATTERNS = [
  /te voy a (?:dar|pegar|meter) un tiro/i,
  /te voy a matar/i,
  /voy a matarte/i,
  /te (?:voy a )?(?:disparar|apuñalar)/i,
  /(?:tiro|disparo|bala) en la cabeza/i,
  /amenaz[ao]/i,
];

function memoryFile() {
  return process.env.AI_MEMORY_FILE || "ai-memory.json";
}

function loadMemory() {
  if (memoryLoaded) return memory;
  memoryLoaded = true;
  try {
    const file = memoryFile();
    if (existsSync(file)) memory = JSON.parse(readFileSync(file, "utf8")) || {};
  } catch {
    memory = {};
  }
  return memory;
}

function saveMemory() {
  try {
    writeFileSync(memoryFile(), JSON.stringify(memory, null, 2), { mode: 0o600 });
  } catch (error) {
    console.error("No se pudo guardar la memoria de IA:", error?.message || error);
  }
}

export function containsRisk(text) {
  const value = String(text || "").toLowerCase();
  return RISK_KEYWORDS.some((keyword) => value.includes(keyword));
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function timeoutSignal(ms) {
  return AbortSignal.timeout(ms);
}

function modelTimeoutMs(provider) {
  if (["local", "ollama", "llama_cpp", "localai"].includes(provider)) {
    return envNumber("AI_LOCAL_TIMEOUT_MS", LOCAL_AI_TIMEOUT_MS);
  }
  return envNumber("AI_TIMEOUT_MS", REMOTE_AI_TIMEOUT_MS);
}

function isTimeoutError(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "");
  return name === "TimeoutError" || name === "AbortError" || /timeout|timed out|aborted/i.test(message);
}

function localFastMode(provider) {
  return ["local", "ollama", "llama_cpp", "localai"].includes(provider) && process.env.AI_LOCAL_FAST !== "false";
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
    headers: { "user-agent": "WhatsAppMediaBot/1.0 (web search)" },
    // La búsqueda aporta contexto, pero no debe demorar una consulta local si
    // DuckDuckGo está lento, bloqueado o no disponible en Termux.
    signal: timeoutSignal(envNumber("AI_SEARCH_TIMEOUT_MS", SEARCH_TIMEOUT_MS)),
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
  const provider = PROVIDER_ALIASES[(process.env.AI_PROVIDER || "local").trim().toLowerCase()] || "local";
  const providerKey = PROVIDER_KEY_ENV[provider];
  const key = (providerKey ? process.env[providerKey] : "")?.trim() || (["local", "ollama", "llama_cpp", "localai"].includes(provider) ? "" : (process.env.AI_API_KEY || "").trim());
  const preset = AI_PRESETS[provider];
  const configuredUrl = provider === "local"
    ? (process.env.AI_LOCAL_URL || process.env.AI_API_URL)
    : provider === "ollama"
      ? (process.env.OLLAMA_URL || process.env.AI_API_URL)
    : provider === "llama_cpp"
      ? (process.env.LLAMA_CPP_URL || process.env.AI_API_URL)
      : provider === "localai"
        ? (process.env.LOCALAI_URL || process.env.AI_API_URL)
        : provider === "hermes"
        ? (process.env.HERMES_URL || process.env.AI_API_URL)
        : process.env.AI_API_URL;
  const url = (configuredUrl || preset?.url || DEFAULT_AI_URL).trim();
  const model = (process.env.AI_MODEL || preset?.model || DEFAULT_AI_MODEL).trim();
  return { key, url, model, provider };
}

function providerKeyStatus(provider) {
  const variable = PROVIDER_KEY_ENV[provider] || "AI_API_KEY";
  const specific = Boolean((process.env[variable] || "").trim());
  const generic = Boolean((process.env.AI_API_KEY || "").trim());
  return { variable, specific, generic };
}

function providerKeyMismatch(provider, key) {
  const value = String(key || "").trim();
  if (value.startsWith("gsk_") && provider !== "groq") return "La clave parece de Groq; usa !proveedor groq o configura la clave del proveedor seleccionado.";
  if (value.startsWith("AIza") && provider !== "gemini") return "La clave parece de Gemini; usa !proveedor gemini o configura la clave del proveedor seleccionado.";
  if (value.startsWith("sk-or-") && provider !== "openrouter") return "La clave parece de OpenRouter; usa !proveedor openrouter o configura la clave del proveedor seleccionado.";
  return null;
}

async function askModel(question, style, sources, includeSources, history = []) {
  const { key, url, model, provider } = aiConfig();
  if (!key && !["local", "ollama", "llama_cpp", "localai"].includes(provider)) return null;
  const fastLocal = localFastMode(provider);
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
  const systemPrompt = fastLocal
    ? `Responde en ${languageName}, claro y útil. Hoy es ${dateContext}. Sé breve y usa este tono: ${style}. No inventes datos. ${sourceInstruction}`
    : `Responde en ${languageName} con criterio, de forma clara y útil. Fecha actual del sistema: ${dateContext}. Si preguntan por hoy, ayer o mañana, usa esa fecha y no digas que no está disponible. Usa el contexto web para datos actuales; separa hechos, inferencias y dudas, y no inventes información. Usa este tono: ${style}. Puedes usar humor adulto, doble sentido y palabrotas entre adultos cuando el contexto sea amistoso, pero no sexualices menores, no promuevas coerción ni generes amenazas, insultos discriminatorios, slurs, doxxing o acoso dirigido a una persona identificable. ${sourceInstruction}`;
  const userPrompt = `Pregunta: ${question}\n\nContexto web:\n${context.slice(0, MAX_CONTEXT_LENGTH)}`;
  const messages = [{ role: "system", content: systemPrompt }, ...history.slice(fastLocal ? -2 : -8), { role: "user", content: userPrompt }];
  const maxTokens = envNumber("AI_MAX_TOKENS", ["local", "ollama", "llama_cpp", "localai"].includes(provider) ? LOCAL_MAX_TOKENS : 700);
  const requestBody = { model, temperature: 0.2, max_tokens: maxTokens, messages };
  const headers = { "content-type": "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;
  if (provider === "hermes" && process.env.HERMES_SESSION_ID?.trim()) {
    headers["x-hermes-session-id"] = process.env.HERMES_SESSION_ID.trim();
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    // La primera respuesta de llama.cpp en Termux puede tardar más que una API
    // remota, especialmente mientras carga el modelo GGUF en memoria.
    signal: timeoutSignal(modelTimeoutMs(provider)),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`API de IA HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await response.json();
  const outputItems = Array.isArray(data?.output) ? data.output.flatMap((item) => item.content || []) : [];
  const responseText = data?.output_text || outputItems
    .filter((item) => item.type === "output_text" || typeof item.text === "string")
    .map((item) => item.text)
    .join("\n") || data?.choices?.[0]?.message?.content;
  return responseText?.trim() || "La IA no devolvió una respuesta.";
}

export function aiConfigured() {
  const config = aiConfig();
  return ["local", "ollama", "llama_cpp", "localai"].includes(config.provider) || Boolean(config.key);
}

function configuredStyle() {
  const defaultStyle = (process.env.AI_DEFAULT_STYLE || "insultos").toLowerCase();
  const styleName = STYLES[defaultStyle] ? defaultStyle : "insultos";
  return { styleName, style: STYLES[styleName] };
}

function nicknameRoast(question) {
  if (!/\b(?:dile|di|manda|escribe)\b[\s\S]*\b(?:apodo|nickname)\b/i.test(question)) return null;
  const match = question.match(/\b(?:apodo|nickname)\s+["“']?([^"”'\n,!?]+?)["”']?\s*$/i);
  const nickname = match?.[1]?.trim();
  if (!nickname || nickname.length > 64) return null;
  return `${nickname}, eres más despistado que un bot sin conexión: mucho apodo y poco juego, campeón 😄`;
}

function sanitizeModelAnswer(answer) {
  const text = String(answer || "").trim();
  if (!VIOLENT_OUTPUT_PATTERNS.some((pattern) => pattern.test(text))) return text;
  return "No hace falta amenazar: puedes decirlo así — *Pide una revisión salarial con datos concretos, logros y una fecha clara para negociar.*";
}

function saveEnvValues(values, errorLabel) {
  const file = process.env.ENV_FILE || ".env";
  try {
    let content = existsSync(file) ? readFileSync(file, "utf8") : "";
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}\\s*=.*$`, "m");
      const line = `${key}=${value}`;
      if (pattern.test(content)) content = content.replace(pattern, line);
      else content += `${content.endsWith("\\n") || !content ? "" : "\\n"}${line}\\n`;
    }
    writeFileSync(file, content, { mode: 0o600 });
  } catch (error) {
    console.error(`No se pudo guardar ${errorLabel} en .env:`, error?.message || error);
  }
}

export function cmdTono(value) {
  const requested = String(value || "").trim().toLowerCase();
  if (!requested || requested === "lista" || requested === "list") {
    return `Tonos: ${Object.keys(STYLES).join(", ")}\nUso: !tono <estilo>`;
  }
  if (!STYLES[requested]) {
    return `Tono no válido. Usa: ${Object.keys(STYLES).join(", ")}`;
  }

  manualStyle = requested;
  process.env.AI_DEFAULT_STYLE = requested;
  saveEnvValues({ AI_DEFAULT_STYLE: requested }, "el tono");
  return `Tono cambiado a: ${requested}`;
}

export function cmdIdioma(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input || input === "lista" || input === "list") {
    return `Idiomas: ${Object.entries(LANGUAGES).map(([code, info]) => `${code} (${info.name})`).join(", ")}\nUso: !idioma <país o código>`;
  }
  const requested = Object.entries(LANGUAGES).find(([code, info]) => code.toLowerCase() === input || info.aliases.includes(input))?.[0];
  if (!requested) {
    return `Idioma no válido o país no reconocido. Usa: ${Object.keys(LANGUAGES).join(", ")}`;
  }
  manualLanguage = requested;
  process.env.AI_LANGUAGE = requested;
  saveEnvValues({ AI_LANGUAGE: requested }, "el idioma");
  return `Idioma cambiado a: ${LANGUAGES[requested].name}`;
}

export function cmdProveedor(value) {
  const input = String(value || "").trim().toLowerCase();
  const available = ["local", "ollama", "llama_cpp", "localai", "gemini", "groq", "mistral", "openrouter", "hermes"];
  if (!input || input === "lista" || input === "list") return `Proveedores: ${available.join(", ")}\nUso: !proveedor <nombre>`;
  const provider = PROVIDER_ALIASES[input];
  if (!provider || !AI_PRESETS[provider]) return `Proveedor no válido. Usa: ${available.join(", ")}`;
  const model = AI_PRESETS[provider].model;
  process.env.AI_PROVIDER = provider;
  process.env.AI_MODEL = model;
  process.env.AI_API_URL = "";
  saveEnvValues({ AI_PROVIDER: provider, AI_MODEL: model, AI_API_URL: "" }, "el proveedor");
  const keyStatus = providerKeyStatus(provider);
  const keyMessage = provider === "local"
    ? "No requiere API key; debe estar activo un servidor llama.cpp en AI_LOCAL_URL."
    : provider === "ollama"
    ? "No requiere API key en local; ejecuta Ollama y descarga un modelo con `ollama pull`."
    : ["llama_cpp", "localai"].includes(provider)
    ? "No requiere API key en local; inicia el servidor compatible con OpenAI en la URL configurada."
    : keyStatus.specific
    ? `Clave detectada en ${keyStatus.variable}.`
    : keyStatus.generic
      ? `Se usará AI_API_KEY; comprueba que sea una clave de ${provider}.`
      : `Falta ${keyStatus.variable} (o AI_API_KEY).`;
  return `Proveedor cambiado a: ${provider}. Modelo: ${model}. ${keyMessage}`;
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

export async function cmdIA(question, chatId = null) {
  const query = String(question || "").trim();
  const configured = configuredStyle();
  const styleName = manualStyle || detectStyle(query) || configured.styleName;
  const style = styleName === "insultos"
    ? `${STYLES[styleName]}; si piden decirle algo a alguien o a un apodo, responde con una burla juguetona y al menos un insulto genérico leve, no con un saludo amable. Manténlo breve y amistoso.`
    : STYLES[styleName];
  const quickRoast = styleName === "insultos" ? nicknameRoast(query) : null;
  const includeSources = requestsSources(query);
  if (!query) return "Uso: `!ai <pregunta>`\nEjemplo: `!ai ¿qué novedades hay hoy?`";
  if (query.length > MAX_QUESTION_LENGTH) return `La pregunta no puede superar ${MAX_QUESTION_LENGTH} caracteres.`;
  if (containsRisk(query)) {
    return "Siento que estés pasando por esto. Si estás en peligro inmediato, contacta a emergencias de tu país o a una persona de confianza ahora mismo. No tienes que afrontar esta situación a solas.";
  }
  if (quickRoast) return `_${styleName}_\n${quickRoast}`;
  if (!aiConfigured()) {
    return "La IA no está configurada. Añade `AI_API_KEY` o la clave específica del proveedor gratuito seleccionado en el entorno y vuelve a intentarlo.";
  }
  const mismatch = providerKeyMismatch(aiConfig().provider, aiConfig().key);
  if (mismatch) return mismatch;
  if (requestInFlight) return "Ya hay una consulta de IA en curso. Intenta de nuevo en unos segundos.";
  const now = Date.now();
  const interval = envNumber("AI_MIN_INTERVAL_MS", MIN_INTERVAL_MS);
  if (now - lastRequestAt < interval) return "Espera unos segundos antes de hacer otra consulta de IA.";

  requestInFlight = true;
  lastRequestAt = now;
  try {
    let sources = [];
    const provider = aiConfig().provider;
    const skipLocalSearch = ["local", "ollama", "llama_cpp", "localai"].includes(provider) && process.env.AI_LOCAL_SKIP_SEARCH !== "false" && !includeSources;
    if (!skipLocalSearch) {
      try {
        sources = await webSearch(query);
      } catch (error) {
        // La búsqueda aporta contexto, pero no debe impedir usar la IA cuando
        // DuckDuckGo está lento, bloqueado o no disponible en Termux.
        console.error("Búsqueda web no disponible; se continuará sin fuentes:", error?.message || error);
      }
    }
    const history = chatId ? (loadMemory()[chatId] || []) : [];
    const answer = sanitizeModelAnswer(await askModel(query, style, sources, includeSources, history));
    if (!answer) return "No se pudo consultar la IA.";
    if (chatId) {
      memory[chatId] = [...history, { role: "user", content: query }, { role: "assistant", content: answer }].slice(-20);
      saveMemory();
    }
    const sourceLines = includeSources && sources.length
      ? `\n\nFuentes:\n${sources.map((s, i) => `[${i + 1}] ${s.url}`).join("\n")}`
      : "";
    return `_${styleName}_\n${answer}${sourceLines}`.slice(0, 3900);
  } catch (error) {
    console.error("Error en !ai:", error?.message || error);
    const config = aiConfig();
    if (["local", "ollama", "llama_cpp", "localai"].includes(config.provider) && isTimeoutError(error)) {
      const seconds = Math.ceil(modelTimeoutMs(config.provider) / 1000);
      const service = { local: "llama.cpp", ollama: "Ollama", llama_cpp: "llama.cpp", localai: "LocalAI" }[config.provider] || "El servidor local";
      return `${service} tardó más de ${seconds} segundos en responder. Comprueba que el servicio siga activo en ${config.url} y aumenta AI_LOCAL_TIMEOUT_MS en .env si el modelo tarda en cargar.`;
    }
    if (config.provider === "ollama" && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(String(error?.message || ""))) {
      return "No pude conectar con Ollama. Instálalo desde https://ollama.com/download, ejecuta `ollama serve` y descarga el modelo configurado con `ollama pull`.";
    }
    if (config.provider === "local" && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(String(error?.message || ""))) {
      return "No pude conectar con llama.cpp. Inicia `llama-server` en 127.0.0.1:8080 y vuelve a intentarlo con `!ai <pregunta>`.";
    }
    if (["llama_cpp", "localai"].includes(config.provider) && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(String(error?.message || ""))) {
      const service = config.provider === "localai" ? "LocalAI" : "llama.cpp";
      return `No pude conectar con ${service}. Comprueba la URL configurada y que el servidor esté iniciado.`;
    }
    const detail = String(error?.message || "error desconocido")
      .replace(/(?:sk-|gsk_|AIza|sk-or-v1-)[A-Za-z0-9_\-]+/g, "[clave oculta]")
      .slice(0, 220);
    return `No pude consultar Internet o la IA ahora. Detalle: ${detail}`;
  } finally {
    requestInFlight = false;
  }
}
