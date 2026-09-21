const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
const AXIOS_TIMEOUT_MS = 3e4;
const UNAUTHED_ERR_MSG = "Please login (10001)";
const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
export {
  AXIOS_TIMEOUT_MS,
  COOKIE_NAME,
  NOT_ADMIN_ERR_MSG,
  ONE_YEAR_MS,
  UNAUTHED_ERR_MSG
};
