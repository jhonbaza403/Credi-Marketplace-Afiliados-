'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UserReputationBadgeProps {
  userId: string;
  className?: string;
}

interface ReputationState {
  average: number | null;
  total: number;
}

export default function UserReputationBadge({
  userId,
  className = '',
}: UserReputationBadgeProps) {
  const [reputation, setReputation] = useState<ReputationState>({
    average: null,
    total: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchReputation() {
      if (!userId) {
        if (mounted) {
          setReputation({
            average: null,
            total: 0,
          });

          setLoading(false);
        }

        return;
      }

      setLoading(true);

      try {
        /*
         * En esta primera versión consultamos únicamente las
         * calificaciones públicas del usuario.
         *
         * La reputación NO debe depender de campos administrativos
         * como profiles.is_active.
         */
        const { data, error } = await supabase
          .from('ratings')
          .select('rating')
          .eq('target_user_id', userId);

        if (error) {
          throw error;
        }

        if (!mounted) return;

        if (!data || data.length === 0) {
          setReputation({
            average: null,
            total: 0,
          });

          return;
        }

        const validRatings = data.filter(
          (item): item is { rating: number } =>
            typeof item.rating === 'number' &&
            Number.isFinite(item.rating) &&
            item.rating >= 1 &&
            item.rating <= 5
        );

        if (validRatings.length === 0) {
          setReputation({
            average: null,
            total: 0,
          });

          return;
        }

        const total = validRatings.length;

        const sum = validRatings.reduce(
          (accumulator, item) => accumulator + item.rating,
          0
        );

        const average = Number((sum / total).toFixed(1));

        setReputation({
          average,
          total,
        });
      } catch (error) {
        console.error(
          '[UserReputationBadge] Error loading reputation:',
          error
        );

        if (!mounted) return;

        setReputation({
          average: null,
          total: 0,
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchReputation();

    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <span
        className={`inline-flex items-center text-xs text-muted-foreground animate-pulse ${className}`}
        aria-live="polite"
      >
        Cargando reputación…
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={
        reputation.average !== null
          ? `Calificación ${reputation.average} de 5 basada en ${reputation.total} ${
              reputation.total === 1 ? 'opinión' : 'opiniones'
            }`
          : 'Usuario sin calificaciones'
      }
    >
      <span
        className="text-amber-400 text-sm leading-none"
        aria-hidden="true"
      >
        ★
      </span>

      <span className="text-xs font-bold text-foreground">
        {reputation.average !== null ? reputation.average.toFixed(1) : 'Nuevo'}
      </span>

      <span className="text-[11px] text-muted-foreground">
        (
        {reputation.total}{' '}
        {reputation.total === 1 ? 'opinión' : 'opiniones'}
        )
      </span>
    </div>
  );
}
