import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithModel, getModelConfig } from '@/lib/ai';
import { generateTextWithXhsModel, getXhsModelConfig } from '@/lib/ai-xhs';

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
  let modelId: string | undefined;
  
  try {
    const body = await req.json();
    modelId = body.modelId;
    const { prompt, options } = body;

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

    // 验证模型是否支持（先检查外部模型，再检查内部模型）
    let modelConfig = getModelConfig(modelId);
    let isXhsModel = false;
    
    if (!modelConfig) {
      // 尝试检查是否为内部模型
      const xhsModelConfig = getXhsModelConfig(modelId);
      if (xhsModelConfig) {
        isXhsModel = true;
      } else {
        return NextResponse.json(
          { error: `Unsupported model: ${modelId}` },
          { status: 400 }
        );
      }
    }

    // 生成文本（根据模型类型选择不同的生成函数）
    const result = isXhsModel
      ? await generateTextWithXhsModel(modelId, prompt, options)
      : await generateTextWithModel(modelId, prompt, options);

    // 获取模型配置信息
    const finalModelConfig = isXhsModel ? getXhsModelConfig(modelId) : modelConfig;
    
    return NextResponse.json({
      success: true,
      model: modelId,
      provider: finalModelConfig?.provider || 'unknown',
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
        model: modelId || 'unknown',
        hint: 'The model may not exist, you may not have access to it, or the model ID may be incorrect. Try using a different model.',
      },
      { status: statusCode }
    );
  }
}

