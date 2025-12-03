import { NextRequest, NextResponse } from 'next/server';
import { getAllModels, getModelsByProvider, getAllApiKeysFromEnv } from '@/lib/ai';

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
      const apiKeyConfigured = !!apiKeys[model.provider];

      return {
        ...model,
        apiKeyConfigured,
      };
    });

    return NextResponse.json({
      models: modelsWithConfig,
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
