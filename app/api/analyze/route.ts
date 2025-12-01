import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { AnalyzeRequest, AnalyzeResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();
    const { word } = body;

    if (!word) {
      return NextResponse.json(
        { error: "Missing 'word'" },
        { status: 400 }
      );
    }

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

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a linguistic analyzer." },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0].message.content;

    let json: AnalyzeResponse;
    try {
      json = JSON.parse(content || '{}');
    } catch {
      // 如果返回非标准 JSON，则直接作为 text 返回
      json = { text: content || '' };
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error(err);
    const error = err as Error;
    return NextResponse.json(
      { error: "LLM error", details: error.message },
      { status: 500 }
    );
  }
}

