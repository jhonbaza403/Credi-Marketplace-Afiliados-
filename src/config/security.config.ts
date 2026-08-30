// ==========================================================
// Security Configuration
// ==========================================================


export const SECURITY_CONFIG = {


 csrfEnabled:
  true,


 rateLimitEnabled:
  process.env.RATE_LIMIT_ENABLED
  !==
  'false',


 maxLoginAttempts:
  5,


 sessionExpiration:

  60 *
  60 *
  24 *
  7,


 headers:{

  contentSecurityPolicy:true,

  frameProtection:true,

  noSniff:true,

 },


} as const;
