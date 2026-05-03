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

export async function suggestDeviceModel(input: { brand: string; model: string }) {
  if (!env.groqApiKey) {
    return { ok: false, suggestion: null };
  }

  const messages = [
    {
      role: "system",
      content: `You are an AI assistant that identifies the actual commercial name of an electronic device based on a vaguely typed brand and model. 
If the user's input is misspelled or uses a vague model number, suggest the full correct commercial name. 
Respond ONLY with the corrected model name (and brand if necessary). Do not add conversational filler. If it looks correct already or you cannot guess, just return the original input.`
    },
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
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.1, // low temperature for more deterministic factual answers
      }),
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, suggestion: null };

    const reply = data?.choices?.[0]?.message?.content?.trim();
    return { ok: true, suggestion: reply };
  } catch (err) {
    return { ok: false, suggestion: null };
  }
}