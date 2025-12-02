import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithModel, getModelConfig } from '@/lib/ai';

/**
 * POST /api/ai/generate
 * 使用指定的 AI 模型生成文本
 * 
 * Body:
 * {
 *   "modelId": "claude-sonnet-4-latest",
 *   "prompt": "What is love?",
 *   "options": {
 *     "maxTokens": 1000,
 *     "temperature": 0.7,
 *     "topP": 0.9
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelId, prompt, options } = body;

    // 验证必需参数
    if (!modelId) {
      return NextResponse.json(
        { error: 'Missing required field: "modelId"' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: "prompt"' },
        { status: 400 }
      );
    }

    // 验证模型是否支持
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Unsupported model: ${modelId}` },
        { status: 400 }
      );
    }

    // 生成文本
    const result = await generateTextWithModel(modelId, prompt, options);

    return NextResponse.json({
      success: true,
      model: modelId,
      provider: modelConfig.provider,
      text: result.text,
      usage: result.usage,
      finishReason: result.finishReason,
    });
  } catch (error: any) {
    console.error('Error generating text:', error);
    
    // 处理 API 调用错误
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    // 检查是否是 API Key 未配置错误
    if (errorMessage.includes('API Key not configured')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    // 检查是否是模型不存在或没有访问权限的错误
    if (error.data?.error) {
      const apiError = error.data.error;
      errorMessage = apiError.message || errorMessage;
      
      if (apiError.code === 'model_not_found' || apiError.type === 'invalid_request_error') {
        statusCode = 400;
        errorMessage = `Model not found or no access: ${apiError.message}. Please check if the model ID is correct and you have access to it.`;
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate text',
        details: errorMessage,
        model: modelId,
        hint: 'The model may not exist, you may not have access to it, or the model ID may be incorrect. Try using a different model.',
      },
      { status: statusCode }
    );
  }
}

