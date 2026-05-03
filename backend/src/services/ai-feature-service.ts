import { env } from "../config/env.js";

export async function suggestDeviceModel(input: { brand: string; model: string; deeperSearch?: boolean }) {
  if (!env.geminiApiKey) {
    return { ok: false, suggestions: [] };
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

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemContent + "\n\n" + userPrompt }] }
        ],
        generationConfig: {
          temperature: input.deeperSearch ? 0.6 : 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, suggestions: [], isAppliance: false };

    let content = data.candidates[0].content.parts[0].text;
    content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(content);
    return { 
      ok: true, 
      suggestions: parsed.suggestions || [],
      isAppliance: !!parsed.isAppliance,
      isRubbish: !!parsed.isRubbish
    };
  } catch (err) {
    console.error("suggestDeviceModel error:", err);
    return { ok: false, suggestions: [], isAppliance: false, isRubbish: false };
  }
}

export async function summarizeDeviceIssue(input: {
  deviceType: string;
  brand: string;
  model: string;
  issueCategory: string;
  problem: string;
}) {
  const systemContent = `You are a technical repair assistant. A user has submitted a repair request, sometimes in a mix of Bengali and English (Banglish) or pure Bengali.
Your task is to generate a highly professional, perfectly formatted, easy-to-read English summary of the issue for a repair technician.
Do not include any pleasantries. Output ONLY the summary.

Structure the summary like this:
**Device:** [Brand] [Model] ([Device Type])
**Category:** [Issue Category]
**Reported Problem:** [1-2 clear, professional sentences explaining the issue in English based on the user's description]
`;

  const userPrompt = `Device Type: ${input.deviceType}\nBrand: ${input.brand}\nModel: ${input.model}\nIssue Category: ${input.issueCategory}\nUser Description: ${input.problem}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemContent + "\n\n" + userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.3
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, summary: null };

    const content = data.candidates[0].content.parts[0].text.trim();
    return { ok: true, summary: content };
  } catch (err) {
    console.error("summarizeDeviceIssue error:", err);
    return { ok: false, summary: null };
  }
}
