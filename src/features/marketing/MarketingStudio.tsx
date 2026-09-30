"use client";

import { useEffect,useMemo,useState } from "react";
import { BarChart3,BrainCircuit,CalendarClock,ChevronRight,Megaphone,Pause,Play,Plus,Sparkles,Target,WalletCards } from "lucide-react";

type Campaign={id:string;name:string;objective:string;status:string;currency:string;daily_budget:number;lifetime_budget:number|null;start_at:string|null;end_at:string|null;destination_url:string|null;optimization_goal:string;bid_strategy:string;placement_config:string[];metrics:{impressions:number;clicks:number;purchases:number;spend:number;revenue:number}};

const OBJECTIVES=[["sales","Ventas","Compras y valor de conversión"],["traffic","Tráfico","Visitas calificadas"],["leads","Leads","Contactos comerciales"],["engagement","Interacción","Interacción con contenido"],["awareness","Reconocimiento","Cobertura de marca"],["catalog","Catálogo","Productos del Marketplace"],["live_attendance","Asistencia LIVE","Asistencia a Credi LIVE"]] as const;
const PLACEMENTS=[["credi_wall","Muro"],["credi_story","Historias"],["credi_reel","Reels"],["credi_marketplace","Marketplace"],["credi_live","LIVE"]] as const;

