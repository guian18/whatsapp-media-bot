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
  const requesters = [
    ...(Array.isArray(context.requesterIds) ? context.requesterIds : []),
    context.requesterId,
    context.requesterPhone,
    context.jid,
  ]
    .map(normalizeNumber)
    .filter(Boolean);
  const privilegedNumbers = configuredPrivilegedNumbers();
  return requesters.some((requester) => privilegedNumbers.has(requester));
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
