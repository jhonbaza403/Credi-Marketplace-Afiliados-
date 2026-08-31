export const APP_CONSTANTS = {
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },

  products: {
    maxImages: 10,
    maxTitleLength: 200,
    maxDescriptionLength: 10000,
  },

  orders: {
    maxItems: 100,
    maxQuantityPerItem: 10000,
  },

  security: {
    maxRequestBodySize: 1024 * 1024,
  },

  cache: {
    short: 60,
    medium: 300,
    long: 3600,
  },

  timeouts: {
    default: 10000,
    payment: 30000,
    externalApi: 15000,
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
