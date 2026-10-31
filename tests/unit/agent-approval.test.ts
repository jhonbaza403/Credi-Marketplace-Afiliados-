import { describe, expect, it } from 'vitest'
import {
  hashAgentApprovalInput,
  signAgentApprovalToken,
  verifyAgentApprovalToken,
  type AgentApprovalClaims,
} from '@/lib/ai/agent-approval'

const secret = 'test-only-approval-secret'
const claims: AgentApprovalClaims = {
  requestId: 'request-123',
  ownerId: 'user-123',
  action: 'send_commercial_message',
  resourceId: 'conversation-123',
  inputHash: 'reviewed-payload-hash',
  expiresAt: 2_000_000_000_000,
}

describe('Credi AI approval integrity', () => {
  it('canonicalizes object key order while keeping operation values bound', () => {
    expect(hashAgentApprovalInput({ action: 'send', message: 'Hello', resource_id: 'chat-1' }))
      .toBe(hashAgentApprovalInput({ resource_id: 'chat-1', message: 'Hello', action: 'send' }))
    expect(hashAgentApprovalInput({ action: 'send', message: 'Hello', resource_id: 'chat-1' }))
      .not.toBe(hashAgentApprovalInput({ action: 'send', message: 'Changed', resource_id: 'chat-1' }))
  })

  it('ignores only request/approval transport fields, not operation data', () => {
    const input = { action: 'create', title: 'Offer', request_id: 'r1', approved: false }
    const sameApproval = { approved: true, request_id: 'r2', action: 'create', title: 'Offer', approval_token: 'token' }
    expect(hashAgentApprovalInput(input)).toBe(hashAgentApprovalInput(sameApproval))
    expect(hashAgentApprovalInput(input)).not.toBe(hashAgentApprovalInput({ ...sameApproval, title: 'Different offer' }))
  })

  it('verifies a single-use token only for the same user, action, resource and payload', () => {
    const token = signAgentApprovalToken(claims, secret)
    const expected = {
      requestId: claims.requestId,
      ownerId: claims.ownerId,
      action: claims.action,
      resourceId: claims.resourceId,
      inputHash: claims.inputHash,
    }
    expect(verifyAgentApprovalToken(token, expected, secret, 1_900_000_000_000)).toBe(true)
    expect(verifyAgentApprovalToken(token, { ...expected, ownerId: 'other-user' }, secret, 1_900_000_000_000)).toBe(false)
    expect(verifyAgentApprovalToken(token, { ...expected, inputHash: 'changed' }, secret, 1_900_000_000_000)).toBe(false)
    expect(verifyAgentApprovalToken(token, { ...expected, resourceId: 'other-chat' }, secret, 1_900_000_000_000)).toBe(false)
    expect(verifyAgentApprovalToken(token, expected, secret, claims.expiresAt)).toBe(false)
    expect(verifyAgentApprovalToken(token + '.tampered', expected, secret, 1_900_000_000_000)).toBe(false)
  })
})
