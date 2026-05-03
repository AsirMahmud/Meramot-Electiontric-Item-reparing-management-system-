import "dotenv/config";
import { env } from "./src/config/env.js";

async function run() {
  const systemContent = `You are an AI assistant that identifies the actual commercial name of an electronic device based on a vaguely typed brand and model. 
Check if the brand name is misspelled (e.g., "Samsang" -> "Samsung", "Samsi" -> "Samsung") and correct it.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
If the text is completely random, nonsensical, or clearly not any electronic device (e.g. "asdfgh", "rubbish", "Ejjdw" with no context), set "isRubbish" to true.
Provide a JSON object containing "isAppliance" boolean, "isRubbish" boolean, and a "suggestions" array of up to 3 best matches based on the user's input. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "isRubbish": false, "suggestions": [ { "brand": "...", "model": "...", "specs": "..." } ] }`;

  const userPrompt = `Brand: samsung\nModel: eete`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
        contents: [{ role: "user", parts: [{ text: systemContent + "\n\n" + userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
    })
  });
  console.log(response.status);
  const data = await response.json();
  console.log(data);
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if(content) {
      content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
      console.log(JSON.parse(content));
  }
}
run();
