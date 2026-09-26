import 'server-only'

const STRIPE_API_BASE='https://api.stripe.com'
const STRIPE_CONNECT_VERSION='2026-08-26.preview'

function secret(){const key=process.env.STRIPE_SECRET_KEY?.trim();if(!key)throw new Error('STRIPE_SECRET_KEY_MISSING');return key}
async function request<T>(path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(STRIPE_API_BASE+path,{...init,headers:{Authorization:`Bearer ${secret()}`,'Stripe-Version':STRIPE_CONNECT_VERSION,'Content-Type':'application/json',...(init.headers??{})},cache:'no-store'})
 const payload=await response.json().catch(()=>null)
 if(!response.ok){const message=payload&&typeof payload==='object'&&'error'in payload?String((payload as {error?:{message?:unknown}}).error?.message??'Stripe API error'):`Stripe API respondió ${response.status}.`;throw new Error(message)}
 return payload as T
}
export type StripeConnectAccount={id:string;object?:string;livemode?:boolean;display_name?:string;contact_email?:string;dashboard?:string;requirements?:unknown;configuration?:unknown}
export type StripeAccountLink={url:string;expires_at?:string;account?:string}
export function createMarketplaceConnectedAccount(input:{displayName:string;contactEmail:string;country:string;entityType:'individual'|'company'|'non_profit'|'government_entity'}){
 return request<StripeConnectAccount>('/v2/core/accounts',{method:'POST',body:JSON.stringify({display_name:input.displayName.slice(0,200),contact_email:input.contactEmail,dashboard:'express',defaults:{responsibilities:{fees_collector:'application',losses_collector:'application'}},identity:{country:input.country,entity_type:input.entityType},configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}}})})
}
export function createMarketplaceAccountLink(input:{accountId:string;returnUrl:string;refreshUrl:string}){
 return request<StripeAccountLink>('/v2/core/account_links',{method:'POST',body:JSON.stringify({account:input.accountId,use_case:{type:'account_onboarding',account_onboarding:{configurations:['recipient'],return_url:input.returnUrl,refresh_url:input.refreshUrl}}})})
}
export function retrieveMarketplaceAccount(accountId:string){
 return request<StripeConnectAccount>(`/v2/core/accounts/${encodeURIComponent(accountId)}?include[]=configuration.recipient&include[]=requirements`,{method:'GET'})
}
