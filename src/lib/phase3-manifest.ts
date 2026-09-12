export const phase3Capabilities = {
  intelligence: ['credit-scoring', 'reputation', 'content-generation'],
  logistics: ['route-optimization', 'smart-lockers'],
  finance: ['escrow-policy', 'dispute-events'],
  social: ['live-sessions', 'live-products', 'live-events'],
  governance: ['ai-decision-audit', 'input-hashing', 'rls'],
} as const

export const phase3Status = {
  implementedFoundation: true,
  externalTrafficProviderConnected: false,
  externalAliExpressConnectorConnected: false,
  stripeConnectPayoutsConnected: false,
  realVideoTranscodingConnected: false,
} as const
