import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MODELSCOPE_BASE_URL = "https://api-inference.modelscope.cn/v1";
const DEFAULT_MODELSCOPE_MODEL = "Qwen/Qwen2.5-72B-Instruct";

const SYSTEM_PROMPT = `You are a scam detection expert and professional Pashto translator. Your job is to analyze messages for scam indicators and translate them into Pashto.

## SCAM DETECTION RULES
Check the message for these red flags:
- Fake prize/lottery/win notifications asking for fees or personal info
- Requests for money, advance fees, or "processing charges"
- Fake job offers asking for registration fees, ID documents, or bank details
- Suspicious bank or mobile wallet messages (especially with urgent language)
- Requests for OTP, password, PIN, CVV, or any personal/financial information
- Suspicious or shortened URLs/links
- Urgent or threatening language ("act now", "your account will be blocked", "immediate action required")
- Impersonation of banks, government agencies, telecom companies, or trusted organizations
- Poor grammar combined with urgent requests (common in phishing)
- Requests to download apps or click links to "verify" accounts

## IMPORTANT CLASSIFICATION RULES
- NEVER claim a message is 100% safe or 100% a scam
- Classification MUST be exactly one of:
  * "Likely Scam" - Multiple strong red flags present
  * "Suspicious" - Some concerning elements but not definitive
  * "No Obvious Scam Indicators" - Message appears legitimate but user should still exercise caution
- Risk level MUST be exactly one of: "High", "Medium", or "Low"
- Always provide 2-5 specific reasons for your classification

## PASHTO TRANSLATION RULES
- Translate the message into natural, fluent Pashto using Arabic/Pashto script (پښتو)
- Preserve ALL numbers, phone numbers, dates, monetary amounts, names, and links EXACTLY as they appear
- Keep the original meaning completely - do not add or remove any details
- If the input is already in Pashto, return it as-is (minor grammar corrections are acceptable)
- Use proper Pashto grammar and natural phrasing

## SAFETY ADVICE RULES
- Provide 3 to 5 short, practical safety tips
- Tips should be SPECIFIC to the type of message analyzed
- Provide tips in BOTH English and Pashto
- Common tips include: don't share OTP/passwords, don't send money to strangers, don't click suspicious links, verify through official channels, report to authorities

## OUTPUT FORMAT
Respond with valid JSON only (no markdown fences, no extra commentary) using this exact schema:
{
  "classification": "Likely Scam" | "Suspicious" | "No Obvious Scam Indicators",
  "risk_level": "High" | "Medium" | "Low",
  "reasons": ["reason 1", "reason 2"],
  "pashto_translation": "the full message translated into Pashto script",
  "safety_advice_english": ["tip 1", "tip 2", "tip 3"],
  "safety_advice_pashto": ["tip 1 in Pashto", "tip 2 in Pashto", "tip 3 in Pashto"]
}`;

type AiProvider = "modelscope" | "gemini";

