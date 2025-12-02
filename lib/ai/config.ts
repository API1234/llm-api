/**
 * AI 模型 API Key 配置管理
 * 从环境变量或数据库读取配置
 */

import type { ModelProvider } from './models';

export interface ApiKeyConfig {
  provider: ModelProvider;
  apiKey: string;
  baseUrl?: string; // 可选的自定义 base URL
  token?: string; // 用于 Anthropic（某些实现使用 token 而不是 apiKey）
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

  const config: ApiKeyConfig = {
    provider,
    apiKey,
  };

  // 对于 openai，只有在明确设置了 OPENAI_BASE_URL 时才使用自定义 baseURL
  // 否则使用默认的官方 OpenAI API (https://api.openai.com/v1)
  if (provider === 'openai') {
    const customBaseUrl = process.env.OPENAI_BASE_URL;
    if (customBaseUrl) {
      config.baseUrl = customBaseUrl;
    }
    // 如果不设置 baseUrl，@ai-sdk/openai 会使用默认的官方 API
  }

  return config;
}

