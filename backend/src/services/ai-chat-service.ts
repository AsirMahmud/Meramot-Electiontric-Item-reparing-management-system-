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