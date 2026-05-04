import { Loader2 } from "lucide-react";

export function CenteredLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ApiError({ message }: { message: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 border-destructive/40">
      <h3 className="font-display font-semibold text-destructive mb-1">Couldn't reach the API</h3>
      <p className="text-sm text-muted-foreground break-words">{message}</p>
      <p className="text-xs text-muted-foreground mt-3">
        Make sure your backend is running at <code className="text-foreground">http://localhost:5000</code> and
        has CORS enabled for this preview origin.
      </p>
    </div>
  );
}
