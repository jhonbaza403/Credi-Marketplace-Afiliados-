# Credi E2E validation matrix

The local CI run on commit `18cf5f934e4a6b39f20a0a3bb349500b4c89fd60` completed with **64 passed, 11 skipped, 0 failed**. A skipped test is not counted as a pass and does not prove the underlying production integration works.

## Why 11 checks are skipped in local CI

| Count | Suite | Required test environment |
|---:|---|---|
| 4 | Connector matrix: wholesale, providers, commercial network and sellers | `PLAYWRIGHT_BASE_URL` pointing to an isolated staging environment with configured Supabase data |
| 1 | Provider-card direct-chat/company links | Same staging target with provider fixtures |
| 1 | Product sharing controls | Same staging target with product records |
| 2 | Production journey: payment timeline and LIVE/replay/chat | `PLAYWRIGHT_BASE_URL`, `E2E_STORAGE_STATE_PATH`, `E2E_OPERATION_ID`, and `E2E_LIVE_ROOM_ID` from dedicated test fixtures |
| 1 | Real Chat text + audio/video | `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_PEER_EMAIL`, `E2E_PEER_PASSWORD`, and `E2E_CONVERSATION_ID` for two dedicated accounts |
| 1 | Private Chat group invitation/acceptance | Creator and invitee credentials, `E2E_GROUP_MEMBER_PINS`, `E2E_GROUP_ACCEPT_PIN`, and a configured staging URL |
| 1 | Social feed preferences | `E2E_SOCIAL_TEST_EMAIL` and `E2E_SOCIAL_TEST_PASSWORD` |

Total: **11 skipped**. They are gated because this repository's local CI environment does not receive a staging URL, dedicated test accounts, provider/product fixtures, a real operation ID, or a live room ID. Do not replace these gates with fake success responses or point them at production data.

## Regression guardrails

- Public page availability tests must fail on unexpected HTTP 5xx. They must not silently skip any 5xx solely because CI is local.
- Connector and product tests first assert that their page rendered without a server error; only the data-specific assertions are gated on staging fixtures.
- The LIVE/payment and two-account Chat tests remain staging-only until dedicated, isolated fixtures are provisioned.
- Supabase migrations introduced by this PR must be applied and verified in an isolated staging database before production. The “not associated with a Supabase Branch” banner is not permission to create a paid persistent branch or to run these migrations against production.
