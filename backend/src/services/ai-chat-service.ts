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