'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Factor {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
}

interface PasskeyRecord {
  id: string;
  friendly_name?: string | null;
  created_at?: string;
  last_used_at?: string | null;
}

export default function SecuritySettings() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSecurityState() {
    setLoading(true);
    setMessage(null);
    try {
      const [{ data: factorData, error: factorError }, { data: passkeyData, error: passkeyError }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.passkey.list(),
      ]);

      if (factorError) throw factorError;
      if (passkeyError) throw passkeyError;

      setFactors((factorData?.all ?? []) as Factor[]);
      setPasskeys((passkeyData ?? []) as PasskeyRecord[]);
    } catch (error) {
      console.error('[SecuritySettings] load failed', error);
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar la seguridad de la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSecurityState();
  }, []);

  async function startTotp() {
    setWorking(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Credi Marketplace Authenticator',
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (error) {
      console.error('[SecuritySettings] TOTP enrollment failed', error);
      setMessage(error instanceof Error ? error.message : 'No fue posible activar el segundo paso.');
    } finally {
      setWorking(false);
    }
  }

  async function verifyTotp() {
    if (!factorId || !/^\d{6}$/.test(totpCode)) {
      setMessage('Introduce el código de 6 dígitos de tu aplicación autenticadora.');
      return;
    }

    setWorking(true);
    setMessage(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (error) throw error;

      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setTotpCode('');
      setMessage('Autenticación en dos pasos activada correctamente.');
      await loadSecurityState();
    } catch (error) {
      console.error('[SecuritySettings] TOTP verification failed', error);
      setMessage(error instanceof Error ? error.message : 'El código no pudo verificarse.');
    } finally {
      setWorking(false);
    }
  }

  async function addPasskey() {
    setWorking(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;

      setMessage('Llave de acceso registrada correctamente para este dispositivo.');
      await loadSecurityState();
    } catch (error) {
      console.error('[SecuritySettings] passkey registration failed', error);
      setMessage(error instanceof Error ? error.message : 'No fue posible registrar la llave de acceso.');
    } finally {
      setWorking(false);
    }
  }

  async function removePasskey(id: string) {
    setWorking(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
      if (error) throw error;
      setMessage('Llave de acceso eliminada.');
      await loadSecurityState();
    } catch (error) {
      console.error('[SecuritySettings] passkey deletion failed', error);
      setMessage(error instanceof Error ? error.message : 'No fue posible eliminar la llave de acceso.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Seguridad de la cuenta</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Protege tu acceso</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Puedes usar autenticación en dos pasos con una aplicación autenticadora y registrar llaves de acceso para tus dispositivos.
        </p>
      </header>

      {message && (
        <p role="status" aria-live="polite" className="rounded-2xl border border-border bg-muted p-4 text-sm text-foreground">
          {message}
        </p>
      )}

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="mfa-title">
        <h2 id="mfa-title" className="text-xl font-black text-foreground">Autenticación en dos pasos</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Usa una aplicación autenticadora para generar un código temporal de 6 dígitos al iniciar sesión.
        </p>

        {loading ? (
          <p className="mt-5 text-sm text-muted-foreground">Cargando configuración...</p>
        ) : (
          <>
            {factors.filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified').length > 0 && (
              <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                2FA TOTP está activo en esta cuenta.
              </p>
            )}

            {!factorId && factors.filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified').length === 0 && (
              <button
                type="button"
                onClick={startTotp}
                disabled={working}
                className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Activar 2FA
              </button>
            )}

            {factorId && qrCode && (
              <div className="mt-5 space-y-4 rounded-2xl border border-border bg-background p-5">
                <p className="text-sm font-semibold text-foreground">Escanea este QR con tu aplicación autenticadora y confirma el código.</p>
                <img src={qrCode} alt="Código QR para activar autenticación en dos pasos" className="mx-auto h-52 w-52 rounded-xl border border-border bg-white p-2" />
                <p className="break-all text-xs text-muted-foreground">Clave manual: {secret}</p>
                <label className="block text-sm font-semibold text-foreground">
                  Código de verificación
                  <input
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    aria-label="Código de verificación de autenticación en dos pasos"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 tracking-[0.3em] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <button
                  type="button"
                  onClick={verifyTotp}
                  disabled={working || totpCode.length !== 6}
                  className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  Verificar y activar
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="passkey-title">
        <h2 id="passkey-title" className="text-xl font-black text-foreground">Llaves de acceso de tus dispositivos</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Registra Windows Hello, biometría del dispositivo, PIN del dispositivo o una llave de seguridad compatible. La clave privada permanece en tu autenticador.
        </p>
        <button
          type="button"
          onClick={addPasskey}
          disabled={working}
          className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Registrar este dispositivo
        </button>
        <div className="mt-6 space-y-3">
          {passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay llaves de acceso registradas.</p>
          ) : (
            passkeys.map((passkey) => (
              <div key={passkey.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-foreground">{passkey.friendly_name || 'Dispositivo'}</p>
                  <p className="text-xs text-muted-foreground">Registrado: {passkey.created_at ? new Date(passkey.created_at).toLocaleString() : '—'}</p>
                  <p className="text-xs text-muted-foreground">Último uso: {passkey.last_used_at ? new Date(passkey.last_used_at).toLocaleString() : 'Aún no utilizado'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removePasskey(passkey.id)}
                  disabled={working}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
