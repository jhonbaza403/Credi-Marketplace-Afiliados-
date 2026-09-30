const API_BASE='https://api.cloudflare.com/client/v4'

type CloudflareResponse<T>= {success:boolean;errors?:Array<{code:number;message:string}>;result:T}
export type LiveInput={uid:string;enabled:boolean;status?:string|null;rtmps?:{url:string;streamKey:string};playback?:{hls?:string;dash?:string};webRTC?:{url:string};webRTCPlayback?:{url:string}}

function config(){
  const accountId=process.env.CLOUDFLARE_ACCOUNT_ID
  const token=process.env.CLOUDFLARE_API_TOKEN
  if(!accountId||!token) throw new Error('CLOUDFLARE_STREAM_NOT_CONFIGURED')
  return {accountId,token}
}

async function cf<T>(path:string,init:RequestInit={}):Promise<T>{
  const {accountId,token}=config()
  const response=await fetch(API_BASE+`/accounts/${accountId}${path}`,{
    ...init,
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(init.headers||{})},
    cache:'no-store',
  })
  const body=await response.json().catch(()=>null) as CloudflareResponse<T>|null
  if(!response.ok||!body?.success){
    const detail=body?.errors?.[0]?.message||`Cloudflare HTTP ${response.status}`
    throw new Error('CLOUDFLARE_API_ERROR:'+detail)
  }
  return body.result
}

export async function createLiveInput(roomId:string,title:string){
  return cf<LiveInput>('/stream/live_inputs',{
    method:'POST',
    headers:{'Idempotency-Key':`credi-live-${roomId}`},
    body:JSON.stringify({
      enabled:true,
      meta:{name:title,room_id:roomId,product:'CREDI-LIVE'},
      preferLowLatency:true,
      deleteRecordingAfterDays:30,
      recording:{mode:'automatic',timeoutSeconds:0,requireSignedURLs:false},
    }),
  })
}

export async function getLiveInput(inputId:string){return cf<LiveInput>(`/stream/live_inputs/${encodeURIComponent(inputId)}`)}

export async function setLiveInputEnabled(inputId:string,enabled:boolean){
  return cf<LiveInput>(`/stream/live_inputs/${encodeURIComponent(inputId)}`,{method:'PUT',body:JSON.stringify({enabled})})
}

export async function rotateLiveInputKeys(inputId:string){
  return cf<LiveInput>(`/stream/live_inputs/${encodeURIComponent(inputId)}/rotate_keys`,{method:'POST'})
}

export async function listInputVideos(inputId:string){
  return cf<Array<{uid:string;readyToStream?:boolean;status?:{state?:string};thumbnail?:string}>>(`/stream/live_inputs/${encodeURIComponent(inputId)}/videos`)
}

export function isCloudflareConfigured(){return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID&&process.env.CLOUDFLARE_API_TOKEN)}
