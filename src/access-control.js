let allCommandsEnabled = true;

function normalizeNumber(value) {
  let number = String(value || "").replace(/\D/g, "");
  if (number.startsWith("00")) number = number.slice(2);
  return number;
}

function configuredPrivilegedNumbers() {
  return new Set(
    [process.env.OWNER_NUMBER, process.env.ADMIN_NUMBER]
      .map(normalizeNumber)
      .filter(Boolean),
  );
}

export function isPrivilegedUser(context = {}) {
  const requester = normalizeNumber(context.requesterId || context.jid);
  return Boolean(requester) && configuredPrivilegedNumbers().has(requester);
}

export function disableAllCommands() {
  allCommandsEnabled = false;
}

export function enableAllCommands() {
  allCommandsEnabled = true;
}

export function areAllCommandsEnabled() {
  return allCommandsEnabled;
}