interface AnalysisPayload {
  classification: "Likely Scam" | "Suspicious" | "No Obvious Scam Indicators";
  risk_level: "High" | "Medium" | "Low";
  reasons: string[];
  pashto_translation: string;
  safety_advice_english: string[];
  safety_advice_pashto: string[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getModelScopeConfig(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const apiKey = (process.env.MODELSCOPE_API_KEY ?? "").trim();
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }

  const rawBaseUrl = (
    process.env.MODELSCOPE_BASE_URL ?? DEFAULT_MODELSCOPE_BASE_URL
  ).trim();
  let safeBaseUrl = DEFAULT_MODELSCOPE_BASE_URL;
  try {
    const parsedUrl = new URL(rawBaseUrl);
    if (parsedUrl.protocol === "https:") {
      safeBaseUrl = parsedUrl.toString().replace(/\/+$/, "");
    }
  } catch {
    safeBaseUrl = DEFAULT_MODELSCOPE_BASE_URL;
  }

  const model = (
    process.env.MODELSCOPE_MODEL ?? DEFAULT_MODELSCOPE_MODEL
  ).trim();

  return {
    apiKey,
    baseUrl: safeBaseUrl,
    model: model || DEFAULT_MODELSCOPE_MODEL,
  };
}

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function normalizeAnalysisPayload(
  parsed: Partial<AnalysisPayload>
): AnalysisPayload {
  const validClassifications = [
    "Likely Scam",
    "Suspicious",
    "No Obvious Scam Indicators",
  ] as const;
  const validRisks = ["High", "Medium", "Low"] as const;

  const classification = validClassifications.includes(
    parsed.classification as (typeof validClassifications)[number]
  )
    ? (parsed.classification as AnalysisPayload["classification"])
    : "Suspicious";

  const risk_level = validRisks.includes(
    parsed.risk_level as (typeof validRisks)[number]
  )
    ? (parsed.risk_level as AnalysisPayload["risk_level"])
    : "Medium";

  return {
    classification,
    risk_level,
    reasons: Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((item): item is string => typeof item === "string")
      : [],
    pashto_translation:
      typeof parsed.pashto_translation === "string"
        ? parsed.pashto_translation
        : "",
    safety_advice_english: Array.isArray(parsed.safety_advice_english)
      ? parsed.safety_advice_english.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    safety_advice_pashto: Array.isArray(parsed.safety_advice_pashto)
      ? parsed.safety_advice_pashto.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
  };
}

async function analyzeWithModelScope(
  userMessage: string
): Promise<AnalysisPayload> {
  const config = getModelScopeConfig();
  if (!config) {
    throw Object.assign(
      new Error(
        "ModelScope API key is not configured. Please add MODELSCOPE_API_KEY in the Settings > Secrets panel."
      ),
      { statusCode: 500 }
    );
  }

  const endpoint = `${config.baseUrl}/chat/completions`;
  const requestBody = (withJsonFormat: boolean) => ({
    model: config.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this message:\n\n${userMessage}` },
    ],
    temperature: 0.2,
    stream: false,
    ...(withJsonFormat ? { response_format: { type: "json_object" } } : {}),
  });

  let apiResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody(true)),
  });

  // Some ModelScope models reject response_format; retry once without it if 400
  if (apiResponse.status === 400) {
    apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody(false)),
    });
  }

  if (!apiResponse.ok) {
    const errText = await apiResponse.text().catch(() => "");
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      throw Object.assign(
        new Error(
          "ModelScope API key was rejected. Please verify MODELSCOPE_API_KEY in the Settings > Secrets panel."
        ),
        { statusCode: 401 }
      );
    }
    if (apiResponse.status === 429) {
      throw Object.assign(
        new Error(
          "ModelScope rate limit exceeded. Please wait a moment and try again."
        ),
        { statusCode: 429 }
      );
    }
    throw Object.assign(
      new Error(
        `ModelScope API error (${apiResponse.status}). ${errText.slice(0, 120)}`
      ),
      { statusCode: 502 }
    );
  }

  const completion = (await apiResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = completion.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw Object.assign(
      new Error("Empty response received from ModelScope. Please try again."),
      { statusCode: 502 }
    );
  }

  let parsed: Partial<AnalysisPayload>;
  try {
    parsed = JSON.parse(extractJsonString(content)) as Partial<AnalysisPayload>;
  } catch {
    throw Object.assign(
      new Error(
        "ModelScope returned an invalid response format. Please try again."
      ),
      { statusCode: 502 }
    );
  }

  return normalizeAnalysisPayload(parsed);
}

async function analyzeWithGemini(userMessage: string): Promise<AnalysisPayload> {
  const ai = getGeminiClient();
  if (!ai) {
    throw Object.assign(
      new Error(
        "Gemini API key is not configured. Please check GEMINI_API_KEY in the Settings > Secrets panel."
      ),
      { statusCode: 500 }
    );
  }

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Analyze this message:\n\n${userMessage}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          classification: {
            type: Type.STRING,
            description:
              'Must be one of: "Likely Scam", "Suspicious", or "No Obvious Scam Indicators".',
          },
          risk_level: {
            type: Type.STRING,
            description: 'Must be one of: "High", "Medium", or "Low".',
          },
          reasons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 to 5 specific reasons for the classification.",
          },
          pashto_translation: {
            type: Type.STRING,
            description:
              "Full message translated into natural Pashto script (پښتو), preserving numbers, names, dates, amounts, and links.",
          },
          safety_advice_english: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 to 5 specific, practical safety tips in English.",
          },
          safety_advice_pashto: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 to 5 corresponding practical safety tips in Pashto.",
          },
        },
        required: [
          "classification",
          "risk_level",
          "reasons",
          "pashto_translation",
          "safety_advice_english",
          "safety_advice_pashto",
        ],
      },
    },
  });

  const rawText = (response.text ?? "").trim();
  if (!rawText) {
    throw Object.assign(
      new Error("Empty response received from AI. Please try again."),
      { statusCode: 502 }
    );
  }

  let parsed: Partial<AnalysisPayload>;
  try {
    parsed = JSON.parse(rawText) as Partial<AnalysisPayload>;
  } catch {
    throw Object.assign(
      new Error("AI returned an invalid response format. Please try again."),
      { statusCode: 502 }
    );
  }

  return normalizeAnalysisPayload(parsed);
}

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "100kb" }));

  app.get("/api/providers", (_req: Request, res: Response) => {
    const modelScope = getModelScopeConfig();
    const geminiReady = Boolean(getGeminiClient());
    res.json({
      defaultProvider: modelScope ? "modelscope" : "gemini",
      modelscopeConfigured: Boolean(modelScope),
      geminiConfigured: geminiReady,
      modelscopeModel: modelScope?.model ?? DEFAULT_MODELSCOPE_MODEL,
    });
  });

  app.post("/api/analyze", async (req: Request, res: Response) => {
    const body = req.body as
      | { message?: unknown; provider?: unknown }
      | undefined;
    if (!body || typeof body.message !== "string") {
      res.status(400).json({
        error: "No message provided. Please enter a message to analyze.",
      });
      return;
    }

    const userMessage = body.message.trim();
    if (!userMessage) {
      res.status(400).json({
        error: "Message is empty. Please paste a message to analyze.",
      });
      return;
    }

    if (userMessage.length > 5000) {
      res.status(400).json({
        error: "Message is too long. Maximum 5000 characters allowed.",
      });
      return;
    }

    const requestedProvider: AiProvider =
      body.provider === "gemini" || body.provider === "modelscope"
        ? body.provider
        : getModelScopeConfig()
          ? "modelscope"
          : "gemini";

    try {
      const result =
        requestedProvider === "modelscope"
          ? await analyzeWithModelScope(userMessage)
          : await analyzeWithGemini(userMessage);
      res.json(result);
    } catch (error) {
      const errObj = error as Error & { statusCode?: number };
      const errMsg = errObj.message || String(error);

      if (errObj.statusCode) {
        res.status(errObj.statusCode).json({ error: errMsg });
        return;
      }

      if (
        errMsg.includes("API_KEY_INVALID") ||
        errMsg.includes("PERMISSION_DENIED") ||
        errMsg.includes("401") ||
        errMsg.includes("403")
      ) {
        res.status(401).json({
          error:
            "API key invalid or unauthorized. Please check your secret in the Settings > Secrets panel.",
        });
        return;
      }

      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429")) {
        res.status(429).json({
          error: "Rate limit exceeded. Please wait a moment and try again.",
        });
        return;
      }

      res.status(500).json({
        error: `Failed to analyze message. Please try again. (${errMsg.slice(0, 100)})`,
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Scam Alert & Pashto Translator running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
