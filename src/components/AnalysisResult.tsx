import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type {
  AnalysisResultData,
  RiskLevel,
  ScamClassification,
} from "../types";

interface AnalysisResultProps {
  result: AnalysisResultData;
}

function getClassificationStyle(classification: ScamClassification) {
  switch (classification) {
    case "Likely Scam":
      return {
        container: "bg-red-50 border-red-200 text-red-800",
        icon: <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />,
      };
    case "Suspicious":
      return {
        container: "bg-amber-50 border-amber-200 text-amber-900",
        icon: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />,
      };
    default:
      return {
        container: "bg-emerald-50 border-emerald-200 text-emerald-800",
        icon: <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />,
      };
  }
}

function getRiskStyle(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case "High":
      return {
        container: "bg-red-50 border-red-200 text-red-800",
        icon: <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />,
        label: "High Risk",
      };
    case "Medium":
      return {
        container: "bg-amber-50 border-amber-200 text-amber-900",
        icon: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />,
        label: "Medium Risk",
      };
    default:
      return {
        container: "bg-emerald-50 border-emerald-200 text-emerald-800",
        icon: <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />,
        label: "Low Risk",
      };
  }
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  const [copied, setCopied] = useState(false);

  const classificationStyle = getClassificationStyle(result.classification);
  const riskStyle = getRiskStyle(result.risk_level);

  async function handleCopyTranslation() {
    if (!result.pashto_translation) return;
    try {
      await navigator.clipboard.writeText(result.pashto_translation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Classification & Risk Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Classification</p>
          <div
            className={`mt-3 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-base font-semibold ${classificationStyle.container}`}
          >
            {classificationStyle.icon}
            <span>{result.classification}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Risk Level</p>
          <div
            className={`mt-3 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-base font-semibold ${riskStyle.container}`}
          >
            {riskStyle.icon}
            <span>{riskStyle.label}</span>
          </div>
        </div>
      </div>

      {/* Pashto Translation */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Pashto Translation
            </h3>
            <p className="font-pashto mt-0.5 text-sm text-slate-500" dir="rtl" lang="ps">
              پښتو ژباړه
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyTranslation}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Copy Pashto</span>
              </>
            )}
          </button>
        </div>

        <div
          className="font-pashto mt-4 rounded-lg bg-blue-50/70 p-4 text-right text-lg leading-[2.15] text-slate-900"
          dir="rtl"
          lang="ps"
        >
          {result.pashto_translation || "Translation not available."}
        </div>
      </section>

      {/* Assessment Reasons */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">
          Detection Reasons
        </h3>
        <ul className="mt-4 divide-y divide-slate-100">
          {result.reasons.length > 0 ? (
            result.reasons.map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 text-sm leading-relaxed text-slate-700"
              >
                <span className="mt-0.5 font-mono text-xs font-medium text-blue-700 tabular-nums">
                  {String(idx + 1).padStart(2, "0")}.
                </span>
                <span>{reason}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-slate-500">
              No specific indicators reported.
            </li>
          )}
        </ul>
      </section>

      {/* Bilingual Safety Advice */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Safety Advice (English)
          </h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {result.safety_advice_english.length > 0 ? (
              result.safety_advice_english.map((tip, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 text-sm leading-relaxed text-slate-700"
                >
                  <span className="mt-0.5 font-mono text-xs font-medium text-slate-400 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  <span>{tip}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">
                No specific advice available.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Safety Advice (Pashto)
            </h3>
            <span
              className="font-pashto text-sm font-medium text-slate-600"
              dir="rtl"
              lang="ps"
            >
              د امنیت مشورې
            </span>
          </div>
          <ul
            className="font-pashto mt-4 divide-y divide-slate-100 text-right"
            dir="rtl"
            lang="ps"
          >
            {result.safety_advice_pashto.length > 0 ? (
              result.safety_advice_pashto.map((tip, idx) => (
                <li
                  key={idx}
                  className="py-3 first:pt-0 last:pb-0 text-base leading-[2] text-slate-800"
                >
                  {tip}
                </li>
              ))
            ) : (
              <li className="text-base text-slate-500">مشورې شتون نلري.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
