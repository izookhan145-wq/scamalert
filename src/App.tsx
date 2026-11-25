import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Eraser,
  Languages,
  Loader2,
  SearchCheck,
  Shield,
} from "lucide-react";
import { AnalysisResult } from "./components/AnalysisResult";
import type {
  AiProvider,
  AnalysisResultData,
  ProvidersInfo,
  SampleMessage,
} from "./types";

const MAX_LENGTH = 5000;

const SAMPLE_MESSAGES: SampleMessage[] = [
  {
    id: "prize",
    label: "Prize Fee Scam",
    channel: "WhatsApp",
    text: "CONGRATULATIONS! Your mobile number won $25,000 in the International Relief Grant 2026. To release your funds today, send $85 processing fee via gift card and reply with your full name, bank account, and CNIC before 5:00 PM or your prize will be forfeited. Claim link: http://bit.ly/claim-grant-now",
  },
  {
    id: "bank-otp",
    label: "Bank OTP Alert",
    channel: "SMS",
    text: "URGENT: Your bank account has been temporarily suspended due to unusual login activity. Verify your identity within 2 hours by replying with your 6-digit OTP code and ATM PIN, or click https://verify-sec-alert.example/login to avoid permanent closure.",
  },
  {
    id: "delivery",
    label: "Legitimate Appointment",
    channel: "SMS",
    text: "Reminder: Your clinic appointment with Dr. Ahmadzai is scheduled for Thursday, December 3 at 10:30 AM at Kabul Medical Center, Suite 204. Please bring your photo ID. Call our front desk at 0700-123-456 if you need to reschedule.",
  },
];

