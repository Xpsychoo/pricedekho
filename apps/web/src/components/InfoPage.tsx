import type { ReactNode } from "react";

export function InfoPage({ title, children, draft = false }: { title: string; children: ReactNode; draft?: boolean }) {
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
      {draft && (
        <p role="note" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
          Draft placeholder — this page must be reviewed and completed (including legal review) before public launch.
        </p>
      )}
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
