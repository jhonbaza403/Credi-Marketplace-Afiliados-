# Full Supabase Preview / Production catalog reconciliation
Date: 2026-11-05

## Scope and method

Live catalogs queried read-only from:
- Preview: `yjxybhpubxhblfyfzlmk`
- Production: `fusnmvmveqdzmzohhlzm`

Compared migration history, public/private tables and columns, function signatures/definitions/security metadata, RLS policies, indexes, triggers and publication membership. No DDL was executed during the audit.

## 1. Exact migration-history delta

- Preview: 239 migration versions.
- Production: 219 migration versions.
- Preview-only versions: 20.
- Production-only versions: 0.

| Version | Migration | Contents / impact | Classification |
|---|---|---|---|
| 20260924134300 | wallet_journals_and_refund_schema | wallet_journals, wallet_ledger, wallet_refunds; journal validation functions; deny-client RLS; supporting indexes | Main tables exist in Production; function and policy semantics still need diff review |
| 20260924134854 | settlement_account_bindings_base | settlement_account_bindings; deny-client RLS; indexes | Main table exists in Production |
| 20260924134855 | settlement_audit_base | settlement_approval_audit and settlement_payout_audit; deny-client RLS; indexes | Main tables exist in Production |
| 20261002010000 | marketing_ads_and_audiences_core | audiences, campaigns, ad sets, creatives, ads, experiments, variants, conversion events; RLS and indexes | Main tables exist in Production; policy parity not established |
| 20261002020000 | profile_verification_photos | profile_verification_photos; status indexes; updated-at trigger | Main table exists in Production; policy/trigger definitions require comparison |
| 20261002030000 | marketing_metrics_and_social_integrations | advertisements, marketing_daily_metrics, marketing_events, social_accounts, social_publications; updated-at function/triggers; RLS/indexes | Main tables exist in Production; body/ACL/RLS parity not established |
| 20261002040000 | restore_financial_trigger_functions | financial validation/reconciliation/settlement functions and order/listing/product triggers | Functions mostly exist; Production has the order-status trigger while Preview does not |
| 20261003020000 | ai_sessions_core | ai_sessions; owner RLS; user/update index | Main table exists in Production |
| 20261012080000 | guard_social_moderation_fields | Original SQL is archived; inert local history mapping only | Superseded in Production by 20261031002051 |
| 20261012150000 | enable_live_realtime_publication | Original SQL is archived; inert local history mapping only | Superseded in Production by 20261031002056 |
| 20261031183000 | credi_professional_jobs_and_profiles | jobs, job_applications, professional_profiles; updated-at function/triggers; 9 RLS policies; indexes | **Missing in Production** |
| 20261101090000 | credi_secure_chat_groups | conversation_invitations; four SECURITY DEFINER group/invitation RPCs; participant-read RLS; invitation indexes; revokes direct member INSERT and drops unsafe policy | **Missing in Production** |
| 20261102100000 | social_feed_preferences | social_feed_preferences; user-only CRUD RLS | **Missing in Production** |
| 20261104040000 | restore_preview_commerce_rls_acl_parity | Reconciles policies on profiles, categories, stores, affiliates, orders, inventory, products and related commerce tables | Main tables exist; several policy definitions/names differ and need per-policy review |
| 20261104040100 | harden_trigger_function_search_paths | Sets search_path on set_updated_at, set_idempotency_updated_at, set_affiliate_updated_at and prevent_affiliate_self_referral | Function attributes differ; compare exact behavior and preserve hardened settings |
| 20261104040200 | restore_credi_live_commerce_schema | LIVE room/message/product/giveaway/moderator/blocked-keyword/reaction tables; RLS, indexes and realtime publication entries | Main tables exist; one column nullability mismatch and publication differences found |
| 20261104040300 | platform_owner_profile_guard | Protects platform-owner profile fields through a trigger | Trigger exists in Production; verify definitions/attachment |
| 20261104040400 | fix_credi_pin_generation | Replaces generate_credi_pin | Function exists in both; function body differs |
| 20261104040500 | restore_missing_preview_private_helpers | Restores private helper functions for B2B, Credi Chat, contacts, ratings and settlement validation | Most helpers exist; 47 common function bodies differ overall |
| 20261104040600 | restore_private_identity_profile_photos | Restores authorized photo access policy, indexes and updated-at trigger | Main table exists; policy/trigger parity needs review |

