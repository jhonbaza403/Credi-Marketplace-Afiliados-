export const autonomousModules = Object.freeze({
  credit: '/api/ai/credit-v2',
  dropshipping: '/api/ai/dropshipping',
  import: '/api/dropshipping/import',
  logistics: '/api/logistics/optimize',
  lockers: '/api/smart-lockers',
  escrowDispute: '/api/escrow/dispute',
  escrowRelease: '/api/escrow/release',
  liveSessions: '/api/live/sessions',
  liveProducts: '/api/live/products',
  liveEvents: '/api/live/events',
  reputation: '/api/reputation',
} as const)

export type AutonomousModule = keyof typeof autonomousModules
