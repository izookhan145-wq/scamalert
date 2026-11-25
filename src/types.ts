export type AiProvider = "modelscope" | "gemini";

export type ScamClassification =
  | "Likely Scam"
  | "Suspicious"
  | "No Obvious Scam Indicators";

export type RiskLevel = "High" | "Medium" | "Low";

export interface AnalysisResultData {
  classification: ScamClassification;
  risk_level: RiskLevel;
  reasons: string[];
  pashto_translation: string;
  safety_advice_english: string[];
  safety_advice_pashto: string[];
}

export interface SampleMessage {
  id: string;
  label: string;
  channel: string;
  text: string;
}

export interface ProvidersInfo {
  defaultProvider: AiProvider;
  modelscopeConfigured: boolean;
  geminiConfigured: boolean;
  modelscopeModel: string;
}