The two historical mappings above intentionally contain comments only. They must not be replayed over the later Production canonical migrations.

## 2. Tables and columns

- Public tables: Preview 165; Production 160.
- The five Preview tables absent in Production are exactly:
  - `jobs`
  - `job_applications`
  - `professional_profiles`
  - `conversation_invitations`
  - `social_feed_preferences`
- This accounts for 49 Preview-only columns.
- No Production-only public table or column was found.
- No common column differed except `public.chat_live_rooms.description`:
  - Preview: `text NOT NULL DEFAULT ''`.
  - Production: `text NULL DEFAULT ''`.
  - Production currently has 11 LIVE rooms and zero NULL descriptions; Preview has zero rows in that table at audit time.
- The PR migration now includes a guarded forward change that aborts if a NULL appears and then enforces `NOT NULL DEFAULT ''`. It does not rewrite existing rows.

## 3. Functions

- Preview: 121 public/private functions.
- Production: 118.
- Five signatures exist in Preview but not Production:
  - `public.create_credichat_group_conversation(text, uuid[])`
  - `public.invite_credichat_group_member(uuid, uuid)`
  - `public.list_my_credichat_group_invitations()`
  - `public.respond_credichat_group_invitation(uuid, boolean)`
  - `public.touch_credi_jobs_updated_at()`
- Two signatures exist only in Production and must be preserved:
  - `public.pay_settlement_allocation(uuid, text)`
  - `public.reverse_settlement_allocation(uuid, text, text)`
- There are 116 common signatures. A normalized catalog comparison found 47 common function bodies with different hashes and 56 common functions with differences in SECURITY DEFINER, search_path or effective EXECUTE ACL metadata.
- This is material drift, not just migration-history drift. Do not copy all Preview function definitions over Production. Review each body and privilege boundary, especially wallet/settlement, Credi Chat, identity/contact, PIN, order and Stripe functions.
- Examples of different security modes include Production's invoker wrappers for wallet and direct-chat operations delegating to private SECURITY DEFINER functions, while Preview exposes SECURITY DEFINER on the public wrapper. These can be functionally equivalent only if the delegation, grants and search_path are verified.

## 4. RLS policies

- Preview: 317 policies.
- Production: 303 policies.
- 21 policy identities are Preview-only, 7 are Production-only, and 30 shared policy identities have different USING/WITH CHECK/role/command definitions.
- The 14 Preview-only policies on the five missing tables are part of the three feature migrations being promoted.
- Other Preview-only policies affect feed posts, stories, reels and advertisements.
- Production-only policies include explicit client-deny policies for api_rate_limits and tax tables, an operation_events admin-read policy, and the legacy `conversation_members_insert` policy.
- Preserve the explicit deny policies unless an equivalent privilege/RLS rule is demonstrated. Do not copy the Preview policy set wholesale.
- The legacy Production `conversation_members_insert` policy allows a client to add itself to a conversation when it knows the conversation UUID. The new group-security migration removes that policy and revokes direct INSERT; the existing direct-chat RPC delegates to a private SECURITY DEFINER function. This security change must be tested with authenticated users.

## 5. Indexes

- Preview: 630 indexes.
- Production: 624.
- 20 index identities are Preview-only; 14 are Production-only.
- The Preview-only set includes indexes for the five absent tables and alternate indexes on listings/listing_offers, order history and settlement allocations.
- Production-only indexes include conversation context indexes, alternative listings/listing_offers indexes, the single-platform-owner unique index and a wallet-ledger journal index.
- Some are equivalent by purpose but not by definition; settlement-allocation uniqueness is materially different:
  - Preview unique key: (order_id, beneficiary_role).
  - Production unique key: (order_id, beneficiary_role, COALESCE(beneficiary_id, zero UUID)).
- Keep Production-specific indexes. Do not create duplicates or replace uniqueness semantics without a data/business-rule review.

## 6. Triggers

- Preview: 112 triggers.
- Production: 110.
- Preview-only triggers: jobs, job_applications and professional_profiles updated-at triggers.
- Production-only trigger: `public.trg_orders_status_history` on orders.
- Preserve the Production order-history trigger. The Preview migration source defines it, but the live Preview catalog does not currently show it; this is a Preview-side drift to resolve rather than deleting it from Production.

## 7. Realtime publications

