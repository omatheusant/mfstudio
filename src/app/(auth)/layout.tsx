export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 bg-muted/40 p-6">
      <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          M
        </span>
        MF STUDIO
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
