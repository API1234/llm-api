/**
 * AI 模型类型定义
 */

export type ModelProvider = 'anthropic' | 'openai' | 'qwen' | 'custom';

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
  // Anthropic Claude 模型
  'claude-sonnet-4-latest': {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-latest',
    name: 'Claude Sonnet 4 (Latest)',
    description: 'Anthropic 最新的 Claude Sonnet 模型',
  },
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropic Claude 3.5 Sonnet 模型',
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    modelId: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Anthropic Claude 3 Opus 模型（最强性能）',
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Anthropic Claude 3 Haiku 模型（最快速度）',
  },

  // OpenAI 模型
  'gpt-4o': {
    provider: 'openai',
    modelId: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI GPT-4o 模型（最新版本）',
  },
  'gpt-4o-mini': {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'OpenAI GPT-4o Mini 模型（快速且经济）',
  },
  'gpt-4-turbo': {
    provider: 'openai',
    modelId: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'OpenAI GPT-4 Turbo 模型（需要访问权限）',
  },
  'gpt-4': {
    provider: 'openai',
    modelId: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI GPT-4 模型（需要访问权限）',
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'OpenAI GPT-3.5 Turbo 模型（性价比高）',
  },

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
