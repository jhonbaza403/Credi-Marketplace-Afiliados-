'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface UserReputationBadgeProps {
  userId?: string;
  score?: number;
  verified?: boolean;
  className?: string;
}

interface ReputationState {
  average: number | null;
  total: number;
}

export default function UserReputationBadge({
  userId,
  score,
  verified,
  className = '',
}: UserReputationBadgeProps) {
  const [reputation, setReputation] = useState<ReputationState>({
    average: typeof score === 'number' ? score : null,
    total: 0,
  });
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setReputation({
        average: typeof score === 'number' ? score : null,
        total: 0,
      });
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchReputation = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ratings')
          .select('rating')
          .eq('target_user_id', userId);

        if (error) throw error;
        if (!mounted) return;

        const validRatings = (data ?? []).filter(
          (item): item is { rating: number } =>
            typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating >= 1 && item.rating <= 5,
        );

        if (validRatings.length === 0) {
          setReputation({
            average: typeof score === 'number' ? score : null,
            total: 0,
          });
          return;
        }

        const total = validRatings.length;
        const average = Number(
          (validRatings.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1),
        );
        setReputation({ average, total });
      } catch (error) {
        console.error('[UserReputationBadge] Error loading reputation:', error);
        if (mounted) {
          setReputation({
            average: typeof score === 'number' ? score : null,
            total: 0,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchReputation();
    return () => {
      mounted = false;
    };
  }, [score, userId]);

  if (loading) {
    return <span className={`text-xs text-muted-foreground animate-pulse ${className}`}>Cargando reputación…</span>;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={
        reputation.average !== null
          ? `Calificación ${reputation.average} de 5 basada en ${reputation.total} opiniones`
          : 'Usuario sin calificaciones'
      }
    >
      <span aria-hidden="true">★</span>
      <span className="text-xs font-bold text-foreground">
        {reputation.average !== null ? reputation.average.toFixed(1) : 'Nuevo'}
      </span>
      {verified && <span className="text-[11px] text-emerald-600">Verificado</span>}
      <span className="text-[11px] text-muted-foreground">({reputation.total})</span>
    </div>
  );
}
