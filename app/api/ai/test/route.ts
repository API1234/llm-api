import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithModel, getModelConfig, getAllApiKeysFromEnv } from '@/lib/ai';

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

    // 获取所有 API Key 配置
    const apiKeys = getAllApiKeysFromEnv();
    
    // 如果没有指定模型，尝试找到第一个有 API Key 的模型
    let testModelId = modelId;
    if (!testModelId) {
      // 优先测试 Anthropic
      if (apiKeys.anthropic) {
        testModelId = 'claude-sonnet-4-latest';
      } else if (apiKeys.openai) {
        // 优先使用 gpt-4o-mini（更稳定，不需要特殊权限）
        testModelId = 'gpt-4o-mini';
      } else {
        return NextResponse.json(
          { 
            error: 'No API Key configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.',
            configuredKeys: Object.keys(apiKeys).filter(key => apiKeys[key as keyof typeof apiKeys])
          },
          { status: 400 }
        );
      }
    }

    const modelConfig = getModelConfig(testModelId);
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Unsupported model: ${testModelId}` },
        { status: 400 }
      );
    }

    // 检查 API Key 是否配置
    if (!apiKeys[modelConfig.provider]) {
      return NextResponse.json(
        { 
          error: `API Key not configured for provider: ${modelConfig.provider}`,
          provider: modelConfig.provider,
          requiredEnvVar: `${modelConfig.provider.toUpperCase()}_API_KEY`
        },
        { status: 400 }
      );
    }

    // 测试生成文本
    const testPrompt = 'Say "Hello, AI SDK!" in a friendly way.';
    const result = await generateTextWithModel(testModelId, testPrompt, {
      maxTokens: 50,
    });

    return NextResponse.json({
      success: true,
      model: testModelId,
      provider: modelConfig.provider,
      response: result.text,
      usage: result.usage,
      configuredProviders: Object.keys(apiKeys).filter(
        key => apiKeys[key as keyof typeof apiKeys]
      ),
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

