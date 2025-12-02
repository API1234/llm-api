import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithXhsModel } from '@/lib/ai-xhs';

/**
 * OPTIONS /api/word-analysis
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
 * POST /api/word-analysis
 * 使用内部 Claude-4-sonnet 模型分析英语单词的词根和词族
 * 
 * Body:
 * {
 *   "word": "world"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { word } = body;

    // 验证必需参数
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

    // 构建 prompt
    const prompt = `请分析英语单词 "${word}" 的词根和词族。

要求：
1. 识别该单词的词根（root/etymology）
2. 列出该单词的词族（word family），包括同根词、派生词等
3. 简要说明词根的含义和来源

请以 JSON 格式返回结果，格式如下：
{
  "word": "${word}",
  "root": "词根",
  "rootMeaning": "词根含义",
  "wordFamily": ["词族1", "词族2", "词族3", ...],
  "explanation": "简要说明"
}

只返回 JSON 对象，不要包含其他文字说明。`;

    // 使用 Claude-4-sonnet 模型生成分析结果
    const result = await generateTextWithXhsModel(
      'claude-4-sonnet',
      prompt,
      {
        maxTokens: 1000,
        temperature: 0.3, // 较低温度以获得更准确的结果
      }
    );

    // 尝试解析 JSON 响应
    let analysisResult;
    try {
      // 提取 JSON 部分（可能包含 markdown 代码块）
      let jsonText = result.text.trim();
      
      // 如果包含 markdown 代码块，提取其中的 JSON
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      // 如果包含 ```json 或 ```，移除它们
      jsonText = jsonText.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '');
      
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      // 如果解析失败，返回原始文本
      console.warn('Failed to parse JSON response, returning raw text:', parseError);
      return NextResponse.json({
        success: true,
        word: word,
        rawResponse: result.text,
        error: 'Failed to parse JSON response',
        usage: result.usage,
      });
    }

    // 验证返回的数据结构
    if (!analysisResult.root || !analysisResult.wordFamily) {
      return NextResponse.json({
        success: true,
        word: word,
        rawResponse: result.text,
        parsed: analysisResult,
        warning: 'Response structure may be incomplete',
        usage: result.usage,
      });
    }

    return NextResponse.json({
      success: true,
      word: analysisResult.word || word,
      root: analysisResult.root,
      rootMeaning: analysisResult.rootMeaning || '',
      wordFamily: Array.isArray(analysisResult.wordFamily) 
        ? analysisResult.wordFamily 
        : [],
      explanation: analysisResult.explanation || '',
      usage: result.usage,
    });
  } catch (error: any) {
    console.error('Error analyzing word:', error);
    
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    // 检查是否是 API Key 未配置错误
    if (errorMessage.includes('API Key not configured')) {
      statusCode = 400;
    }
    
    // 检查是否是模型调用错误
    if (errorMessage.includes('Failed to generate text') || 
        errorMessage.includes('APICallError')) {
      statusCode = 500;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze word',
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}