export default function MarketingStudio(){
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [name,setName]=useState("Nueva campaña Credi");
  const [objective,setObjective]=useState<Campaign["objective"]>("sales");
  const [dailyBudget,setDailyBudget]=useState("10");
  const [destinationUrl,setDestinationUrl]=useState("");
  const [placements,setPlacements]=useState<string[]>(PLACEMENTS.map(([id])=>id));

  async function load(){
    setLoading(true);
    try{const response=await fetch("/api/marketing/campaigns",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"No fue posible cargar Marketing Studio.");setCampaigns(data.campaigns??[]);}
    catch(error){setMessage(error instanceof Error?error.message:"No fue posible cargar Marketing Studio.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load()},[]);

  const totals=useMemo(()=>campaigns.reduce((a,c)=>({impressions:a.impressions+Number(c.metrics.impressions||0),clicks:a.clicks+Number(c.metrics.clicks||0),purchases:a.purchases+Number(c.metrics.purchases||0),spend:a.spend+Number(c.metrics.spend||0),revenue:a.revenue+Number(c.metrics.revenue||0)}),{impressions:0,clicks:0,purchases:0,spend:0,revenue:0}),[campaigns]);

  function toggle(id:string){setPlacements(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);}

  async function createCampaign(){
    setSaving(true);setMessage(null);
    try{
      const response=await fetch("/api/marketing/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        name,objective,dailyBudget:Number(dailyBudget),placements,destinationUrl:destinationUrl.trim()||null,
        audience:{type:"broad",countries:[],ageMin:18,ageMax:65,interests:[],excludeExistingCustomers:false}
      })});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No fue posible crear la campaña.");
      setMessage("Campaña creada como borrador. Continúa con creatividad, revisión y activación.");
      setOpen(false);await load();
    }catch(error){setMessage(error instanceof Error?error.message:"No fue posible crear la campaña.");}
    finally{setSaving(false);}
  }

  async function status(id:string,next:string){
    try{
      const response=await fetch("/api/marketing/campaigns/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"No fue posible actualizar la campaña.");
      setCampaigns(current=>current.map(c=>c.id===id?{...c,...data.campaign}:c));
    }catch(error){setMessage(error instanceof Error?error.message:"No fue posible actualizar la campaña.");}
  }

  return <div className="space-y-7">
    <header className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
      <div className="bg-gradient-to-br from-slate-950 via-brand-950 to-cyan-950 px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl"><span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-cyan-100"><Sparkles className="size-4"/> Credi Marketing Studio</span><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Campañas, audiencias y negocio en un solo lugar.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">Convierte publicaciones, historias, reels, Marketplace y LIVE en campañas medibles con presupuesto, segmentación, creatividad y atribución.</p></div>
          <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-cyan-200"><Plus className="size-4"/> Nueva campaña</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">{[["Campañas",campaigns.length],["Impresiones",totals.impressions.toLocaleString("es-ES")],["Compras",totals.purchases.toLocaleString("es-ES")],["ROAS",totals.spend? (totals.revenue/totals.spend).toFixed(2):"—"]].map(([label,value])=><div key={String(label)} className="bg-[var(--surface)] p-5"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black">{String(value)}</p></div>)}</div>
    </header>

    {message&&<p role="status" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-sm">{message}</p>}

    {open&&<section aria-label="Crear campaña" className="rounded-[2rem] border border-cyan-300/15 bg-[var(--surface)] p-6 shadow-xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Campaign Builder</p><h2 className="mt-1 text-2xl font-black">Nueva campaña</h2></div><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold">Cerrar</button></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="text-sm font-bold">Nombre<input value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold">Objetivo<select value={objective} onChange={e=>setObjective(e.target.value as Campaign["objective"])} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3">{OBJECTIVES.map(([id,label,description])=><option key={id} value={id}>{label} — {description}</option>)}</select></label>
        <label className="text-sm font-bold">Presupuesto diario<input type="number" min="0" step="0.01" value={dailyBudget} onChange={e=>setDailyBudget(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
        <label className="text-sm font-bold">Destino opcional<input type="url" value={destinationUrl} onChange={e=>setDestinationUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
      </div>
      <div className="mt-6"><p className="text-sm font-black">Dónde aparecerá</p><div className="mt-3 flex flex-wrap gap-2">{PLACEMENTS.map(([id,label])=><button key={id} type="button" onClick={()=>toggle(id)} className={"rounded-full border px-4 py-2 text-xs font-black "+(placements.includes(id)?"border-cyan-300/30 bg-cyan-300/10 text-cyan-700":"border-[var(--border)] text-[var(--muted)]")}>{label}</button>)}</div></div>
      <div className="mt-7 flex justify-end"><button type="button" disabled={saving||!placements.length} onClick={()=>void createCampaign()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving?"Creando…":"Crear borrador"}<ChevronRight className="size-4"/></button></div>
    </section>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Planificador","Calendario, presupuesto y pacing.",CalendarClock],
      ["Audiencias","Broad, custom, retargeting, lookalike e intereses.",Target],
      ["Creatividad","Variantes de imagen, vídeo, copy y CTA.",Megaphone],
      ["Intelligence","Experimentos, atribución y señales.",BrainCircuit]
    ].map(([title,body,Icon])=><article key={String(title)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Icon className="size-5 text-[var(--primary)]"/><h2 className="mt-3 font-black">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{String(body)}</p></article>)}</section>

    <section>
      <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Performance</p><h2 className="mt-1 text-2xl font-black">Tus campañas</h2></div><BarChart3 className="size-5 text-[var(--muted)]"/></div>
      {loading?<div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">Cargando…</div>:campaigns.length===0?<div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center"><p className="text-lg font-black">Aún no tienes campañas.</p><p className="mt-2 text-sm text-[var(--muted)]">Crea la primera y mantén contenido, comercio y LIVE dentro de la misma campaña.</p><button type="button" onClick={()=>setOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white"><Plus className="size-4"/> Crear campaña</button></div>:<div className="space-y-4">{campaigns.map(c=><article key={c.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{c.name}</h3><span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-[10px] font-black uppercase">{c.status}</span><span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--primary)]">{c.objective}</span></div><p className="mt-2 text-xs text-[var(--muted)]">Diario {c.currency} {Number(c.daily_budget).toFixed(2)} · optimización {c.optimization_goal}</p></div><div>{c.status==="active"?<button type="button" onClick={()=>void status(c.id,"paused")} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black"><Pause className="size-3.5"/> Pausar</button>:<button type="button" disabled={Number(c.daily_budget)<=0} onClick={()=>void status(c.id,"active")} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Play className="size-3.5"/> Activar</button>}</div></div></article>)}</div>}
    </section>

    <section className="rounded-[2rem] border border-cyan-300/10 bg-cyan-300/[.04] p-6 sm:p-8"><div className="flex items-center gap-2 text-cyan-700"><WalletCards className="size-5"/><p className="text-xs font-black uppercase tracking-[.16em]">Ciclo comercial</p></div><h2 className="mt-2 text-2xl font-black">Publicidad conectada a ventas</h2><p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]">Credi puede medir el recorrido desde impresión y vídeo hasta clic, conversación, checkout, compra y atribución de afiliado.</p></section>
  </div>;
}
