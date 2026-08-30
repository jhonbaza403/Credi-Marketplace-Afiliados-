// ==========================================================
// AI Usage Limits
// ==========================================================


export const AI_LIMITS = {


 maxInputCharacters:

  Number(
   process.env.AI_MAX_INPUT_LENGTH
   ??
   4000
  ),



 maxTokens:

  Number(
   process.env.AI_MAX_OUTPUT_TOKENS
   ??
   1000
  ),



 timeout:

  Number(
   process.env.AI_REQUEST_TIMEOUT_MS
   ??
   20000
  )


} as const;
