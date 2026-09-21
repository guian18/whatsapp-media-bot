import { TRPCError } from "@trpc/server";
import { ENV } from "./env.js";
const SERVICE = "webdevtoken.v1.WebDevService";
const buildEndpoint = (rpc) => {
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL)."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service API key is not configured (BUILT_IN_FORGE_API_KEY)."
    });
  }
  const baseUrl = ENV.forgeApiUrl;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(`${SERVICE}/${rpc}`, normalizedBase).toString();
};
const callForge = async (rpc, body, userSession) => {
  const endpoint = buildEndpoint(rpc);
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
    "content-type": "application/json",
    "connect-protocol-version": "1"
  };
  if (userSession) {
    headers["x-manus-user-session"] = userSession;
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Heartbeat ${rpc} network error: ${String(error)}`
    });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw mapForgeError(response, detail, rpc);
  }
  return await response.json();
};
const mapForgeError = (response, detail, rpc) => {
  const status = response.status;
  let code = "INTERNAL_SERVER_ERROR";
  if (status === 401) code = "UNAUTHORIZED";
  else if (status === 403) code = "FORBIDDEN";
  else if (status === 404) code = "NOT_FOUND";
  else if (status === 400 || status === 422) code = "BAD_REQUEST";
  else if (status === 409) code = "CONFLICT";
  else if (status === 429) code = "TOO_MANY_REQUESTS";
  return new TRPCError({
    code,
    message: `Heartbeat ${rpc} failed (${status})${detail ? `: ${detail}` : ""}`
  });
};
const stringifyPayload = (payload) => {
  if (payload === void 0 || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};
const validateCallbackPath = (path) => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/"
    });
  }
};
async function createHeartbeatJob(job, userSession) {
  validateCallbackPath(job.path);
  return callForge(
    "CreateHeartbeatJob",
    {
      name: job.name,
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      description: job.description ?? ""
    },
    userSession
  );
}
async function updateHeartbeatJob(taskUid, patch, userSession) {
  if (patch.path !== void 0) validateCallbackPath(patch.path);
  const body = { taskUid };
  if (patch.cron !== void 0) body.cronExpression = patch.cron;
  if (patch.path !== void 0) body.callbackPath = patch.path;
  if (patch.method !== void 0) body.callbackMethod = patch.method;
  if (patch.payload !== void 0) {
    body.callbackPayload = stringifyPayload(patch.payload);
  }
  if (patch.description !== void 0) body.description = patch.description;
  if (patch.enable !== void 0) body.enable = patch.enable;
  return callForge(
    "UpdateHeartbeatJob",
    body,
    userSession
  );
}
async function deleteHeartbeatJob(taskUid, userSession) {
  await callForge("DeleteHeartbeatJob", { taskUid }, userSession);
}
async function listHeartbeatJobs(userSession, pagination) {
  const body = {};
  if (pagination?.page !== void 0) body.page = pagination.page;
  if (pagination?.pageSize !== void 0) body.pageSize = pagination.pageSize;
  return callForge("ListHeartbeatJobs", body, userSession);
}
export {
  createHeartbeatJob,
  deleteHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob
};
