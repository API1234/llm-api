import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithXhsModel } from '@/lib/ai-xhs';
import type { Meaning, Example } from '@/types';

/**
 * OPTIONS /api/word-enrichment
 * 处理 CORS 预检请求
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * POST /api/word-enrichment
 * 使用大模型为单词生成词性、词根、词族、翻译和例句
 * 
 * Body:
 * {
 *   "word": "common"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { word } = body;

    if (!word) {
      return NextResponse.json(
        { error: 'Missing required field: "word"' },
        { status: 400 }
      );
    }

    if (typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid word: must be a non-empty string' },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // 使用大模型生成完整的单词信息（词性、词根、词族、翻译和例句）
    const comprehensivePrompt = `请全面分析英语单词 "${normalizedWord}"，提供以下信息：

要求：
1. 识别该单词的所有词性（part of speech），如 noun, verb, adjective, adverb 等
2. 为每个词性提供：
   - 英文定义（definitions）
   - 中文翻译（多个翻译用分号分隔，如 "普遍的; 常见的"）
   - 1-2 个英文例句（例句中要包含单词 "${normalizedWord}"）
   - 每个例句的中文翻译
3. 识别该单词的词根（root/etymology）和词根含义
4. 列出该单词的词族（word family），包括同根词、派生词等
5. 简要说明词根的含义和来源

请以 JSON 格式返回结果，格式如下：
{
  "word": "${normalizedWord}",
  "meanings": [
    {
      "partOfSpeech": "adjective",
      "definitions": ["occurring, found, or done often", "shared by, coming from, or done by more than one"],
      "translation": "普遍的; 常见的",
      "examples": [
        {
          "sentence": "This is a common problem.",
          "translation": "这是一个常见的问题。"
        }
      ]
    },
    {
      "partOfSpeech": "noun",
      "definitions": ["a piece of open land for public use"],
      "translation": "普通人; 公民",
      "examples": [
        {
          "sentence": "The common people.",
          "translation": "普通民众。"
        }
      ]
    }
  ],
  "root": "词根",
  "rootMeaning": "词根含义",
  "wordFamily": ["词族1", "词族2", "词族3", ...],
  "explanation": "简要说明"
}

只返回 JSON 对象，不要包含其他文字说明。`;

    const result = await generateTextWithXhsModel(
      'qwen3-235b-a22b',
      comprehensivePrompt,
      {
        maxTokens: 2000,
        temperature: 0.3,
      }
    );

    // 解析 JSON 响应
    let enrichmentData: {
      word?: string;
      meanings?: Meaning[];
      root?: string;
      rootMeaning?: string;
      wordFamily?: string[];
      explanation?: string;
    } = {};

    try {
      let jsonText = result.text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      jsonText = jsonText.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '');
      enrichmentData = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('Failed to parse enrichment JSON:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: result.text,
      }, { status: 500 });
    }

    // 验证和清理数据
    const meanings: Meaning[] = [];
    if (enrichmentData.meanings && Array.isArray(enrichmentData.meanings)) {
      for (const meaning of enrichmentData.meanings) {
        if (meaning.partOfSpeech && meaning.definitions && Array.isArray(meaning.definitions)) {
          meanings.push({
            partOfSpeech: meaning.partOfSpeech,
            definitions: meaning.definitions,
            translation: meaning.translation || undefined,
            examples: meaning.examples && Array.isArray(meaning.examples)
              ? meaning.examples.slice(0, 2)
              : undefined,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      word: normalizedWord,
      meanings: meanings.length > 0 ? meanings : undefined,
      root: enrichmentData.root,
      rootMeaning: enrichmentData.rootMeaning,
      wordFamily: enrichmentData.wordFamily && Array.isArray(enrichmentData.wordFamily) 
        ? enrichmentData.wordFamily 
        : [],
      explanation: enrichmentData.explanation,
    });
  } catch (error: any) {
    console.error('Error in word-enrichment endpoint:', error);
    
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    if (errorMessage.includes('API Key not configured')) {
      statusCode = 400;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to enrich word',
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}

