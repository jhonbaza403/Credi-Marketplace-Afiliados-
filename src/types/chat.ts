export type ChatConversationKind = 'direct' | 'group' | 'business' | 'support'
export type ChatMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'file' | 'link' | 'system' | 'quote' | 'product' | 'order'

export interface ChatConversation {
  id: string
  kind: ChatConversationKind
  title: string | null
  created_by: string
  product_id: string | null
  order_id: string | null
  store_id: string | null
  b2b_product_id: string | null
  updated_at: string
  created_at: string
  member_ids: string[]
  display_name: string
  unread: number
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_type: ChatMessageType
  body: string | null
  reply_to_id: string | null
  edited_at: string | null
  deleted_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ChatAttachment {
  id: string
  message_id: string
  storage_path: string
  public_url: string | null
  file_name: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  duration_ms: number | null
}
