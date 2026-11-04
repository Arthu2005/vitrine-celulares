export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(60%_50%_at_50%_100%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_70%)] px-4">
      <div className="w-full max-w-[380px]">{children}</div>
    </main>
  )
}
