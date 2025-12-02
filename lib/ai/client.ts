/**
 * AI 模型客户端管理
 * 统一管理不同提供商的 AI 模型客户端
 */

import { generateText, streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelProvider } from './models';
import { getApiKeyConfig } from './config';
import { getModelConfig } from './models';

/**
 * 根据提供商创建模型实例
 * 
 * 在新版本的 @ai-sdk 中，使用 createAnthropic 和 createOpenAI 创建 provider
 * 然后调用 provider(modelId) 获取模型实例
 */
export function createModel(provider: ModelProvider, modelId: string) {
  const config = getApiKeyConfig(provider);
  
  if (!config) {
    throw new Error(
      `API Key not configured for provider: ${provider}. Please set ${provider.toUpperCase()}_API_KEY environment variable.`
    );
  }

  const modelConfig = getModelConfig(modelId);
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  if (modelConfig.provider !== provider) {
    throw new Error(
      `Model ${modelId} does not belong to provider ${provider}`
    );
  }

  switch (provider) {
    case 'anthropic': {
      // 创建 Anthropic provider，然后调用 provider(modelId)
      const anthropicProvider = createAnthropic({ apiKey: config.apiKey });
      return anthropicProvider(modelId);
    }
    case 'openai': {
      // 创建 OpenAI provider，然后调用 provider(modelId)
      // 只有在明确设置了 baseURL 时才传递，否则使用默认的官方 API
      const openaiProvider = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl && { baseURL: config.baseUrl }),
      });
      return openaiProvider(modelId);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * 生成文本（统一接口）
 */
export async function generateTextWithModel(
  modelId: string,
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  }
) {
  const modelConfig = getModelConfig(modelId);
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  // 创建模型实例（仅支持外部模型）
  const model = createModel(modelConfig.provider, modelId);

  // 构建参数对象（使用 any 类型避免类型检查问题）
  const generateParams: any = {
    model,
    prompt,
  };
  
  // 添加可选参数（如果提供）
  if (options?.maxTokens !== undefined) {
    generateParams.maxTokens = options.maxTokens;
  }
  if (options?.temperature !== undefined) {
    generateParams.temperature = options.temperature;
  }
  if (options?.topP !== undefined) {
    generateParams.topP = options.topP;
  }

  try {
    const result = await generateText(generateParams);
    return result;
  } catch (error: any) {
    // 处理 v1 模型不兼容错误
    if (error.message?.includes('UnsupportedModelVersionError') || 
        error.message?.includes('Unsupported model version v1')) {
      throw new Error(
        `Model ${modelId} uses v1 specification which is incompatible with AI SDK 5. ` +
        `Please use standard @ai-sdk/anthropic provider or upgrade the model provider. ` +
        `Original error: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * 流式生成文本（统一接口）
 */
export async function streamTextWithModel(
  modelId: string,
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  }
) {
  const modelConfig = getModelConfig(modelId);
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  // 创建模型实例（仅支持外部模型）
  const model = createModel(modelConfig.provider, modelId);

  // 构建参数对象，使用展开运算符传递 settings
  // 构建参数对象
  const streamParams: any = {
    model,
    prompt,
  };
  
  // 添加可选参数（如果提供）
  if (options?.maxTokens !== undefined) {
    streamParams.maxTokens = options.maxTokens;
  }
  if (options?.temperature !== undefined) {
    streamParams.temperature = options.temperature;
  }
  if (options?.topP !== undefined) {
    streamParams.topP = options.topP;
  }

  try {
    const result = await streamText(streamParams);
    return result;
  } catch (error: any) {
    // 处理 v1 模型不兼容错误
    if (error.message?.includes('UnsupportedModelVersionError') || 
        error.message?.includes('Unsupported model version v1')) {
      throw new Error(
        `Model ${modelId} uses v1 specification which is incompatible with AI SDK 5. ` +
        `Please use standard @ai-sdk/anthropic provider or upgrade the model provider. ` +
        `Original error: ${error.message}`
      );
    }
    throw error;
  }
}

