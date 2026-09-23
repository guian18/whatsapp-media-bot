const sentMessagesByChat = new Map();

export function recordBotMessage(jid, result) {
  const key = result?.key || result;
  if (!jid || !key?.id) return;
  const messages = sentMessagesByChat.get(jid) || [];
  messages.push(key);
  sentMessagesByChat.set(jid, messages.slice(-500));
}

export async function clearAllBotMessages(context = {}) {
  if (typeof context.deleteMessage !== "function" || !context.jid) {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  const messages = sentMessagesByChat.get(context.jid) || [];
  if (!messages.length) return "No hay mensajes del bot registrados para eliminar en este chat.";

  let deleted = 0;
  const remaining = [];
  for (const messageKey of messages) {
    try {
      await context.deleteMessage(messageKey);
      deleted += 1;
    } catch {
      remaining.push(messageKey);
    }
  }
  if (remaining.length) sentMessagesByChat.set(context.jid, remaining);
  else sentMessagesByChat.delete(context.jid);
  return deleted
    ? `Eliminé ${deleted} mensaje${deleted === 1 ? "" : "s"} del bot en este chat.`
    : "No pude eliminar los mensajes del bot. Inténtalo de nuevo.";
}
