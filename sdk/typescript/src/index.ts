export type CrediClientOptions={baseUrl:string;apiKey:string}
export type CatalogItem={id:string;title:string;slug:string;description:string|null;price:number;stock:number;image_url:string|null}
export class CrediClient{
 private baseUrl:string; private apiKey:string
 constructor(options:CrediClientOptions){this.baseUrl=options.baseUrl.replace(/\/$/,'');this.apiKey=options.apiKey}
 private async request<T>(path:string,init:RequestInit={}):Promise<T>{const r=await fetch(`${this.baseUrl}${path}`,{...init,headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json',...(init.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error((d as any).error||`Credi API ${r.status}`);return d as T}
 catalog(q=''){return this.request<{version:string;app_id:string;products:CatalogItem[]}>(`/api/v1/catalog${q?`?q=${encodeURIComponent(q)}`:''}`)}
 checkoutIntent(input:{amount:number;currency:string;method_type:'stripe'|'crypto'|'bank_transfer'|'wallet'|'manual';client_reference?:string;idempotency_key?:string}){return this.request('/api/v1/checkout/intent',{method:'POST',body:JSON.stringify(input)})}
}
