import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'
const SIGNATURE_TOLERANCE_SECONDS = 300

type StripeCheckoutSession = { id: string; url: string | null; status: string | null; payment_status: string; amount_total: number | null; currency: string | null }
function getStripeSecretKey(): string { const key = process.env.STRIPE_SECRET_KEY?.trim(); if (!key) throw new Error('Falta STRIPE_SECRET_KEY.'); return key }
async function stripePost<T>(path: string, params: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, { method:'POST', headers:{ Authorization:`Bearer ${getStripeSecretKey()}`, 'Content-Type':'application/x-www-form-urlencoded', ...(idempotencyKey ? {'Idempotency-Key':idempotencyKey}: {}) }, body:params.toString(), cache:'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok) { const message = payload && typeof payload === 'object' && 'error' in payload ? String((payload as {error?:{message?:unknown}}).error?.message ?? 'Stripe API error') : `Stripe API respondió ${response.status}.`; throw new Error(message) }
  return payload as T
}
export async function createStripeCheckoutSession(input: { orderId:string; userId:string; customerEmail?:string|null; currency:string; amountMinor:number; lineItems:Array<{name:string;quantity:number;unitAmountMinor:number}>; successUrl:string; cancelUrl:string; idempotencyKey:string }): Promise<StripeCheckoutSession> {
  const params = new URLSearchParams(); params.set('mode','payment'); params.set('success_url',input.successUrl); params.set('cancel_url',input.cancelUrl); params.set('client_reference_id',input.orderId); params.set('metadata[order_id]',input.orderId); params.set('metadata[user_id]',input.userId); params.set('metadata[platform]','credi-marketplace'); params.set('payment_intent_data[metadata][order_id]',input.orderId); params.set('payment_intent_data[metadata][user_id]',input.userId)
  if (input.customerEmail) params.set('customer_email',input.customerEmail)
  input.lineItems.forEach((item,index)=>{ params.set(`line_items[${index}][quantity]`,String(item.quantity)); params.set(`line_items[${index}][price_data][currency]`,input.currency.toLowerCase()); params.set(`line_items[${index}][price_data][unit_amount]`,String(item.unitAmountMinor)); params.set(`line_items[${index}][price_data][product_data][name]`,item.name.slice(0,500)) })
  const session = await stripePost<StripeCheckoutSession>('/checkout/sessions',params,input.idempotencyKey); if (!session.id || !session.url) throw new Error('Stripe no devolvió una URL de checkout válida.'); if (session.amount_total !== input.amountMinor) throw new Error('El importe confirmado por Stripe no coincide con la orden.'); if (session.currency?.toUpperCase() !== input.currency.toUpperCase()) throw new Error('La moneda confirmada por Stripe no coincide con la orden.'); return session
}
function parseSignatureHeader(header:string):{timestamp:number;signatures:string[]}|null{const parts=header.split(',');let timestamp=0;const signatures:string[]=[];for(const part of parts){const [key,value]=part.split('=',2);if(key==='t')timestamp=Number(value);if(key==='v1'&&value)signatures.push(value)}if(!Number.isFinite(timestamp)||timestamp<=0||signatures.length===0)return null;return{timestamp,signatures}}
export function verifyStripeWebhookSignature(payload:string,signatureHeader:string|null,secret=process.env.STRIPE_WEBHOOK_SECRET):boolean{if(!signatureHeader||!secret)return false;const parsed=parseSignatureHeader(signatureHeader);if(!parsed)return false;const age=Math.abs(Math.floor(Date.now()/1000)-parsed.timestamp);if(age>SIGNATURE_TOLERANCE_SECONDS)return false;const expected=createHmac('sha256',secret).update(`${parsed.timestamp}.${payload}`,'utf8').digest('hex');return parsed.signatures.some(candidate=>{const a=Buffer.from(expected,'utf8');const b=Buffer.from(candidate,'utf8');return a.length===b.length&&timingSafeEqual(a,b)})}
