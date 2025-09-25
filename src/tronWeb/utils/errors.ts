import type { ErrorResponse } from "../types";
import { isLikelyBase64 } from "./validation";

export function extractTronErrorMessage(value: unknown): string | null {
  if (!value) return null;
  const errorResp = value as ErrorResponse;
  const candidates = [
    errorResp.result?.message,
    errorResp.message,
    errorResp.Error,
    errorResp.code,
  ];
  for (const item of candidates) {
    if (typeof item === "string" && item.length > 0)
      return decodeTronMessage(item);
  }
  const ret = Array.isArray(errorResp.transaction?.ret)
    ? errorResp.transaction.ret[0]
    : undefined;
  if (ret) {
    const retMessage =
      (typeof ret.ret_message === "string" && ret.ret_message) ||
      (typeof ret.retMsg === "string" && ret.retMsg) ||
      (typeof ret.ret_msg === "string" && ret.ret_msg) ||
      (typeof ret.message === "string" && ret.message);
    if (retMessage) return decodeTronMessage(retMessage);
  }
  return null;
}

export function decodeTronMessage(message: string): string {
  if (isLikelyBase64(message)) {
    const decoded = decodeBase64String(message);
    if (decoded && decoded.length > 0) return decoded;
  }
  return message;
}

export function decodeBase64String(value: string): string {
  try {
    const globalObj = globalThis as {
      atob?: (data: string) => string;
      Buffer?: {
        from: (data: string, encoding: string) => { toString: (encoding: string) => string };
      };
    };
    if (globalObj?.atob) return globalObj.atob(value);
    if (globalObj?.Buffer)
      return globalObj.Buffer.from(value, "base64").toString("utf8");
  } catch {}
  return value;
}