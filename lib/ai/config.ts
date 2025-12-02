/**
 * AI 模型 API Key 配置管理
 * 从环境变量或数据库读取配置
 */

import type { ModelProvider } from './models';

export interface ApiKeyConfig {
  provider: ModelProvider;
  apiKey: string;
  baseUrl?: string; // 可选的自定义 base URL
}

/**
 * 从环境变量获取 API Key
 */
export function getApiKeyFromEnv(provider: ModelProvider): string | null {
  const envKeyMap: Record<ModelProvider, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    custom: 'CUSTOM_API_KEY',
  };

  const envKey = envKeyMap[provider];
  return process.env[envKey] || null;
}

/**
 * 获取所有环境变量中的 API Key 配置
 */
export function getAllApiKeysFromEnv(): Partial<Record<ModelProvider, string>> {
  return {
    anthropic: getApiKeyFromEnv('anthropic') || undefined,
    openai: getApiKeyFromEnv('openai') || undefined,
    custom: getApiKeyFromEnv('custom') || undefined,
  };
}

/**
 * 验证 API Key 格式（基础验证）
 */
export function validateApiKey(provider: ModelProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  // 基础格式验证
  switch (provider) {
    case 'anthropic':
      // Anthropic API Key 通常以 sk- 开头
      return apiKey.startsWith('sk-') || apiKey.length > 20;
    case 'openai':
      // OpenAI API Key 通常以 sk- 开头
      return apiKey.startsWith('sk-') || apiKey.length > 20;
    case 'custom':
      return apiKey.length > 0;
    default:
      return false;
  }
}

/**
 * 获取 API Key 配置（优先从环境变量，后续可以从数据库读取）
 */
export function getApiKeyConfig(provider: ModelProvider): ApiKeyConfig | null {
  const apiKey = getApiKeyFromEnv(provider);
  
  if (!apiKey) {
    return null;
  }

  // 验证 API Key
  if (!validateApiKey(provider, apiKey)) {
    console.warn(`Invalid API Key format for provider: ${provider}`);
    return null;
  }

  return {
    provider,
    apiKey,
    // 可以添加自定义 base URL（如果需要）
    baseUrl: process.env[`${provider.toUpperCase()}_BASE_URL`] || undefined,
  };
}

