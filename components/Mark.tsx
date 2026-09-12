export function Bell({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className} fill="currentColor">
      <path d="M32 12c-8.8 0-14.5 6.6-14.5 15.5V36c0 2.4-1.2 4.4-3.2 6.1-1.3 1.1-.6 3.2 1.1 3.2h33.2c1.7 0 2.4-2.1 1.1-3.2-2-1.7-3.2-3.7-3.2-6.1v-8.5C46.5 18.6 40.8 12 32 12z" />
      <circle cx="32" cy="50" r="4.2" />
      <rect x="30" y="7" width="4" height="6" rx="2" />
    </svg>
  );
}

export function Mark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Bell className="h-[1.15em] w-[1.15em]" />
      <span className="font-display font-semibold tracking-tight">{name}</span>
    </span>
  );
}
