import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Missing 'word'" });

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY // 免费 Key 或受限 Key
    });

    const prompt = `
You are a morphological analyzer.
Given a single English word, extract:
- Lemma (base form)
- Part of speech
- Word family (noun, adjective, adverb, verb forms)
Return JSON only.

Word: ${word}
    `;

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo", // 消耗小，免费 Key 可能可用
      messages: [
        { role: "system", content: "You are a linguistic analyzer." },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(content);
    } catch {
      // 如果返回非标准 JSON，则直接作为 text 返回
      json = { text: content };
    }

    res.status(200).json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM error", details: err.message });
  }
}