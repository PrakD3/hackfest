export default function TermsAndConditionsPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <article className="rounded-2xl border bg-card p-8" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Legal
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Terms and Conditions</h1>

        <section className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Drug Discovery AI is provided as-is for non-clinical research and educational
            demonstration purposes.
          </p>
          <p>
            You are responsible for validating all outputs experimentally and for ensuring
            compliance with applicable laws and institutional policies.
          </p>
          <p>
            The maintainers are not liable for decisions made solely on generated computational
            predictions.
          </p>
          <p>
            Third-party APIs and models may change behavior, availability, pricing, or terms at any
            time.
          </p>
          <p>Continued use of this project constitutes acceptance of these terms.</p>
        </section>
      </article>
    </main>
  );
}
