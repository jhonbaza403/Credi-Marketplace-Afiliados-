import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count:number; resetAt:number }>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries=new Map<string,{count:number;resetAt:number}>();
  async increment(key:string,windowMs:number){
    const now=Date.now(), existing=this.entries.get(key);
    if(!existing||existing.resetAt<=now){const entry={count:1,resetAt:now+windowMs};this.entries.set(key,entry);return entry;}
    existing.count+=1; return existing;
  }
}
const memoryStore=new MemoryRateLimitStore();

export async function rateLimit(key:string,options:{limit:number;windowMs:number;store?:RateLimitStore}):Promise<RateLimitResult>{
  const store=options.store??memoryStore;
  const result=await store.increment(key,options.windowMs);
  return {success:result.count<=options.limit,limit:options.limit,remaining:Math.max(0,options.limit-result.count),resetAt:result.resetAt};
}

export async function distributedRateLimit(
  supabase: SupabaseClient,
  key: string,
  options: { limit:number; windowMs:number },
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_key:key.slice(0,512),
    p_limit:Math.max(1,Math.floor(options.limit)),
    p_window_seconds:Math.max(1,Math.ceil(options.windowMs/1000)),
  });
  if (error) {
    if (process.env.NODE_ENV !== "production") return rateLimit(key,options);
    throw new Error("Distributed rate limiter unavailable");
  }
  const row=Array.isArray(data)?data[0]:data;
  if(!row||typeof row!=="object") throw new Error("Invalid distributed rate-limit response");
  const record=row as Record<string,unknown>;
  return {
    success:Boolean(record.allowed ?? Number(record.count??0)<=options.limit),
    limit:Number(record.limit??options.limit),
    remaining:Number(record.remaining??0),
    resetAt:Number(record.reset_at_epoch_ms??Date.now()+options.windowMs),
  };
}