export default function App() {
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState<AiProvider>("modelscope");
  const [modelscopeModel, setModelscopeModel] = useState("Qwen/Qwen2.5-72B-Instruct");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((info: ProvidersInfo | null) => {
        if (!active || !info) return;
        setProvider(info.defaultProvider);
        if (info.modelscopeModel) {
          setModelscopeModel(info.modelscopeModel);
        }
      })
      .catch(() => {
        // Keep default state if provider discovery fails
      });
    return () => {
      active = false;
    };
  }, []);

  const charCount = message.length;
  const counterColor =
    charCount > 4500
      ? "text-red-600"
      : charCount > 3500
        ? "text-amber-600"
        : "text-slate-500";

  async function analyzeMessage(overrideText?: string) {
    const trimmed = (overrideText ?? message).trim();

    if (!trimmed) {
      setError("Please paste a message to analyze.");
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      setError("Message is too long. Maximum 5000 characters allowed.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed, provider }),
      });

      const data = (await response.json()) as Partial<AnalysisResultData> & {
        error?: string;
      };

      if (!response.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        setResult(null);
        return;
      }

      setResult(data as AnalysisResultData);
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 60);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessage("");
    setError(null);
    setResult(null);
    textareaRef.current?.focus();
  }

  function handleSelectSample(sample: SampleMessage) {
    setMessage(sample.text);
    setError(null);
    void analyzeMessage(sample.text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void analyzeMessage();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar (3-zone contract) */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-6 lg:px-8">
          <a
            href="#analyzer"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span>Scam Alert &amp; Pashto Translator</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#analyzer"
              className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Analyzer
            </a>
            <a
              href="#samples"
              className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Sample Messages
            </a>
            <a
              href="#disclaimer"
              className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Safety Notice
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleSelectSample(SAMPLE_MESSAGES[0])}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
            >
              Try Sample
            </button>
          </div>
        </div>
      </header>

      {/* Hero Intro Band */}
      <section className="border-b border-blue-100 bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Check suspicious messages for scams and translate into Pashto
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-blue-100 sm:text-base">
              Paste any SMS, WhatsApp, or email message in English, Urdu, or Pashto to identify red flags, preserve exact numbers and links, and review bilingual safety advice.
            </p>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main id="analyzer" className="flex-1 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Message Input & Samples */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    Paste Suspicious Message
                  </h2>
                  <span className="text-xs text-slate-500">
                    English · Urdu · Pashto
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  Enter the text you received below. Press{" "}
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                    Ctrl+Enter
                  </kbd>{" "}
                  to check.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div
                    role="group"
                    aria-label="AI Provider"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
                  >
                    <button
                      type="button"
                      onClick={() => setProvider("modelscope")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        provider === "modelscope"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ModelScope
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider("gemini")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        provider === "gemini"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Gemini
                    </button>
                  </div>
                  <span className="truncate font-mono text-xs text-slate-500">
                    {provider === "modelscope"
                      ? modelscopeModel
                      : "gemini-4-hydrogen"}
                  </span>
                </div>

                <div className="mt-4">
                  <label htmlFor="messageInput" className="sr-only">
                    Suspicious message text
                  </label>
                  <textarea
                    id="messageInput"
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={MAX_LENGTH}
                    rows={8}
                    placeholder="Paste the suspicious message here... (SMS, email, or WhatsApp)"
                    className="w-full min-h-[200px] resize-y rounded-lg border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                  <div
                    className={`mt-2 text-right font-mono text-xs tabular-nums ${counterColor}`}
                  >
                    {charCount} / {MAX_LENGTH} characters
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void analyzeMessage()}
                    disabled={loading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap"
                  >
                    {loading ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <SearchCheck className="h-4 w-4" aria-hidden="true" />
                        <span>Check Message</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
                  >
                    <Eraser className="h-4 w-4" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Quick Sample Presets */}
              <section
                id="samples"
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <h2 className="text-sm font-semibold text-slate-900">
                  Test With Sample Messages
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select a realistic example to inspect scam detection and Pashto translation.
                </p>
                <div className="mt-4 space-y-2.5">
                  {SAMPLE_MESSAGES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      disabled={loading}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/60 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {sample.label}
                      </span>
                      <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                        {sample.channel}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Results, Loading, Error, or Empty State */}
            <div ref={resultsRef} className="lg:col-span-7 space-y-6">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-sm font-semibold">Unable to analyze message</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="rounded-xl border border-slate-200 bg-white p-8">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Loader2
                      className="h-5 w-5 animate-spin text-blue-600"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">
                      Analyzing scam indicators and translating into Pashto...
                    </span>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                      <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                    </div>
                    <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                </div>
              )}

              {!loading && result && <AnalysisResult result={result} />}

              {!loading && !result && !error && (
                <div className="rounded-xl border border-slate-200 bg-white p-8">
                  <div className="flex items-center gap-3 text-slate-900">
                    <Languages
                      className="h-6 w-6 text-blue-600"
                      aria-hidden="true"
                    />
                    <h2 className="text-lg font-semibold">
                      Ready to analyze your message
                    </h2>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Paste any suspicious text on the left and click{" "}
                    <span className="font-semibold text-slate-800">Check Message</span>.
                    The report will appear here with:
                  </p>
                  <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-semibold text-slate-900">
                        Scam Risk Assessment
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-slate-600">
                        Classifies messages as Likely Scam, Suspicious, or No Obvious Scam Indicators with specific red flags.
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-slate-900">
                        Accurate Pashto Translation
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-slate-600">
                        Translates the full text into natural Pashto script while keeping numbers, amounts, and links intact.
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-slate-900">
                        Bilingual Safety Advice
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-slate-600">
                        Provides practical next steps in both English and Pashto tailored to the message.
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-slate-900">
                        Supports Multiple Inputs
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-slate-600">
                        Works with SMS, WhatsApp, or email messages written in English, Urdu, or Pashto.
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Disclaimer */}
              <aside
                id="disclaimer"
                className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm leading-relaxed text-amber-950"
              >
                <span className="font-semibold">Disclaimer:</span> This is an
                AI-based assessment and may be incorrect. Always exercise your
                own judgment and verify through official channels before sending
                money, clicking links, or sharing personal details.
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>Scam Alert &amp; Pashto Translator</span>
          <span>Built for community safety</span>
        </div>
      </footer>
    </div>
  );
}
