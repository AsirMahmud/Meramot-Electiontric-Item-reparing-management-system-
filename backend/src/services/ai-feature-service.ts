import { env } from "../config/env.js";

export async function suggestDeviceModel(input: { brand: string; model: string; deeperSearch?: boolean }) {
  if (!env.geminiApiKey) {
    return { ok: false, suggestions: [] };
  }

  const systemContent = input.deeperSearch
    ? `You are an AI assistant helping a user identify an electronic device. The user provided a vague or incorrect brand/model, and previous standard suggestions were rejected.
Your goal is to search deeper: think of phonetically similar names, common typos, missing/extra spaces, swapped letters, or older/obscure models under the likely correct brand.
BRAND typo examples: "Samsang"->"Samsung", "Aple"->"Apple", "Huwei"->"Huawei", "Xaomi"->"Xiaomi", "Lnovo"->"Lenovo", "Sont"->"Sony", "Noka"->"Nokia", "Onne Plus"->"OnePlus", "Raelme"->"Realme", "Opop"->"Oppo", "Assu"->"Asus", "Acer"->"Acer", "Del"->"Dell", "Hp"->"HP", "Tosiba"->"Toshiba", "Panasnic"->"Panasonic".
MODEL typo examples: "tabe"->"Tab E", "galxy s"->"Galaxy S", "ipd"->"iPad", "macbok"->"MacBook", "iPhne"->"iPhone", "pixl"->"Pixel", "thinkpd"->"ThinkPad", "surfce"->"Surface", "ntbook"->"Notebook", "airpd"->"AirPods", "bds"->"Buds", "swch"->"Switch", "playsttion"->"PlayStation".
Consider the ENTIRE product lineup: flagship, mid-range, budget, older discontinued models, regional variants, and special editions. Do NOT only suggest the latest models.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
If the text is completely random, nonsensical, or clearly not any electronic device (e.g. "asdfgh", "rubbish", "Ejjdw" with no context), set "isRubbish" to true.
Provide a JSON object containing "isAppliance" boolean, "isRubbish" boolean, and a "suggestions" array of up to 5 likely matches. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name, including the release year in parentheses if applicable (e.g. "Galaxy S24 (2024)", "MacBook Air M2 (2022)", "Arctis Nova Pro (2023)")
- "deviceType": preferably one of these values: "Laptop", "Desktop", "Mobile Phone", "Tablet", "Smartwatch", "Fitness Tracker", "Headphones/Earbuds", "Smart TV", "Monitor", "Speaker", "Printer", "Scanner", "Camera", "Action Camera", "Game Console", "VR Headset", "Router/Modem", "Drone", "Projector", "Power Bank", "UPS", "E-Reader", "External Storage", "Keyboard", "Streaming Device", "Dash Cam", "GPS Device", "Smart Home Device", or "Other". If the device clearly doesn't fit ANY of these, create a short new category (2-3 words, Title Case). Do NOT use "Other" if a more specific name is possible.
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "isRubbish": false, "suggestions": [ { "brand": "...", "model": "...", "deviceType": "...", "specs": "..." } ] }`
    : `You are an AI assistant that identifies the actual commercial name of an electronic device based on a vaguely typed brand and model. 
Critical: Users often make typos, miss spaces, swap letters, or use shorthand. You MUST aggressively correct these.
BRAND typo examples: "Samsang"->"Samsung", "Samsi"->"Samsung", "Aple"->"Apple", "Huwei"->"Huawei", "Xaomi"->"Xiaomi", "Lnovo"->"Lenovo", "Sont"->"Sony", "Noka"->"Nokia", "Onne Plus"->"OnePlus", "Raelme"->"Realme", "Opop"->"Oppo", "Del"->"Dell", "Tosiba"->"Toshiba".
MODEL typo examples: "tabe"->"Tab E", "tab e"->"Tab E", "galxy s"->"Galaxy S", "ipd"->"iPad", "macbok"->"MacBook", "iPhne"->"iPhone", "pixl"->"Pixel", "thinkpd"->"ThinkPad", "surfce"->"Surface", "airpd"->"AirPods", "bds"->"Buds", "swch"->"Switch", "playsttion"->"PlayStation".
Consider the ENTIRE product lineup: flagship, mid-range, budget, older discontinued models, and regional variants — not just the latest flagships.
If the device is a heavy home appliance (like a washing machine, refrigerator, air conditioner, microwave, oven), set "isAppliance" to true.
If the text is completely random, nonsensical, or clearly not any electronic device (e.g. "asdfgh", "rubbish", "Ejjdw" with no context), set "isRubbish" to true.
Provide a JSON object containing "isAppliance" boolean, "isRubbish" boolean, and a "suggestions" array of up to 3 best matches based on the user's input. Each object should have:
- "brand": the corrected brand name
- "model": the exact commercial model name, including the release year in parentheses if applicable (e.g. "Galaxy S24 (2024)", "MacBook Air M2 (2022)", "Arctis Nova Pro (2023)")
- "deviceType": preferably one of these values: "Laptop", "Desktop", "Mobile Phone", "Tablet", "Smartwatch", "Fitness Tracker", "Headphones/Earbuds", "Smart TV", "Monitor", "Speaker", "Printer", "Scanner", "Camera", "Action Camera", "Game Console", "VR Headset", "Router/Modem", "Drone", "Projector", "Power Bank", "UPS", "E-Reader", "External Storage", "Keyboard", "Streaming Device", "Dash Cam", "GPS Device", "Smart Home Device", or "Other". If the device clearly doesn't fit ANY of these, create a short new category (2-3 words, Title Case). Do NOT use "Other" if a more specific name is possible.
- "specs": Strictly follow this format: "[Device Category] • [Release Year] • [Key Spec]". Examples: "Smartphone • 2021 • 6.5\\" Display", "Laptop • 2022 • Core i5", "Tablet • 2020 • 64GB Storage". Do not deviate from this format.

Respond ONLY with valid JSON. NO markdown formatting, NO extra text.
Format: { "isAppliance": false, "isRubbish": false, "suggestions": [ { "brand": "...", "model": "...", "deviceType": "...", "specs": "..." } ] }`;

  const userPrompt = `Brand: ${input.brand}\nModel: ${input.model}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.geminiApiKey}`, {
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
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

export async function classifyIssueCategory(input: {
  problem: string;
}) {
  const systemContent = `You are an AI assistant for an electronics repair platform in Bangladesh. 
The user will describe their device problem. The description may be in:
- Pure English
- Pure Bengali (Bangla)
- Banglish (Bengali words written in English letters, mixed with English)
- Any mix of the above

Common Banglish examples:
- "screen ta bhengeche" = screen is broken
- "charge hoy na" / "charge hochhe na" = not charging  
- "garam hoye jay" = overheating
- "pani poreche" = water damage
- "awaz ashche na" / "sound nai" = no sound (speaker issue)
- "camera kaj korche na" = camera not working
- "net dhore na" / "wifi lagte parchi na" = network/connectivity issue
- "slow hoye geche" / "hang kore" = performance issue
- "display e dag" / "screen e line" = screen/display issue
- "keyboard er button kaj kore na" = keyboard issue
- "battery drain hoye jay" = battery issue
- "data udhaar korte hobe" / "file hariye geche" = data recovery
- "part change korte hobe" = parts replacement
- "software e problem" / "update er por" = software issue

Your task: classify the problem into the BEST matching category from this list:
"Screen or display", "Battery or charging", "Keyboard or touchpad", "Performance or overheating", "Water damage", "Speaker or microphone", "Camera issue", "Software or OS", "Network or connectivity", "Data recovery", "Parts replacement", "Other"

IMPORTANT: If the problem clearly does NOT fit any of the above categories, you may create a SHORT new category name (2-4 words, Title Case, similar style to the existing ones). Set "isNew" to true if you create a new category. Examples of valid new categories: "Bluetooth issue", "Port or connector", "Hinge or body damage", "Touchscreen issue", "SIM or eSIM", "Storage or memory".

Respond ONLY with valid JSON. NO markdown, NO extra text.
Format: { "issueCategory": "...", "isNew": false }`;

  const userPrompt = `Problem description: ${input.problem}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemContent + "\n\n" + userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, issueCategory: null };

    const parsed = JSON.parse(data.candidates[0].content.parts[0].text.trim());
    return { ok: true, issueCategory: parsed.issueCategory || null, isNew: !!parsed.isNew };
  } catch (err) {
    console.error("classifyIssueCategory error:", err);
    return { ok: false, issueCategory: null };
  }
}

export async function suggestVendorServices(input: {
  specialties: string[];
  existingServiceNames: string[];
}) {
  if (!env.groqApiKey) {
    return { ok: false, suggestions: [] };
  }

  const systemContent = `You are a business assistant for electronics repair shops.
Based on the shop's specialties (device types, issue categories) and their current services, suggest 3 to 5 new, relevant repair services they could offer.
Make sure NOT to suggest services they already offer.
Provide the output strictly as a JSON array of objects. Do not use markdown blocks.
Each object must have:
- "suggestedName" (string, professional name of the service)
- "deviceType" (string, e.g., "Mobile Phone", "Laptop", "Appliance")
- "issueCategory" (string, e.g., "Screen or display", "Battery or charging", "Motherboard repair")
- "suggestedDesc" (string, short 1-sentence description)
- "suggestedPrice" (number, a reasonable starting base price in BDT, or null if it varies wildly)

Format:
{
  "suggestions": [
    {
      "suggestedName": "iPhone Screen Replacement",
      "deviceType": "Mobile Phone",
      "issueCategory": "Screen or display",
      "suggestedDesc": "High-quality screen replacement for iPhones.",
      "suggestedPrice": 2500
    }
  ]
}`;

  const userPrompt = `Specialties: ${input.specialties.join(", ") || "General Repair"}\nExisting Services: ${input.existingServiceNames.join(", ") || "None"}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, suggestions: [] };

    const content = data.choices[0].message.content.trim();
    const parsed = JSON.parse(content);
    return { ok: true, suggestions: parsed.suggestions || [] };
  } catch (err) {
    console.error("suggestVendorServices error:", err);
    return { ok: false, suggestions: [] };
  }
}
