/**
 * AI 模型类型定义
 */

export type ModelProvider = 'qwen' | 'custom';

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  name: string;
  description?: string;
}

/**
 * 支持的模型列表
 */
export const SUPPORTED_MODELS: Record<string, ModelConfig> = {
  // 通义千问模型（兼容 OpenAI API）
  'qwen-plus': {
    provider: 'qwen',
    modelId: 'qwen-plus',
    name: '通义千问 Plus',
    description: '阿里云通义千问 Plus 模型（高性能）',
  },
  'qwen-max': {
    provider: 'qwen',
    modelId: 'qwen-max',
    name: '通义千问 Max',
    description: '阿里云通义千问 Max 模型（最强性能）',
  },
  'qwen-turbo': {
    provider: 'qwen',
    modelId: 'qwen-turbo',
    name: '通义千问 Turbo',
    description: '阿里云通义千问 Turbo 模型（快速响应）',
  },
  'qwen-7b-chat': {
    provider: 'qwen',
    modelId: 'qwen-7b-chat',
    name: '通义千问 7B Chat',
    description: '阿里云通义千问 7B 对话模型',
  },
  'qwen-14b-chat': {
    provider: 'qwen',
    modelId: 'qwen-14b-chat',
    name: '通义千问 14B Chat',
    description: '阿里云通义千问 14B 对话模型',
  },
  'qwen-72b-chat': {
    provider: 'qwen',
    modelId: 'qwen-72b-chat',
    name: '通义千问 72B Chat',
    description: '阿里云通义千问 72B 对话模型（最强性能）',
  },
};

/**
 * 获取模型配置
 */
export function getModelConfig(modelId: string): ModelConfig | null {
  return SUPPORTED_MODELS[modelId] || null;
}

/**
 * 获取所有支持的模型列表
 */
export function getAllModels(): ModelConfig[] {
  return Object.values(SUPPORTED_MODELS);
}

/**
 * 按提供商获取模型列表
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return Object.values(SUPPORTED_MODELS).filter((model) => model.provider === provider);
}
