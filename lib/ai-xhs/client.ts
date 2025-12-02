/**
 * 小红书内部模型客户端管理
 * 完全独立于外部模型客户端
 */

import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { XhsModelProvider } from './models';
import { getXhsApiKeyConfig } from './config';
import { getXhsModelConfig } from './models';
import { getXhsModel, isXhsModelAvailable } from './providers';

/**
 * 根据内部提供商创建模型实例
 */
export function createXhsModel(provider: XhsModelProvider, modelId: string) {
  const config = getXhsApiKeyConfig(provider);
  
  if (!config) {
    throw new Error(
      `API Key not configured for provider: ${provider}. Please set XHS_API_KEY or XHS_ANTHROPIC_API_KEY environment variable.`
    );
  }

  const modelConfig = getXhsModelConfig(modelId);
  if (!modelConfig) {
    throw new Error(`Unsupported internal model: ${modelId}`);
  }

  if (modelConfig.provider !== provider) {
    throw new Error(
      `Model ${modelId} does not belong to provider ${provider}`
    );
  }

  switch (provider) {
    case 'xhs-openai': {
      // 创建内部 OpenAI 兼容 provider
      // 注意：内部 API 使用标准的 /v1/chat/completions 端点，而不是新的 /v1/responses
      // 因此需要使用 .chat() 方法而不是直接调用 provider
      const xhsProvider = createOpenAI({
        name: 'xhs',
        baseURL: config.baseUrl || 'http://redservingapi.devops.xiaohongshu.com/v1',
        apiKey: config.apiKey,
      });
      // 使用 .chat() 方法以使用 /v1/chat/completions 端点
      return xhsProvider.chat(modelId);
    }
    case 'xhs-anthropic': {
      // 创建内部 Anthropic provider
      // 尝试动态加载 @xhs/aws-anthropic（可选依赖）
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createAnthropic: createXhsAnthropic } = require('@xhs/aws-anthropic');
        const anthropicProvider = createXhsAnthropic({
          token: config.token || config.apiKey,
        });
        
        return anthropicProvider(modelId);
      } catch (error: any) {
        // 包不存在或加载失败
        throw new Error(
          `@xhs/aws-anthropic 包不可用。该包仅在内部网络环境中可用。` +
          `如果需要在 Vercel 等外部环境使用，请联系管理员配置私有 npm registry。` +
          `原始错误: ${error.message}`
        );
      }
    }
    default:
      throw new Error(`Unsupported internal provider: ${provider}`);
  }
}

/**
 * 生成文本（内部模型统一接口）
 */
export async function generateTextWithXhsModel(
  modelId: string,
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  }
) {
  const modelConfig = getXhsModelConfig(modelId);
  if (!modelConfig) {
    throw new Error(`Unsupported internal model: ${modelId}`);
  }

  // 优先使用预定义的模型实例
  let model: any;
  const xhsModel = getXhsModel(modelId);
  if (xhsModel && isXhsModelAvailable(modelId)) {
    model = xhsModel;
  } else {
    // 如果预定义模型不可用，尝试动态创建
    model = createXhsModel(modelConfig.provider, modelId);
  }

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
    // AI SDK 5 已经支持新的模型规范，不再需要处理 v1 兼容性错误
    // 但保留错误处理以便调试
    console.error(`[generateTextWithXhsModel] 生成文本失败 (${modelId}):`, error);
    throw error;
  }
}

/**
 * 流式生成文本（内部模型统一接口）
 */
export async function streamTextWithXhsModel(
  modelId: string,
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  }
) {
  const modelConfig = getXhsModelConfig(modelId);
  if (!modelConfig) {
    throw new Error(`Unsupported internal model: ${modelId}`);
  }

  // 优先使用预定义的模型实例
  let model: any;
  const xhsModel = getXhsModel(modelId);
  if (xhsModel && isXhsModelAvailable(modelId)) {
    model = xhsModel;
  } else {
    // 如果预定义模型不可用，尝试动态创建
    model = createXhsModel(modelConfig.provider, modelId);
  }

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
    // AI SDK 5 已经支持新的模型规范，不再需要处理 v1 兼容性错误
    // 但保留错误处理以便调试
    console.error(`[streamTextWithXhsModel] 流式生成文本失败 (${modelId}):`, error);
    throw error;
  }
}

