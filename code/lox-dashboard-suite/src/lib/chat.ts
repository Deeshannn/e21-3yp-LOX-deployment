export type ChatRole = "sub_admin" | "super_admin"

export type ChatMessage = {
  id: string
  station_id: string
  station_name: string
  sender_role: ChatRole
  sender_user_id: string
  sender_name: string
  recipient_role: ChatRole
  content: string
  read_at_super: string | null
  read_at_sub: string | null
  created_at: string
  updated_at: string
}

export type ChatConversationSummary = {
  station_id: string
  station_name: string
  locker_count: number
  status: string
  unread_count: number
  last_message: ChatMessage | null
  last_message_at: string | null
}

export type ChatNotificationPayload = {
  unread_count: number
  items: ChatMessage[]
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatChatTime(value: string | Date | null | undefined) {
  if (!value) return ""
  return dateFormatter.format(new Date(value))
}

export function formatConversationSnippet(message: ChatMessage | null | undefined) {
  if (!message) return "No messages yet"

  const text = message.content.trim()
  return text.length > 96 ? `${text.slice(0, 93)}...` : text
}