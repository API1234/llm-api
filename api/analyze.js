import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Missing 'word'" });

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
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

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: prompt
    });

    const json = JSON.parse(
      response.output_text ?? response.output[0].content[0].text
    );

    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "LLM error", details: err.message });
  }
}