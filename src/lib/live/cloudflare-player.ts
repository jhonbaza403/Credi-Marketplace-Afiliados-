/**
 * Convert a Cloudflare Stream HLS/DASH manifest URL into the official
 * cross-browser Stream Player iframe URL for the same live input/video.
 */
export function cloudflarePlayerUrl(manifest?:string|null):string|null{
  if(!manifest)return null
  try{
    const url=new URL(manifest)
    if(url.protocol!=='https:')return null
    const segments=url.pathname.split('/').filter(Boolean)
    if(segments.length!==3||segments[1]!=='manifest'||!['video.m3u8','video.mpd'].includes(segments[2]))return null
    url.pathname='/'+segments[0]+'/iframe'
    url.search=''
    url.hash=''
    return url.toString()
  }catch{return null}
}
