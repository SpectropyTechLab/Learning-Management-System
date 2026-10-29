import ContentAuthorizerShell from "./ContentAuthorizerShell";

const featureCards = [
  {
    title: "Platform Question Bank",
    desc: "Curate reusable question sets for tenants.",
  },
  {
    title: "Content Packs",
    desc: "Bundle courses into licensed packs.",
  },
  {
    title: "Approval Queue",
    desc: "Review and approve platform-level content.",
  },
  {
    title: "Exam Templates",
    desc: "Define reusable exam structures.",
  },
];

export default function ContentAuthorizerDashboard() {
  return (
    <ContentAuthorizerShell
      title="Platform Content Dashboard"
      subtitle="Plan, review, and curate platform-wide content."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Coming soon
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Focus for MVP</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Define platform-level question standards and formats.</li>
            <li>Prepare starter question packs for pilot tenants.</li>
            <li>Set review workflow for question approvals.</li>
          </ul>
        </section>
      </div>
    </ContentAuthorizerShell>
  );
}
