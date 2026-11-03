export type LogLevel = "info" | "warn" | "error";

const SECRET_PATTERN = /postgres(?:ql)?:\/\/\S+/gi;
const SECRET_FIELDS = ["database_url", "password", "secret", "authorization", "token", "api_key"];

export function redact(value: string): string {
  return value.replace(SECRET_PATTERN, "postgresql://[redacted]");
}

export function sanitizeFields(
  fields: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!fields) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(fields)) {
    const secretField = SECRET_FIELDS.some((secret) => key.toLowerCase().includes(secret));
    if (secretField) {
      sanitized[key] = "[redacted]";
    } else if (typeof fieldValue === "string") {
      sanitized[key] = redact(fieldValue);
    } else {
      sanitized[key] = fieldValue;
    }
  }
  return sanitized;
}

export function log(
  level: LogLevel,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message: redact(message),
    ...sanitizeFields(fields),
  });
  if (level === "error") {
    console.error(entry);
  } else {
    console.log(entry);
  }
}
