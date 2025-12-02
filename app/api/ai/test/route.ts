import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithModel, getModelConfig, getAllApiKeysFromEnv } from '@/lib/ai';
import { generateTextWithXhsModel, getXhsModelConfig, getAllXhsApiKeysFromEnv } from '@/lib/ai-xhs';

/**
 * GET /api/ai/test
 * 测试 AI 模型是否可用
 * 
 * Query params:
 * - modelId: 要测试的模型 ID（可选，默认使用第一个可用的模型）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId');

    // 获取所有 API Key 配置（外部和内部）
    const apiKeys = getAllApiKeysFromEnv();
    const xhsApiKeys = getAllXhsApiKeysFromEnv();
    
    // 如果没有指定模型，尝试找到第一个有 API Key 的模型
    let testModelId = modelId;
    let isXhsModel = false;
    
    if (!testModelId) {
      // 优先测试外部模型
      if (apiKeys.anthropic) {
        testModelId = 'claude-sonnet-4-latest';
      } else if (apiKeys.openai) {
        // 优先使用 gpt-4o-mini（更稳定，不需要特殊权限）
        testModelId = 'gpt-4o-mini';
      } else if (xhsApiKeys['xhs-anthropic']) {
        // 尝试内部 Anthropic 模型
        testModelId = 'claude-3-7-sonnet';
        isXhsModel = true;
      } else if (xhsApiKeys['xhs-openai']) {
        // 尝试内部 OpenAI 模型
        testModelId = 'qwen3-235b-a22b';
        isXhsModel = true;
      } else {
        return NextResponse.json(
          { 
            error: 'No API Key configured. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, XHS_API_KEY, or XHS_ANTHROPIC_API_KEY environment variable.',
            configuredKeys: [
              ...Object.keys(apiKeys).filter(key => apiKeys[key as keyof typeof apiKeys]),
              ...Object.keys(xhsApiKeys).filter(key => xhsApiKeys[key as keyof typeof xhsApiKeys])
            ]
          },
          { status: 400 }
        );
      }
    }

    // 检查模型配置（先检查外部，再检查内部）
    let modelConfig = getModelConfig(testModelId);
    let xhsModelConfig = null;
    
    if (!modelConfig) {
      // 尝试检查是否为内部模型
      xhsModelConfig = getXhsModelConfig(testModelId);
      if (xhsModelConfig) {
        isXhsModel = true;
      } else {
        return NextResponse.json(
          { error: `Unsupported model: ${testModelId}` },
          { status: 400 }
        );
      }
    }

    // 检查 API Key 是否配置
    if (isXhsModel && xhsModelConfig) {
      if (!xhsApiKeys[xhsModelConfig.provider as keyof typeof xhsApiKeys]) {
        return NextResponse.json(
          { 
            error: `API Key not configured for provider: ${xhsModelConfig.provider}`,
            provider: xhsModelConfig.provider,
            requiredEnvVar: xhsModelConfig.provider === 'xhs-openai' ? 'XHS_API_KEY' : 'XHS_ANTHROPIC_API_KEY'
          },
          { status: 400 }
        );
      }
    } else if (modelConfig) {
      if (!apiKeys[modelConfig.provider as keyof typeof apiKeys]) {
        return NextResponse.json(
          { 
            error: `API Key not configured for provider: ${modelConfig.provider}`,
            provider: modelConfig.provider,
            requiredEnvVar: `${modelConfig.provider.toUpperCase()}_API_KEY`
          },
          { status: 400 }
        );
      }
    }

    // 测试生成文本（根据模型类型选择不同的生成函数）
    const testPrompt = 'Say "Hello, AI SDK!" in a friendly way.';
    const result = isXhsModel
      ? await generateTextWithXhsModel(testModelId, testPrompt, { maxTokens: 50 })
      : await generateTextWithModel(testModelId, testPrompt, { maxTokens: 50 });

    const finalModelConfig = isXhsModel && xhsModelConfig ? xhsModelConfig : modelConfig;
    
    return NextResponse.json({
      success: true,
      model: testModelId,
      provider: finalModelConfig?.provider || 'unknown',
      response: result.text,
      usage: result.usage,
      configuredProviders: [
        ...Object.keys(apiKeys).filter(key => apiKeys[key as keyof typeof apiKeys]),
        ...Object.keys(xhsApiKeys).filter(key => xhsApiKeys[key as keyof typeof xhsApiKeys])
      ],
    });
  } catch (error) {
    console.error('Error testing AI model:', error);
    const err = error as Error;
    
    return NextResponse.json(
      { 
        success: false,
        error: 'AI model test failed',
        details: err.message,
      },
      { status: 500 }
    );
  }
}

