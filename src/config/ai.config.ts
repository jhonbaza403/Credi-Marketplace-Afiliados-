// ==========================================================
// AI Configuration
// Gemini
// ==========================================================


export const AI_CONFIG = {


 enabled:

  Boolean(
   process.env.GEMINI_API_KEY
  ),



 model:

  process.env.AI_MODEL
  ??
  'gemini',



 maxInputLength:

  Number(
   process.env.AI_MAX_INPUT_LENGTH
   ??
   4000
  ),



 maxOutputTokens:

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
  ),


} as const;
