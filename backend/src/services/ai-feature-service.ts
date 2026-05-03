import { env } from "../config/env.js";

// ── In-memory LRU cache for suggestion results ──────────────────────────
const SUGGEST_CACHE_MAX = 100;
const SUGGEST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: SuggestResult;
  timestamp: number;
}

interface SuggestResult {
  ok: boolean;
  suggestions: { brand: string; model: string; specs: string }[];
  isAppliance?: boolean;
  isRubbish?: boolean;
}

const suggestCache = new Map<string, CacheEntry>();

function getCacheKey(brand: string, model: string, deeper: boolean): string {
  return `${brand.toLowerCase().trim()}|${model.toLowerCase().trim()}|${deeper}`;
}

function getCachedSuggestion(key: string): SuggestResult | null {
  const entry = suggestCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SUGGEST_CACHE_TTL_MS) {
    suggestCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedSuggestion(key: string, data: SuggestResult): void {
  // Evict oldest if at capacity
  if (suggestCache.size >= SUGGEST_CACHE_MAX) {
    const firstKey = suggestCache.keys().next().value;
    if (firstKey !== undefined) suggestCache.delete(firstKey);
  }
  suggestCache.set(key, { data, timestamp: Date.now() });
}

// ── Gemini model (use 2.0-flash for speed; 2.5-flash is a thinking model and much slower) ──
const GEMINI_MODEL = "gemini-2.0-flash";
const REQUEST_TIMEOUT_MS = 10_000; // 10 second timeout

export async function suggestDeviceModel(input: { brand: string; model: string; deeperSearch?: boolean }) {
  if (!env.geminiApiKey) {
    return { ok: false, suggestions: [] };
  }

  // Check cache first
  const cacheKey = getCacheKey(input.brand, input.model, !!input.deeperSearch);
  const cached = getCachedSuggestion(cacheKey);
  if (cached) {
    return cached;
  }

  const systemContent = input.deeperSearch
    ? `You are an AI assistant helping a user identify an electronic device. The user provided a vague or incorrect brand/model, and previous standard suggestions were rejected.
Your goal is to search deeper: think of phonetically similar names, common typos, or older/obscure models under the likely correct brand. 
Check if the brand name is misspelled (e.g., "Samsang" -> "Samsung", "Aple" -> "Apple") and correct it.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
If the text is completely random, nonsensical, or clearly not any electronic device (e.g. "asdfgh", "rubbish", "Ejjdw" with no context), set "isRubbish" to true.
Provide a JSON object containing "isAppliance" boolean, "isRubbish" boolean, and a "suggestions" array of up to 5 likely matches. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "isRubbish": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`
    : `You are an AI assistant that identifies the actual commercial name of an electronic device based on a vaguely typed brand and model. 
Check if the brand name is misspelled (e.g., "Samsang" -> "Samsung", "Samsi" -> "Samsung") and correct it.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
If the text is completely random, nonsensical, or clearly not any electronic device (e.g. "asdfgh", "rubbish", "Ejjdw" with no context), set "isRubbish" to true.
Provide a JSON object containing "isAppliance" boolean, "isRubbish" boolean, and a "suggestions" array of up to 3 best matches based on the user's input. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "isRubbish": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`;

  const userPrompt = `Brand: ${input.brand}\nModel: ${input.model}`;

  // Use AbortController to enforce a timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemContent + "\n\n" + userPrompt }] }
        ],
        generationConfig: {
          temperature: input.deeperSearch ? 0.6 : 0.2,
          maxOutputTokens: 512,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, suggestions: [], isAppliance: false };

    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return { ok: false, suggestions: [], isAppliance: false };

    content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(content);
    const result: SuggestResult = { 
      ok: true, 
      suggestions: parsed.suggestions || [],
      isAppliance: !!parsed.isAppliance,
      isRubbish: !!parsed.isRubbish
    };

    // Cache the successful result
    setCachedSuggestion(cacheKey, result);
    return result;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("suggestDeviceModel timed out after", REQUEST_TIMEOUT_MS, "ms");
    } else {
      console.error("suggestDeviceModel error:", err);
    }
    return { ok: false, suggestions: [], isAppliance: false, isRubbish: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function summarizeDeviceIssue(input: {
  deviceType: string;
  brand: string;
  model: string;
  issueCategory: string;
  problem: string;
}) {
  if (!env.geminiApiKey) {
    return { ok: false, summary: null };
  }

  const systemContent = `You are a technical repair assistant. A user has submitted a repair request, sometimes in a mix of Bengali and English (Banglish) or pure Bengali.
Your task is to generate a highly professional, perfectly formatted, easy-to-read English summary of the issue for a repair technician.
Do not include any pleasantries. Output ONLY the summary.

Structure the summary like this:
**Device:** [Brand] [Model] ([Device Type])
**Category:** [Issue Category]
**Reported Problem:** [1-2 clear, professional sentences explaining the issue in English based on the user's description]
`;

  const userPrompt = `Device Type: ${input.deviceType}\nBrand: ${input.brand}\nModel: ${input.model}\nIssue Category: ${input.issueCategory}\nUser Description: ${input.problem}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemContent + "\n\n" + userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, summary: null };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) return { ok: false, summary: null };

    return { ok: true, summary: content };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("summarizeDeviceIssue timed out after", REQUEST_TIMEOUT_MS, "ms");
    } else {
      console.error("summarizeDeviceIssue error:", err);
    }
    return { ok: false, summary: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
