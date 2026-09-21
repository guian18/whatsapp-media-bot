const EIGHT_BALL = [
  "Sí, todo apunta a que sí.",
  "No parece probable.",
  "Las señales son confusas; inténtalo más tarde.",
  "Definitivamente sí.",
  "Definitivamente no.",
  "Pregunta de nuevo cuando tengas más contexto.",
];

const TRUTH = [
  "¿Qué meta te gustaría cumplir este año?",
  "¿Cuál es una afición que poca gente conoce de ti?",
  "¿Qué videojuego volverías a jugar desde cero?",
  "¿Qué habilidad te gustaría aprender?",
];

const DARE = [
  "Escribe una recomendación de Left 4 Dead 2 en una sola frase.",
  "Describe tu mapa favorito usando solo tres palabras.",
  "Envía un cumplido sincero a alguien del grupo.",
  "Inventa un nombre de superviviente para una partida.",
];

function pick(values, random = Math.random) {
  return values[Math.floor(random() * values.length)];
}

export function dado(input = "") {
  const sides = Number.parseInt(input.trim() || "6", 10);
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) {
    return "Uso: `!dado [caras]` (entre 2 y 1000).";
  }
  return `🎲 Resultado: ${1 + Math.floor(Math.random() * sides)} / ${sides}`;
}

export function moneda() {
  return `🪙 Cayó: ${Math.random() < 0.5 ? "cara" : "cruz"}.`;
}

export function ochoBall(question = "") {
  if (!question.trim()) return "Uso: `!8ball <pregunta>`";
  return `🔮 ${pick(EIGHT_BALL)}`;
}

export function verdadReto(kind = "") {
  const normalized = kind.trim().toLowerCase();
  if (!normalized || normalized === "lista") {
    return "Uso: `!verdad` o `!reto`";
  }
  if (normalized === "verdad") return `🟢 Verdad: ${pick(TRUTH)}`;
  if (normalized === "reto") return `🟠 Reto: ${pick(DARE)}`;
  return "Elige `!verdad` o `!reto`.";
}

export function pareja(input = "") {
  const names = input.split(/,|\by\b/i).map((item) => item.trim()).filter(Boolean);
  if (names.length < 2) return "Uso: `!pareja <nombre 1> y <nombre 2>`";
  const [first, second] = names;
  const score = Math.floor(Math.random() * 101);
  return `💞 Compatibilidad de ${first} y ${second}: ${score}%`;
}

function safeExpression(value) {
  return /^\s*[0-9+\-*/().%\s]+\s*$/.test(value) && value.length <= 80;
}

export function calcular(expression = "") {
  const value = expression.trim();
  if (!value || !safeExpression(value)) {
    return "Uso: `!calcular <expresión>` (solo números y + - * / % ( )).";
  }
  try {
    // La expresión ya fue limitada a caracteres aritméticos; no acepta nombres ni llamadas.
    const result = Function(`"use strict"; return (${value})`)();
    if (!Number.isFinite(result)) throw new Error("resultado no finito");
    return `🧮 ${value} = ${result}`;
  } catch {
    return "No pude calcular esa expresión.";
  }
}

export function entretenimiento() {
  return [
    "*infoplayerleft — entretenimiento*",
    "",
    "`!dado [caras]` — lanza un dado",
    "`!moneda` — lanza una moneda",
    "`!8ball <pregunta>` — respuesta aleatoria",
    "`!verdad` / `!reto` — juego para el grupo",
    "`!pareja <nombre 1> y <nombre 2>` — compatibilidad divertida",
    "`!calcular <expresión>` — cálculo aritmético básico",
  ].join("\n");
}
