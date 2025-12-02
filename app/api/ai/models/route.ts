import { NextRequest, NextResponse } from 'next/server';
import { getAllModels, getModelsByProvider, getAllApiKeysFromEnv } from '@/lib/ai';
import { xhsChatModels, isXhsModelAvailable } from '@/lib/ai-xhs';

/**
 * GET /api/ai/models
 * 获取所有支持的模型列表
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');

    let models;
    if (provider) {
      models = getModelsByProvider(provider as any);
    } else {
      models = getAllModels();
    }

    // 获取 API Key 配置状态（不返回实际 key，只返回是否配置）
    const apiKeys = getAllApiKeysFromEnv();
    const modelsWithConfig = models.map((model) => {
      // 外部模型直接检查 API Key 配置
      const apiKeyConfigured = !!apiKeys[model.provider];
      
      return {
        ...model,
        apiKeyConfigured,
      };
    });

    // 添加内部模型列表（如果可用）
    const xhsModels = xhsChatModels
      .filter(model => isXhsModelAvailable(model.id))
      .map(model => ({
        provider: model.provider,
        modelId: model.id,
        name: model.name,
        description: model.description,
        apiKeyConfigured: true,
        reasoning: model.reasoning,
      }));

    return NextResponse.json({
      models: modelsWithConfig,
      xhsModels: xhsModels.length > 0 ? xhsModels : undefined,
      count: modelsWithConfig.length,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

