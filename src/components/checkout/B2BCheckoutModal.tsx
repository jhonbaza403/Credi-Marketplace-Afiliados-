'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface B2BCheckoutModalProps {
  productId: string;
  productName: string;
  wholesalePrice: number;
  minQuantity: number;
  maxQuantity?: number;
  supplierId?: string | null;
  binancePayId?: string;
  usdtWalletAddress?: string;
  onClose?: () => void;
}

export default function B2BCheckoutModal({
  productId,
  productName,
  wholesalePrice,
  minQuantity,
  maxQuantity,
  supplierId,
  onClose,
}: B2BCheckoutModalProps) {
  const effectiveMax = Math.max(maxQuantity ?? minQuantity, minQuantity);
  const [quantity, setQuantity] = useState(minQuantity);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setError(null);
    setMessage(null);
    onClose?.();
  };

  const submit = async () => {
    setError(null);
    setMessage(null);
    const safeQuantity = Math.min(effectiveMax, Math.max(minQuantity, Math.floor(quantity)));

    if (!productId || safeQuantity < minQuantity) {
      setError('La cantidad solicitada no es válida.');
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setError('Debes iniciar sesión para realizar una solicitud B2B.');
        return;
      }

      const total = Number((safeQuantity * wholesalePrice).toFixed(2));
      const { error: insertError } = await supabase.from('b2b_orders').insert({
        user_id: user.id,
        product_id: productId,
        product_title: productName,
        supplier_id: supplierId ?? null,
        quantity: safeQuantity,
        unit_price_usd: wholesalePrice,
        total_usd: total,
        status: 'verifying',
      });

      if (insertError) throw insertError;
      setQuantity(safeQuantity);
      setMessage('Solicitud B2B registrada correctamente.');
    } catch (cause) {
      console.error('[B2BCheckoutModal] Error:', cause);
      setError(cause instanceof Error ? cause.message : 'No fue posible registrar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90">
        Solicitar compra B2B
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-foreground">Solicitud B2B</h2>
                <p className="mt-1 text-sm text-muted-foreground">{productName}</p>
              </div>
              <button type="button" onClick={close} className="text-sm font-bold text-muted-foreground">Cerrar</button>
            </div>

            <label className="mt-6 block text-sm font-bold text-foreground" htmlFor="b2b-quantity">Cantidad</label>
            <input
              id="b2b-quantity"
              type="number"
              min={minQuantity}
              max={effectiveMax}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />

            <p className="mt-3 text-sm text-muted-foreground">
              Total estimado: {(Math.min(effectiveMax, Math.max(minQuantity, Math.floor(quantity))) * wholesalePrice).toFixed(2)} USD
            </p>

            {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{message}</p>}

            <button type="button" disabled={submitting} onClick={submit} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">
              {submitting ? 'Registrando…' : 'Confirmar solicitud'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
