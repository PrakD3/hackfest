export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <article
        className="rounded-2xl border bg-card p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Legal
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Privacy Policy</h1>

        <section className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Drug Discovery AI stores limited session metadata to support
            analysis workflows, discovery history, and usability improvements.
          </p>
          <p>
            We do not provide medical diagnosis or treatment guidance. Inputs
            and outputs are computational research artifacts.
          </p>
          <p>
            If database persistence is enabled, saved records may include query
            text, mutation context, lead metadata, and timestamps.
          </p>
          <p>
            External service providers (LLM APIs and public scientific APIs) may
            receive the minimum required request context to generate results.
          </p>
          <p>
            By using this project, you acknowledge that it is for hackathon,
            educational, and research-oriented usage.
          </p>
        </section>
      </article>
    </main>
  );
}
