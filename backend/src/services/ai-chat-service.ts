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

  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(input.history ?? []).map((turn) => ({
      role: turn.role,
      content: turn.text,
    })),
    { role: "user", content: input.message },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.4,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Groq request failed with status ${response.status}`
    );
  }

  const reply =
    data?.choices?.[0]?.message?.content?.trim() ||
    "Sorry, I could not generate a response right now.";

  return {
    ok: true,
    skipped: false,
    reply,
    raw: data,
  };
}

export async function suggestDeviceModel(input: { brand: string; model: string; deeperSearch?: boolean }) {
  if (!env.groqApiKey) {
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
- "specs": a brief 3-4 word description (e.g., "Smartphone, 2021", "Laptop, Core i5")

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`
    : `You are an AI assistant that identifies the actual commercial name of an electronic device based on a vaguely typed brand and model. 
Check if the brand name is misspelled (e.g., "Samsang" -> "Samsung") and correct it.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
Provide a JSON object containing an "isAppliance" boolean, and a "suggestions" array of up to 3 best matches based on the user's input. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": a brief 3-4 word description (e.g., "Smartphone, 2021")

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`;

  const messages = [
    { role: "system", content: systemContent },
    { role: "user", content: `Brand: ${input.brand}\nModel: ${input.model}` }
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Use 70b model for better JSON and reasoning
        messages,
        temperature: input.deeperSearch ? 0.6 : 0.2,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, suggestions: [] };

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false, suggestions: [] };

    const parsed = JSON.parse(reply);
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