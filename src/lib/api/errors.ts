import type { MessageKey } from "@/lib/i18n/messages";

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && error.message) return String(error.message);
  return "Unknown error";
}

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

export function logError(scope: string, error: unknown) {
  const message = errorMessage(error);
  console.error(`[iron-log] ${scope}: ${message}`);
}

export function friendlyError(error: unknown): MessageKey {
  const message = errorMessage(error).toLowerCase();
  if (message.includes("invalid login") || message.includes("invalid credentials")) return "errCredentials";
  if (message.includes("already registered") || message.includes("already been registered")) return "errExists";
  if (message.includes("password") && (message.includes("least") || message.includes("short") || message.includes("weak"))) return "errPassword";
  if (message.includes("rate limit") || message.includes("too many")) return "errRate";
  if (message.includes("email") && message.includes("invalid")) return "errEmail";
  if (message.includes("network") || message.includes("fetch") || message.includes("failed to fetch")) return "errNetwork";
  if (message.includes("jwt") || message.includes("session") || message.includes("not authenticated")) return "errSession";
  if (message.includes("environment")) return "errConfig";
  return "errGeneric";
}
