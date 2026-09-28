export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && error.message) return String(error.message);
  return "Unknown error";
}

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

export function logError(scope: string, error: unknown) {
  console.error(`[iron-log] ${scope}`, error);
}

export function friendlyError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("password") && (message.includes("least") || message.includes("short") || message.includes("weak"))) {
    return "Password must be at least 8 characters.";
  }
  if (message.includes("email") && message.includes("invalid")) return "Enter a valid email address.";
  if (message.includes("network") || message.includes("fetch") || message.includes("failed to fetch")) {
    return "Network error. Your latest change is kept on this device.";
  }
  if (message.includes("jwt") || message.includes("session") || message.includes("not authenticated")) {
    return "Your session expired. Log in again.";
  }
  if (message.includes("environment")) return "Supabase is not configured yet.";
  return "Something went wrong. Please try again.";
}
