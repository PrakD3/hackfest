export default function AboutUsPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="rounded-2xl border bg-card p-8" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          About Us
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-5">Hackfest26 Team 24</h1>
        <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
          Drug Discovery AI is built by a student team focused on practical, explainable
          computational workflows for early-stage therapeutic research.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <TeamCard name="Prateek D Shriyan" href="https://github.com/PrakD3" />
          <TeamCard name="Rafan Ahamad Sheik" href="https://github.com/Dinaltium" />
          <TeamCard name="Syed Mohammed Ghouse" href="https://github.com/s4184271-sys" />
          <TeamCard name="Manya H R" />
        </div>
      </div>
    </main>
  );
}

function TeamCard({ name, href }: { name: string; href?: string }) {
  return (
    <article
      className="rounded-xl border bg-background p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-semibold">{name}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          {href}
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">No public profile link available.</p>
      )}
    </article>
  );
}