- Preview publication membership entries: 9.
- Production: 18.
- Production has nine additional members in `supabase_realtime_messages_publication`: `realtime.messages_2026_11_01` through `realtime.messages_2026_11_09`.
- These are daily realtime message partitions, not missing application tables. Preserve Production's entries; do not delete them to match Preview's count.

## 8. Application compatibility findings

- Current direct-chat UI uses `create_credichat_direct_conversation` RPC; Production's public wrapper delegates to private `SECURITY DEFINER` implementation.
- Code search found no UI/client references to the new group invitation RPCs or `conversation_invitations`. The DB feature exists in Preview, but group invitations are not yet wired into the current client UI.
- Before revoking direct `conversation_members` INSERT in Production, test all app/API/service callers. No direct frontend membership INSERT was found in the searched CrediChat components, but API routes and all other consumers still require a full call-site audit.
- Job application workflow has no employer status-update policy in the source migration; an approved status-transition RPC/API is still needed before treating the jobs feature as complete.

## 9. PR and rollout status

- PR #103 remains a draft and is not merged.
- The forward migration contains the three missing feature areas and the guarded LIVE description constraint.
- Nested BEGIN/COMMIT statements were removed so the Supabase migration runner controls the transaction boundary.
- No SQL was executed on Preview or Production. No remote migration version was marked applied. No data was changed.
- A disposable Supabase development branch from Production is required for an isolated apply/test. Supabase requires organization-specific cost confirmation before creating it; do not create it until the user reviews and accepts the quoted cost.
- After isolated apply, validate migration idempotence/clean application, RLS with separate authenticated users, direct chat, group create/invite/accept/decline/revoke, job posting/applications, profile visibility, feed preference CRUD, LIVE room inserts/updates, and no unintended access to conversation membership.
- Then compare catalog fingerprints again and only prepare a separate, reviewed forward migration for remaining proven semantic differences.

## 10. Decision

The 20-version gap is not 20 missing Production features. Three migrations contain the confirmed missing application areas. Other migrations mostly describe objects already present, later canonical replacements, or policy/function differences that require semantic comparison. Several additional live catalog differences exist beyond the 20 versions; they are documented above and must be reviewed independently before declaring the databases functionally equivalent.


## Segunda pasada de auditoría integral — 2026-11-06

### Catálogo y metadatos
- Los dos proyectos tienen los mismos 11 schemas de aplicación/servicio.
- Funciones SQL: Preview 121, Production 118; cinco firmas solo en Preview y dos solo en Production. Las dos funciones de settlement exclusivas de Production se conservan.
- Entre 116 firmas comunes, 47 cuerpos difieren. La comparación ampliada detectó 65 firmas con alguna diferencia de cuerpo, SECURITY DEFINER, search_path o ACL efectiva. No se copian en bloque.
- Hallazgo crítico confirmado en Preview: `public.get_credi_operation_timeline(uuid)` es SECURITY DEFINER y concede EXECUTE a PUBLIC/anon. Su cuerpo exige `auth.uid()` y rol admin, por lo que la comprobación interna rechaza anon; aun así, el permiso anónimo es innecesario y amplía la superficie de ataque. La migración nueva revoca PUBLIC/anon y fija search_path vacío, conservando authenticated/service_role.
- Políticas públicas: Preview 317, Production 303. Hay tres pares de políticas SELECT permisivas superpuestas en Preview para advertisements, feed_posts y reels. Las políticas antiguas no exigen moderación aprobada; al combinarse con OR pueden saltarse el control de moderación. La migración nueva elimina únicamente esas tres políticas antiguas.
- Se conservan las siete políticas exclusivas de Production, incluidas las políticas deny para límites de API, eventos operativos y datos fiscales.
- Índices públicos: Preview 630, Production 624. Se preservan las alternativas exclusivas de Production, el índice único del propietario de plataforma y el índice de wallet/ledger. No se eliminan índices por el mero indicador de no uso.
- Restricciones públicas: Preview 932, Production 900. Hay restricciones exclusivas de ambos entornos y 15 definiciones compartidas diferentes; deben mantenerse bajo revisión semántica, especialmente unicidad de settlement allocations y constraints de listings/listing_offers.
- Triggers públicos no internos: Preview 79, Production 76. Preview tiene tres triggers adicionales de updated_at para jobs. El trigger `trg_orders_status_history` existe en ambos, pero su función difiere: Production intentaba escribir `old_status/new_status/changed_at`, columnas que no existen. El esquema compartido utiliza `from_status/to_status/changed_by/reason/metadata`. La migración nueva corrige la función y mantiene el comportamiento de Production: registrar INSERT y cambios de status, sin borrar historial existente.
- Realtime: ambos publican nueve tablas públicas en `supabase_realtime`. Production conserva además nueve particiones `realtime.messages_2026_11_01` a `_09` en `supabase_realtime_messages_publication`. No se eliminan.
- Vistas: Preview 8, Production 10; las dos adicionales de Production pertenecen a `hypopg`/index_advisor. Extensiones: Preview 5, Production 7. Se conservan las extensiones de diagnóstico de Production.
- Secuencias relevantes y 18 enums coinciden; no se encontraron dominios. Cron y relaciones pgmq no están presentes en ninguno de los dos proyectos.

