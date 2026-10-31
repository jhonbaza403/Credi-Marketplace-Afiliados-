export type AgentAuthorizationLevel = 'read' | 'propose' | 'execute'

export type CrediAgentAction =
  | 'inventory_summary'
  | 'b2b_pipeline'
  | 'prepare_rfq_followup'
  | 'publish_offer'
  | 'send_commercial_message'
  | 'create_payment'
  | 'commerce_summary'
  | 'affiliate_summary'
  | 'chat_summary'
  | 'live_summary'
  | 'social_summary'
  | 'support_summary'
  | 'create_support_case'
  | 'create_b2b_rfq'
  | 'create_social_post'

const LEVELS: Record<CrediAgentAction, AgentAuthorizationLevel> = {
  inventory_summary: 'read',
  b2b_pipeline: 'read',
  prepare_rfq_followup: 'propose',
  publish_offer: 'execute',
  send_commercial_message: 'execute',
  create_payment: 'execute',
  commerce_summary: 'read',
  affiliate_summary: 'read',
  chat_summary: 'read',
  live_summary: 'read',
  social_summary: 'read',
  support_summary: 'read',
  create_support_case: 'execute',
  create_b2b_rfq: 'execute',
  create_social_post: 'execute',
}

export function getAgentAuthorizationLevel(action: CrediAgentAction): AgentAuthorizationLevel {
  return LEVELS[action]
}

export function canAgentExecute(action: CrediAgentAction, approved: boolean): boolean {
  const level = getAgentAuthorizationLevel(action)
  return level === 'read' || approved
}

export function isCrediAgentAction(value: unknown): value is CrediAgentAction {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEVELS, value)
}
