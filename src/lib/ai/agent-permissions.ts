export type AgentAuthorizationLevel = 'read' | 'propose' | 'execute'

export type CrediAgentAction =
  | 'inventory_summary'
  | 'b2b_pipeline'
  | 'prepare_rfq_followup'
  | 'publish_offer'
  | 'send_commercial_message'
  | 'create_payment'

const LEVELS: Record<CrediAgentAction, AgentAuthorizationLevel> = {
  inventory_summary: 'read',
  b2b_pipeline: 'read',
  prepare_rfq_followup: 'propose',
  publish_offer: 'execute',
  send_commercial_message: 'execute',
  create_payment: 'execute',
}

export function getAgentAuthorizationLevel(action: CrediAgentAction): AgentAuthorizationLevel {
  return LEVELS[action]
}

export function canAgentExecute(action: CrediAgentAction, approved: boolean): boolean {
  return getAgentAuthorizationLevel(action) === 'read' || (getAgentAuthorizationLevel(action) === 'propose' ? approved : approved)
}

export function isCrediAgentAction(value: unknown): value is CrediAgentAction {
  return typeof value === 'string' && value in LEVELS
}