### Storage y Edge Functions
- Buckets: Preview 2, Production 5. Production tiene `kyb-documents`, `kyc-documents` y `marketplace-media` adicionales; los dos primeros son privados y el último público. La migración nueva crea `kyc-documents` privado en Preview y aborta si encuentra configuración incompatible en lugar de cambiar silenciosamente un bucket existente.
- `media-upload`: Preview versión 1 y Production versión 9, hashes distintos. La fuente del repositorio se alinea con el handler de Production que no reescribe configuración de buckets en cada carga; amplía CORS solo a dominios Credi/Vercel reconocidos.
- `health`: solo listada en Production; el código fuente existe y solo devuelve estado estático, sin datos de usuario.
- `kyc-upload`: solo listada en Production y no tenía fuente versionada en el repositorio. El handler desplegado usaba `credi-kyc-private`, mientras el RPC de KYC validaba objetos en `marketplace-media` (público); además aceptaba PDF en la carga pero el RPC lo rechazaba, y los límites de 20 MB no coincidían con los 15 MB del RPC/10 MB del bucket privado. Se añade fuente versionada que usa `kyc-documents` privado, 10 MB y PDF solo para frente/reverso de documento; el RPC valida bucket, propietario, prefijo de usuario y MIME.
- No hay filas en `public.kyc_documents` en ninguno de los dos proyectos. Esto no prueba que no existan objetos huérfanos en Storage; no se borran ni se migran objetos automáticamente.

### Cambios propuestos en esta rama
- Añadida `20261105230000_harden_rls_timeline_and_private_kyc.sql`: limpieza de políticas de moderación, ACL/search_path de timeline, bucket KYC privado, RPC de KYC compatible con PDF controlado y trigger correcto de historial de pedidos.
- Actualizada la fuente de `media-upload` para quitar la mutación de bucket por solicitud y aceptar orígenes Credi/Vercel permitidos.
- Añadida fuente de `kyc-upload`, configuración explícita `verify_jwt = true` y ajuste del formulario a 10 MB con tipo documental explícito.
- PR permanece draft. No se ejecutó SQL remoto, no se desplegaron Edge Functions y no se modificó Producción.

### Validación que sigue pendiente
- El CI de aplicación, seguridad, CodeQL, secret scan y Vercel Preview debe terminar en el commit más reciente.
- Hace falta una rama Supabase aislada derivada de Production para ejecutar migraciones, comprobar DDL, políticas, triggers, KYC y flujos. Aún no se ha creado porque requiere cotizar el costo de la rama según el ID de organización y autorización del costo.
- Las pruebas de integración reales de chat, invitaciones, empleos, LIVE, autenticación, Storage y flujos financieros siguen pendientes. Los tests unitarios/E2E del frontend no certifican por sí solos esas operaciones contra Postgres/Storage reales.


### Hallazgo KYC adicional — permisos del RPC
- En ambos proyectos, `public.submit_kyc_identity` era SECURITY INVOKER y concedía EXECUTE a authenticated, pero llamaba a `private.submit_kyc_identity`, cuyo EXECUTE estaba restringido a postgres/service_role. El usuario autenticado podía ejecutar el wrapper, pero el wrapper no podía ejecutar la implementación privada.
- La migración nueva convierte el wrapper público en SECURITY DEFINER, fija search_path vacío y mantiene EXECUTE únicamente para authenticated/service_role. La implementación privada conserva la comprobación `auth.uid()`, rate limit y propiedad del objeto.
- Esta corrección es código propuesto; aún no se ha aplicado ni probado en una rama de base de datos.


