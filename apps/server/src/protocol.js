export const CLIENT = {
  HELLO: "hello",
  MOVE: "move",
  MAIL_SEND: "mail_send",
  MAIL_LIST: "mail_list"
};

export const SERVER = {
  STATE: "state",
  MAIL: "mail",
  NOTIFY: "notify",
  ERROR: "error"
};

export function parseMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
