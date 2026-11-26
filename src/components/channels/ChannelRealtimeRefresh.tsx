'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChannelRealtimeRefresh({ channelId }: { channelId: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase.channel(`credi-broadcast-channel:${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'broadcast_channel_posts',
        filter: `channel_id=eq.${channelId}`,
      }, () => router.refresh())
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [channelId, router, supabase])

  return null
}
