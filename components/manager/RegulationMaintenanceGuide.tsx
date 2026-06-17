"use client";

import { useCallback, useState } from "react";
import { BookMarked, Check, Copy, ExternalLink, FileCode2, Terminal } from "lucide-react";
import { regulationMaintenanceGuide } from "@/lib/regulation";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-black text-gray-600 transition hover:border-brand-cyan hover:text-brand-cyan"
      title="העתקה"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "הועתק" : "העתק"}
    </button>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-gray-900 px-3 py-2">
      <code className="break-all text-left text-[11px] font-mono text-emerald-300" dir="ltr">
        {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}

export function RegulationMaintenanceGuide() {
  const guide = regulationMaintenanceGuide;

  return (
    <section className="rounded-3xl border-2 border-brand-cyan/30 bg-gradient-to-b from-cyan-50/80 to-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-white text-brand-cyan shadow-sm">
          <BookMarked size={22} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900">{guide.title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-700">{guide.intro}</p>
        </div>
      </div>

      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-bold text-amber-800">
        {guide.disclaimer}
      </p>

      <a
        href={guide.officialUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 inline-flex items-center gap-2 text-sm font-black text-brand-cyan hover:underline"
      >
        <ExternalLink size={16} />
        חוזר 585 באתר משרד החינוך
      </a>

      <div className="mb-6">
        <h4 className="mb-2 text-sm font-black text-gray-800">קבצי מקור (ב-repo)</h4>
        <ul className="grid gap-2 sm:grid-cols-2">
          {guide.sources.map((source) => (
            <li key={source.id} className="rounded-xl border border-gray-100 bg-white p-3 text-xs">
              <p className="font-black text-gray-800">{source.label}</p>
              <code className="mt-1 block break-all font-mono text-[10px] text-gray-600" dir="ltr">
                {source.path}
              </code>
              {source.notes ? <p className="mt-1 text-gray-500">{source.notes}</p> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-black text-gray-800">
          <Terminal size={16} className="text-brand-cyan" />
          תהליכי עדכון
        </h4>
        {guide.workflows.map((workflow) => (
          <details
            key={workflow.id}
            className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm open:ring-1 open:ring-brand-cyan/20"
          >
            <summary className="cursor-pointer list-none text-sm font-black text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-brand-cyan">+</span> {workflow.title}
              <span className="mt-1 block text-xs font-normal text-gray-500">{workflow.when}</span>
            </summary>

            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-xs text-gray-700">
              {workflow.prerequisite ? (
                <p>
                  <span className="font-black">דרישה:</span> {workflow.prerequisite}
                </p>
              ) : null}

              {workflow.steps?.length ? (
                <ol className="list-decimal space-y-1 pr-5">
                  {workflow.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}

              {workflow.commands?.length ? (
                <div className="space-y-2">
                  <p className="font-black text-gray-800">פקודות (טרמינל בפרויקט):</p>
                  {workflow.commands.map((cmd) => (
                    <CommandBlock key={cmd} command={cmd} />
                  ))}
                </div>
              ) : null}

              {workflow.outputs?.length ? (
                <div>
                  <p className="font-black text-gray-800">קבצים שנוצרים / מתעדכנים:</p>
                  <ul className="mt-1 space-y-1">
                    {workflow.outputs.map((out) => (
                      <li key={out}>
                        <code className="font-mono text-[10px] text-gray-600" dir="ltr">
                          {out}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {workflow.priorityTables?.length ? (
                <div>
                  <p className="font-black text-gray-800">טבלאות עדיפות לליטוש:</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {workflow.priorityTables.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-violet-100 bg-violet-50 px-2 py-1 font-mono text-[10px] font-black text-violet-800"
                      >
                        {t.id} — {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {workflow.warnings?.length ? (
                <ul className="space-y-1 rounded-xl border border-red-100 bg-red-50/60 p-3 text-red-800">
                  {workflow.warnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-gray-800">
            <FileCode2 size={16} className="text-brand-cyan" />
            מפת קבצי JSON
          </h4>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100">
            <table className="w-full text-right text-[11px]">
              <thead className="sticky top-0 bg-gray-100 font-black text-gray-700">
                <tr>
                  <th className="p-2">תוכן</th>
                  <th className="p-2" dir="ltr">
                    path
                  </th>
                </tr>
              </thead>
              <tbody>
                {guide.fileMap.map((row) => (
                  <tr key={row.path} className="border-t border-gray-50">
                    <td className="p-2 font-bold text-gray-800">{row.label}</td>
                    <td className="p-2 font-mono text-gray-600" dir="ltr">
                      {row.path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-black text-gray-800">סקריפטים</h4>
          <ul className="space-y-2">
            {guide.scripts.map((script) => (
              <li key={script.path} className="rounded-xl border border-gray-100 bg-white p-3 text-xs">
                <p className="font-black text-gray-800">{script.label}</p>
                <code className="mt-1 block font-mono text-[10px] text-gray-600" dir="ltr">
                  {script.path}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {guide.productNotes.length ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4">
          <p className="mb-2 text-xs font-black text-gray-700">הערות מוצר</p>
          <ul className="list-disc space-y-1 pr-5 text-xs text-gray-600">
            {guide.productNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
