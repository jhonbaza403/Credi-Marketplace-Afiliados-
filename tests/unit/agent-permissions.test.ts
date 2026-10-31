import { describe, expect, it } from 'vitest'
import {
  canAgentExecute,
  getAgentAuthorizationLevel,
  isCrediAgentAction,
  type CrediAgentAction,
} from '@/lib/ai/agent-permissions'

describe('Credi AI governed operation permissions', () => {
  it('allows reads without a write approval', () => {
    const reads: CrediAgentAction[] = [
      'inventory_summary',
      'b2b_pipeline',
      'commerce_summary',
      'affiliate_summary',
      'chat_summary',
      'live_summary',
      'social_summary',
      'support_summary',
    ]
    for (const action of reads) {
      expect(getAgentAuthorizationLevel(action)).toBe('read')
      expect(canAgentExecute(action, false)).toBe(true)
    }
  })

  it('requires a user approval for every operation that writes or sends data', () => {
    const writes: CrediAgentAction[] = [
      'prepare_rfq_followup',
      'publish_offer',
      'send_commercial_message',
      'create_payment',
      'create_support_case',
      'create_b2b_rfq',
      'create_social_post',
    ]
    for (const action of writes) {
      expect(['propose', 'execute']).toContain(getAgentAuthorizationLevel(action))
      expect(canAgentExecute(action, false)).toBe(false)
      expect(canAgentExecute(action, true)).toBe(true)
    }
  })

  it('rejects unknown actions and prototype properties', () => {
    expect(isCrediAgentAction('delete_everything')).toBe(false)
    expect(isCrediAgentAction('toString')).toBe(false)
    expect(isCrediAgentAction('__proto__')).toBe(false)
    expect(isCrediAgentAction('create_support_case')).toBe(true)
  })
})
