import dotenv from "dotenv";
dotenv.config();

async function test() {
  const env = process.env;
  
  const systemContent = `You are an AI assistant helping a user identify an electronic device. 
Provide a JSON object containing an "isAppliance" boolean, and a "suggestions" array of up to 5 likely matches. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": a brief 3-4 word description (e.g., "Smartphone, 2021", "Laptop, Core i5")

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`;

  const messages = [
    { role: "system", content: systemContent },
    { role: "user", content: `Brand: Samseng\nModel: e22d` }
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
