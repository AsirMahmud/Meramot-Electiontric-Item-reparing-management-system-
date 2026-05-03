import { env } from "../config/env.js";

type ChatTurn = {
  role: "user" | "assistant";
  text: string;
};

type AiChatInput = {
  message: string;
  history?: ChatTurn[];
};

const SYSTEM_PROMPT = `
You are Meramot AI, a repair assistant for a Bangladesh-based electronics repair platform.

Your job:
- Help users describe device issues clearly
- Suggest likely causes in simple language
- Suggest safe next steps
- Recommend when the user should stop using the device
- Encourage booking a repair request when appropriate

Rules:
- Do not claim certainty when diagnosis is uncertain
- Do not give dangerous repair instructions
- If there is smoke, sparks, swelling battery, burning smell, or electric shock risk, tell the user to stop using the device immediately
- Keep replies concise, practical, and user-friendly
- Do not use Markdown formatting symbols such as **, __, #, or backticks
- Use plain numbered lines with short labels, for example: 1. Likely issue: ...
- Focus on phones, laptops, tablets, accessories, home electronics, and repair logistics
- If useful, structure the reply as: [The title of each point should be in bold]
  1. Likely issue: [short describtion of issue]
  2. What you can try now: [this should be a bullet list]
  3. When to seek repair:
`;

export async function generateAiRepairReply(input: AiChatInput) {
  if (!env.enableAiChat) {
    return {
      ok: false,
      skipped: true,
      reply: "AI chat is currently disabled.",
    };
  }

  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "Understood. I am Meramot AI. How can I help you today?" }] },
    ...(input.history ?? []).map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: input.message }] },
  ];

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Gemini request failed with status ${response.status}`
    );
  }

  const reply =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "Sorry, I could not generate a response right now.";

  return {
    ok: true,
    skipped: false,
    reply,
    raw: data,
  };
}

export async function suggestDeviceModel(input: { brand: string; model: string; deeperSearch?: boolean }) {
  if (!env.geminiApiKey) {
    return { ok: false, suggestions: [] };
  }

  const systemContent = input.deeperSearch
    ? `You are an AI assistant helping a user identify an electronic device. The user provided a vague or incorrect brand/model, and previous standard suggestions were rejected.
Your goal is to search deeper: think of phonetically similar names, common typos, or older/obscure models under the likely correct brand. 
Check if the brand name is misspelled (e.g., "Samsang" -> "Samsung", "Aple" -> "Apple") and correct it.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
Provide a JSON object containing an "isAppliance" boolean, and a "suggestions" array of up to 5 likely matches. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`
    : `You are an AI assistant that identifies the actual commercial name of an electronic device based on a vaguely typed brand and model. 
Check if the brand name is misspelled (e.g., "Samsang" -> "Samsung", "Samsi" -> "Samsung") and correct it.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
Provide a JSON object containing an "isAppliance" boolean, and a "suggestions" array of up to 3 best matches based on the user's input. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`;

  const userPrompt = `Brand: ${input.brand}\nModel: ${input.model}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
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
      isAppliance: !!parsed.isAppliance
    };
  } catch (err) {
    console.error("suggestDeviceModel error:", err);
    return { ok: false, suggestions: [], isAppliance: false };
  }
}