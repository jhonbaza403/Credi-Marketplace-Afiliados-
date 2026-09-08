"use client";

import { useEffect, useState } from "react";

const statusLabels: Record<string, string> = {
  not_started: "No iniciado",
  pending: "Pendiente",
  submitted: "Enviado",
  in_review: "En revisión",
  additional_information: "Información adicional requerida",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
  suspended: "Suspendido",
};

type CaseSummary = { id: string; status: string };

async function upload(caseType: "kyc" | "kyb", caseId: string, documentType: string, file: File) {
  const form = new FormData();
  form.set("caseType", caseType);
  form.set("caseId", caseId);
  form.set("documentType", documentType);
  form.set("file", file);
  const response = await fetch("/api/compliance/upload", { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No fue posible subir el documento");
}

export default function ComplianceCenter() {
  const [kyc, setKyc] = useState<CaseSummary | null>(null);
  const [kyb, setKyb] = useState<CaseSummary | null>(null);
  const [kycCountry, setKycCountry] = useState("VE");
  const [kycDocumentType, setKycDocumentType] = useState("id_front");
  const [kycPrimary, setKycPrimary] = useState<File | null>(null);
  const [kycBack, setKycBack] = useState<File | null>(null);
  const [kycSelfie, setKycSelfie] = useState<File | null>(null);
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [kybCountry, setKybCountry] = useState("VE");
  const [legalAddress, setLegalAddress] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");
  const [uboName, setUboName] = useState("");
  const [uboPercent, setUboPercent] = useState("100");
  const [uboCountry, setUboCountry] = useState("VE");
  const [incorporation, setIncorporation] = useState<File | null>(null);
  const [taxCertificate, setTaxCertificate] = useState<File | null>(null);
  const [registryExtract, setRegistryExtract] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);
  const [bylaws, setBylaws] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/compliance/status")
      .then((r) => r.json())
      .then((data) => {
        setKyc(data.kyc ?? null);
        setKyb(data.kyb ?? null);
      })
      .catch(() => setMessage("No se pudo cargar el estado de cumplimiento."));
  }, []);

  async function submitKyc() {
    if (!kycPrimary) throw new Error("Selecciona el documento principal");
    const response = await fetch("/api/compliance/kyc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ country: kycCountry, documentType: kycDocumentType }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No fue posible crear el caso KYC");
    setKyc(data.case);
    await upload("kyc", data.case.id, kycDocumentType, kycPrimary);
    if (kycBack) await upload("kyc", data.case.id, "id_back", kycBack);
    if (kycSelfie) await upload("kyc", data.case.id, "selfie", kycSelfie);
  }

  async function submitKyb() {
    if (!legalName || !taxId || !registrationNumber || !legalAddress || !businessActivity || !uboName) {
      throw new Error("Completa todos los campos obligatorios de KYB");
    }
    const response = await fetch("/api/compliance/kyb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        legalName,
        tradeName,
        taxId,
        registrationNumber,
        country: kybCountry,
        legalAddress,
        businessActivity,
        ubos: [{ fullName: uboName, ownershipPercent: Number(uboPercent), country: uboCountry }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No fue posible crear el caso KYB");
    setKyb(data.case);
    const uploads: Array<[string, File | null]> = [
      ["incorporation", incorporation],
      ["tax_certificate", taxCertificate],
      ["registry_extract", registryExtract],
      ["proof_of_address", proofOfAddress],
      ["bylaws", bylaws],
    ];
    for (const [type, file] of uploads) if (file) await upload("kyb", data.case.id, type, file);
  }

  async function submit(kind: "kyc" | "kyb") {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "kyc") await submitKyc();
      else await submitKyb();
      setMessage("Solicitud enviada correctamente. Quedará pendiente de verificación y revisión.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <p className="text-sm font-medium text-sky-600">Compliance</p>
        <h1 className="text-3xl font-bold tracking-tight">Verificación KYC y KYB</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Presenta la información mínima necesaria. Los documentos se almacenan en buckets privados y el estado se actualiza desde el servidor.</p>
      </header>

      {message && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">{message}</div>}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">KYC · Persona</h2>
              <p className="text-sm text-slate-500">Identidad y comprobaciones de riesgo</p>
            </div>
            {kyc && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{statusLabels[kyc.status] ?? kyc.status}</span>}
          </div>

          {!kyc || ["rejected", "expired"].includes(kyc.status) ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium">País<select className="mt-1 w-full rounded-md border p-2" value={kycCountry} onChange={(e) => setKycCountry(e.target.value)}><option value="VE">Venezuela</option><option value="US">Estados Unidos</option><option value="NL">Países Bajos</option></select></label>
              <label className="block text-sm font-medium">Documento principal<select className="mt-1 w-full rounded-md border p-2" value={kycDocumentType} onChange={(e) => setKycDocumentType(e.target.value)}><option value="id_front">Cédula / documento nacional</option><option value="passport">Pasaporte</option><option value="drivers_license">Licencia</option></select></label>
              <label className="block text-sm font-medium">Documento principal<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setKycPrimary(e.target.files?.[0] ?? null)} /></label>
              <label className="block text-sm font-medium">Reverso del documento<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setKycBack(e.target.files?.[0] ?? null)} /></label>
              <label className="block text-sm font-medium">Selfie (opcional)<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setKycSelfie(e.target.files?.[0] ?? null)} /></label>
              <button disabled={busy} onClick={() => void submit("kyc")} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Enviar KYC"}</button>
            </div>
          ) : <p className="text-sm text-slate-600">Tu solicitud ya está activa. Mantén tus datos disponibles para una eventual revisión adicional.</p>}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="text-xl font-semibold">KYB · Empresa</h2><p className="text-sm text-slate-500">Empresa, documentación y beneficiario final</p></div>
            {kyb && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{statusLabels[kyb.status] ?? kyb.status}</span>}
          </div>

          {!kyb || ["rejected", "expired"].includes(kyb.status) ? (
            <div className="space-y-4">
              <input className="w-full rounded-md border p-2" placeholder="Razón social *" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              <input className="w-full rounded-md border p-2" placeholder="Nombre comercial" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
              <input className="w-full rounded-md border p-2" placeholder="Número fiscal *" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              <input className="w-full rounded-md border p-2" placeholder="Número de registro *" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
              <select className="w-full rounded-md border p-2" value={kybCountry} onChange={(e) => setKybCountry(e.target.value)}><option value="VE">Venezuela</option><option value="US">Estados Unidos</option><option value="NL">Países Bajos</option></select>
              <input className="w-full rounded-md border p-2" placeholder="Domicilio legal *" value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} />
              <textarea className="min-h-24 w-full rounded-md border p-2" placeholder="Actividad económica *" value={businessActivity} onChange={(e) => setBusinessActivity(e.target.value)} />
              <div className="grid gap-3 sm:grid-cols-3"><input className="rounded-md border p-2" placeholder="UBO *" value={uboName} onChange={(e) => setUboName(e.target.value)} /><input className="rounded-md border p-2" inputMode="decimal" placeholder="%" value={uboPercent} onChange={(e) => setUboPercent(e.target.value)} /><input className="rounded-md border p-2" placeholder="País" value={uboCountry} onChange={(e) => setUboCountry(e.target.value.toUpperCase())} /></div>
              <label className="block text-sm font-medium">Acta / incorporación<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setIncorporation(e.target.files?.[0] ?? null)} /></label>
              <label className="block text-sm font-medium">Certificado fiscal<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setTaxCertificate(e.target.files?.[0] ?? null)} /></label>
              <label className="block text-sm font-medium">Registro mercantil<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setRegistryExtract(e.target.files?.[0] ?? null)} /></label>
              <label className="block text-sm font-medium">Domicilio legal<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] ?? null)} /></label>
              <label className="block text-sm font-medium">Estatutos (opcional)<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setBylaws(e.target.files?.[0] ?? null)} /></label>
              <button disabled={busy} onClick={() => void submit("kyb")} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Enviar KYB"}</button>
            </div>
          ) : <p className="text-sm text-slate-600">Tu solicitud empresarial ya está activa y en proceso de cumplimiento.</p>}
        </article>
      </section>
    </main>
  );
}
