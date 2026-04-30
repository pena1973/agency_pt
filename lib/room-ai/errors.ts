export type RoomAiErrorCode =
  | "quota_exceeded"
  | "token_limit_exceeded"
  | "rate_limit_exceeded";

type ErrorDetails = {
  code?: string;
  type?: string;
  message?: string;
  status?: number;
};

export class RoomAiUserError extends Error {
  readonly code: RoomAiErrorCode;
  readonly status: number;

  constructor(code: RoomAiErrorCode, message: string, status = 429) {
    super(message);
    this.name = "RoomAiUserError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractErrorDetails(error: unknown): ErrorDetails {
  if (!isRecord(error)) {
    return {};
  }

  const nestedError = isRecord(error.error) ? error.error : undefined;

  return {
    code: readString(error.code) ?? readString(nestedError?.code),
    type: readString(error.type) ?? readString(nestedError?.type),
    message: readString(error.message) ?? readString(nestedError?.message),
    status: readNumber(error.status) ?? readNumber(nestedError?.status),
  };
}

export function toRoomAiUserError(error: unknown): RoomAiUserError | null {
  if (error instanceof RoomAiUserError) {
    return error;
  }

  const details = extractErrorDetails(error);
  const haystack = [details.code, details.type, details.message]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (haystack.includes("insufficient_quota") || haystack.includes("quota")) {
    return new RoomAiUserError(
      "quota_exceeded",
      "Лимит токенов или квота OpenAI исчерпаны. Попробуйте позже или пополните баланс API."
    );
  }

  if (
    haystack.includes("token limit") ||
    haystack.includes("max_tokens") ||
    haystack.includes("maximum context length") ||
    haystack.includes("context length")
  ) {
    return new RoomAiUserError(
      "token_limit_exceeded",
      "Превышен лимит токенов для обработки запроса. Попробуйте загрузить меньше фотографий или уменьшить объём запроса."
    );
  }

  if (
    haystack.includes("rate limit") ||
    haystack.includes("rate_limit") ||
    details.status === 429
  ) {
    return new RoomAiUserError(
      "rate_limit_exceeded",
      "Сервис временно упёрся в лимит запросов OpenAI. Подождите немного и попробуйте снова."
    );
  }

  return null;
}

export function throwIfRoomAiUserError(error: unknown): void {
  const userError = toRoomAiUserError(error);

  if (userError) {
    throw userError;
  }
}