### Hallazgo transversal — wrappers públicos hacia funciones privadas
- La comparación de ACL y `prosecdef` encontró 12 RPC públicos concedidos a `authenticated` que en Production eran SECURITY INVOKER y llamaban a implementaciones `private.*` sin EXECUTE para authenticated: negociación, awards B2B, chat directo, búsqueda de contactos, objetivos de calificación, inicialización fiscal, KYC, envío de calificación y wallet (pago, reembolso y transferencia).
- Las implementaciones privadas revisadas verifican `auth.uid()` y aplican controles propios: participación en negociación, propiedad del RFQ/orden, identidad del usuario, rate limit y autoridad platform-owner para reembolsos. No se concede EXECUTE directo sobre el esquema privado.
- La migración nueva convierte los 12 puntos de entrada públicos revisados en SECURITY DEFINER con search_path vacío, revoca PUBLIC/anon y conserva authenticated/service_role. En Preview, algunos ya tenían ese patrón y otros eran wrappers invoker; la migración unifica el límite público.
- `record_affiliate_product_click` está intencionalmente limitado a service_role en ambos proyectos, pero el endpoint `/api/affiliate` lo llamaba usando el cliente de sesión (publishable key). Se modifica el endpoint para validar el enlace con el cliente de usuario y ejecutar el contador con el cliente admin exclusivamente del lado servidor.
- La función de plan `user_has_plan_feature` en Preview incluía un bypass admin/platform-owner dentro de entitlement comercial, contradiciendo el contrato de separación entre administración y planes. La migración alinea el cálculo con el entitlement comercial, limita la consulta al propio usuario (o backend service_role), y agrega el fallback de plan Free que faltaba en Production.
- Estas son correcciones de fuente/migración propuestas; su comportamiento real debe confirmarse en la rama Supabase aislada antes del rollout.


### Flujo KYC de Compliance API
- Se detectó una segunda ruta de KYC en `/api/compliance/kyc` y `/api/compliance/upload`, usada por `ComplianceCenter`. La ruta de creación omitía `document_number`, aunque la columna es NOT NULL, por lo que el caso podía fallar al crearse.
- Se alinea la validación del tipo de documento con `id_card/passport/drivers_license`, se persiste el número de documento, y el caso queda `pending` hasta que se almacena la evidencia principal; entonces pasa a `submitted`.
- Se amplían los tipos de evidencia KYC a las fotografías usadas por el Centro de Verificación y se restringe PDF a tipos documentales compatibles; fotos de perfil/laterales solo admiten imágenes. El límite se unifica en 10 MB.
- El formulario del Centro de Compliance permite reintentar mientras el caso esté pendiente y registra el tipo de evidencia primaria como `id_front`.
- El flujo de `/account/verificacion` conserva su ruta Edge Function + RPC privada, que también se corrige para usar el bucket privado. Ambos flujos comparten ahora el mismo bucket privado y los mismos límites/tipos permitidos.


## Follow-up: internal-table RLS policy reconciliation — 2026-11-06

Read-only recheck of the live security advisors and `pg_policies` confirmed:

- Production has five policies across the six internal tables: explicit client-deny policies on `api_rate_limits`, `tax_exemptions`, `tax_filings`, and `tax_reports`, plus the authenticated-admin SELECT policy on `operation_events`.
- Production's `credi_supply_sources` table has no client grants and no policies; its intended access path is backend/service-role only.
- Preview had zero policies across those six tables. Its `get_credi_operation_timeline(uuid)` function also still had PUBLIC EXECUTE in its ACL, despite checking `auth.uid()` and admin status in its body.
- The follow-up migration now adds restrictive `false` policies for `anon` and `authenticated` on `credi_supply_sources`, `api_rate_limits`, and the three tax tables. These policies deny client access and do not grant privileges. It restores the admin-only `operation_events` SELECT policy using the existing `public.is_admin()` helper.
- The same migration revokes PUBLIC/anon execution from `get_credi_operation_timeline(uuid)`, pins its search path, and retains authenticated/service-role execution. It also retains the previously documented moderation-policy cleanup and private KYC bucket behavior.

This is a source-code correction in PR #103 only. The migration has not been applied to either Supabase project. The live advisor findings therefore remain until an approved migration rollout and a fresh advisor recheck. The 18 authenticated SECURITY DEFINER advisor notices are not blindly revoked: each exposed RPC requires individual review of its caller contract, identity checks, ownership checks, and grants.
