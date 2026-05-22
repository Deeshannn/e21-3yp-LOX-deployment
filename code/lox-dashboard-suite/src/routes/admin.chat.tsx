import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/layout/AppShell"
import { ChatWorkspace } from "@/components/chat/ChatWorkspace"

export const Route = createFileRoute("/admin/chat")({
  head: () => ({ meta: [{ title: "Chat — LOX" }] }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <AppShell role="sub" title="Chat & Communication">
      <ChatWorkspace role="sub" />
    </AppShell>
  );
}
