/* eslint-disable @next/next/no-img-element */
export function Logo({ className = "" }: { className?: string }) {
  return <img src="/logo.png" alt="" className={`rounded-[0.18em] ${className}`} />;
}

function BrandName({ name }: { name: string }) {
  if (name === "TeacherAid") {
    return (
      <span className="font-display font-medium tracking-tight">
        <span className="text-brand-red">Teacher</span>
        <span className="text-brand-green">Aid</span>
      </span>
    );
  }
  return <span className="font-display font-medium tracking-tight text-brand-red">{name}</span>;
}

export function Mark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo className="h-[1.15em] w-[1.15em]" />
      <BrandName name={name} />
    </span>
  );
}
