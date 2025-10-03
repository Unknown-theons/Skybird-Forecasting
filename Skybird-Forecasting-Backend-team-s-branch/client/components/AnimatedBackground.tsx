export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -inset-1 bg-[radial-gradient(1200px_600px_at_10%_-10%,hsl(var(--wc-sky-300))_0%,transparent_60%),radial-gradient(1000px_500px_at_110%_10%,hsl(var(--wc-sky-50))_0%,transparent_55%),radial-gradient(800px_400px_at_50%_120%,hsl(var(--wc-sky-50))_0%,transparent_50%)] animate-bg-pan-slow opacity-70" />
      <div className="absolute inset-0 mix-blend-soft-light">
        <div className="absolute left-[10%] top-[20%] h-40 w-40 animate-float-slow rounded-full bg-[hsl(var(--wc-blue-100))] blur-3xl" />
        <div className="absolute left-[70%] top-[30%] h-32 w-32 animate-float-slow rounded-full bg-[hsl(var(--wc-green-100))] blur-3xl [animation-delay:1.2s]" />
        <div className="absolute left-[40%] top-[70%] h-36 w-36 animate-float-slow rounded-full bg-[hsl(var(--wc-blue-200))] blur-3xl [animation-delay:2s]" />
      </div>
    </div>
  );
}
