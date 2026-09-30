"use client";

import { useEffect,useState } from "react";
import { ChevronRight,Megaphone,Plus,Sparkles } from "lucide-react";
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader";
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media";

type Campaign={id:string;name:string;status:string;objective:string};
type Props={onSaved?:()=>void};

export default function MarketingCreativeBuilder({onSaved}:Props){
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [campaignId,setCampaignId]=useState("");
  const [name,setName]=useState("Nueva creatividad");
  const [primaryText,setPrimaryText]=useState("");
  const [headline,setHeadline]=useState("");
  const [cta,setCta]=useState("Comprar");
  const [destination,setDestination]=useState("");
  const [productId,setProductId]=useState("");
  const [media,setMedia]=useState<UploadedMarketplaceMedia[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function load(){
    setLoading(true);
    try{
      const response=await fetch("/api/marketing/campaigns",{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No fue posible cargar las campañas.");
      const rows=(data.campaigns??[]) as Campaign[];
      setCampaigns(rows);
      setCampaignId((current)=>current||rows[0]?.id||"");
    }catch(error){setMessage(error instanceof Error?error.message:"No fue posible cargar las campañas.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load()},[]);

  async function save(){
    if(!campaignId||!media.length||!primaryText.trim()||!headline.trim())return;
    setSaving(true);setMessage(null);
    try{
      const response=await fetch("/api/marketing/campaigns/"+encodeURIComponent(campaignId)+"/creatives",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          name,media:media.map(item=>({kind:item.kind==="video"?"video":"image",url:item.url,name:item.name})),
          primaryTexts:[primaryText.trim()],headlines:[headline.trim()],callToAction:cta.trim()||"Comprar",
          destinationUrl:destination.trim()||null,productId:productId.trim()||null
        })
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No fue posible guardar la creatividad.");
      setMessage("Creatividad preparada y anuncio creado como borrador.");
      setName("Nueva creatividad");setPrimaryText("");setHeadline("");setDestination("");setProductId("");setMedia([]);
      onSaved?.();
    }catch(error){setMessage(error instanceof Error?error.message:"No fue posible guardar la creatividad.");}
    finally{setSaving(false);}
  }

  return <section aria-label="Crear creatividad publicitaria" className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl sm:p-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Creative Builder</p><h2 className="mt-1 text-2xl font-black">Convierte contenido en un anuncio</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Usa vídeo o imágenes reales de Credi, crea variantes de texto y deja el anuncio listo para revisión y activación.</p></div>
      <Megaphone className="size-6 text-[var(--primary)]"/>
    </div>

    {message&&<p role="status" className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-sm">{message}</p>}

    {loading?<p className="mt-6 text-sm text-[var(--muted)]">Cargando campañas…</p>:campaigns.length===0?<div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-7 text-center"><p className="font-black">Primero crea una campaña.</p><p className="mt-1 text-sm text-[var(--muted)]">La creatividad queda ligada a la campaña del propietario.</p></div>:<div className="mt-6 space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="text-sm font-bold">Campaña<select value={campaignId} onChange={e=>setCampaignId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3">{campaigns.map(c=><option key={c.id} value={c.id}>{c.name} · {c.objective} · {c.status}</option>)}</select></label>
        <label className="text-sm font-bold">Nombre de la creatividad<input value={name} onChange={e=>setName(e.target.value)} maxLength={160} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold lg:col-span-2">Texto principal<textarea value={primaryText} onChange={e=>setPrimaryText(e.target.value)} maxLength={500} rows={4} placeholder="Explica la oferta con claridad…" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold">Titular<input value={headline} onChange={e=>setHeadline(e.target.value)} maxLength={160} placeholder="Compra ahora, descubre…" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold">CTA<input value={cta} onChange={e=>setCta(e.target.value)} maxLength={60} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold">Destino<input type="url" value={destination} onChange={e=>setDestination(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold">Producto Credi (opcional)<input value={productId} onChange={e=>setProductId(e.target.value)} placeholder="UUID del producto" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
      </div>

      <div><div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-[var(--primary)]"/><p className="text-sm font-black">Medios de la creatividad</p></div><MarketplaceMediaUploader kind="mixed" multiple maxFiles={10} value={media} onChange={setMedia}/></div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]">El anuncio nace como borrador. La activación exige presupuesto y creatividad preparada.</p>
        <button type="button" onClick={()=>void save()} disabled={saving||!campaignId||!media.length||!primaryText.trim()||!headline.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-40"><Plus className="size-4"/>{saving?"Guardando…":"Crear anuncio borrador"}<ChevronRight className="size-4"/></button>
      </div>
    </div>}
  </section>
}
