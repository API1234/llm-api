/**
 * 小红书内部模型 API Key 配置管理
 * 完全独立于外部模型配置
 */

import type { XhsModelProvider } from './models';

export interface XhsApiKeyConfig {
  provider: XhsModelProvider;
  apiKey: string;
  baseUrl?: string;
  token?: string; // 用于 Anthropic（某些实现使用 token 而不是 apiKey）
}

/**
 * 从环境变量获取内部 API Key
 */
export function getXhsApiKeyFromEnv(provider: XhsModelProvider): string | null {
  const envKeyMap: Record<XhsModelProvider, string> = {
    'xhs-openai': 'XHS_API_KEY',
    'xhs-anthropic': 'XHS_ANTHROPIC_API_KEY',
  };

  const envKey = envKeyMap[provider];
  return process.env[envKey] || null;
}

/**
 * 获取所有环境变量中的内部 API Key 配置
 */
export function getAllXhsApiKeysFromEnv(): Partial<Record<XhsModelProvider, string>> {
  return {
    'xhs-openai': getXhsApiKeyFromEnv('xhs-openai') || undefined,
    'xhs-anthropic': getXhsApiKeyFromEnv('xhs-anthropic') || undefined,
  };
}

/**
 * 验证内部 API Key 格式（基础验证）
 */
export function validateXhsApiKey(provider: XhsModelProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  // 基础格式验证
  switch (provider) {
    case 'xhs-openai':
      // 内部 OpenAI 兼容 API Key
      return apiKey.length > 0;
    case 'xhs-anthropic':
      // 内部 Anthropic API Key
      return apiKey.length > 0;
    default:
      return false;
  }
}

/**
 * 获取内部 API Key 配置
 */
export function getXhsApiKeyConfig(provider: XhsModelProvider): XhsApiKeyConfig | null {
  const apiKey = getXhsApiKeyFromEnv(provider);
  
  if (!apiKey) {
    return null;
  }

  // 验证 API Key
  if (!validateXhsApiKey(provider, apiKey)) {
    console.warn(`Invalid API Key format for provider: ${provider}`);
    return null;
  }

  const config: XhsApiKeyConfig = {
    provider,
    apiKey,
  };

  // 对于 xhs-openai，使用 XHS_API_BASE_URL
  if (provider === 'xhs-openai') {
    config.baseUrl = process.env.XHS_API_BASE_URL || 'http://redservingapi.devops.xiaohongshu.com/v1';
  }

  // 对于 xhs-anthropic，可能需要 token
  if (provider === 'xhs-anthropic') {
    const token = process.env.XHS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (token) {
      config.token = token;
    }
  }

  return config;
}

