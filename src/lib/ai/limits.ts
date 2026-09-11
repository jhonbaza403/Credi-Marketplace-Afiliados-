export const AI_LIMITS = {
  maxInputCharacters: Number(process.env.AI_MAX_INPUT_LENGTH ?? 8000),
  maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1800),
  timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 45000),
} as const;
