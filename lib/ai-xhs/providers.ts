/**
 * 小红书内部模型 Provider
 * 支持内部部署的模型和自定义 API 端点
 * 完全独立于外部模型
 */

import { createOpenAI } from '@ai-sdk/openai';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { createAnthropic as createXhsAnthropic } from '@xhs/aws-anthropic';
import type { XhsModelProvider } from './models';

// 小红书内部 OpenAI 兼容 API
// 注意：内部 API 使用标准的 /v1/chat/completions 端点，而不是新的 /v1/responses
// 因此需要使用 .chat() 方法而不是直接调用 provider
const xhsProvider = createOpenAI({
  name: 'xhs',
  baseURL: process.env.XHS_API_BASE_URL || 'http://redservingapi.devops.xiaohongshu.com/v1',
  apiKey: process.env.XHS_API_KEY || '',
});

// 导出 provider 实例，可以通过它访问所有 AI SDK 支持的功能
// 使用 @ai-sdk/openai + ai 库可以替代原生 openai 库的大部分功能
export const xhsOpenAIProvider = xhsProvider;

// 小红书内部 Anthropic API
const xhsAnthropicProvider = createXhsAnthropic({
  token: process.env.XHS_ANTHROPIC_API_KEY || '',
});
const claude37Sonnet = xhsAnthropicProvider('claude-3-7-sonnet-20250219');
const claude4Sonnet = xhsAnthropicProvider('claude-4-sonnet-20250514');

// 内部模型实例
export const qwen3_235b = xhsProvider.chat('qwen3-235b-a22b');
export const deepseek_v3_0324 = xhsProvider.chat('deepseek-v3-0324');
export const deepseek_coder = xhsProvider.chat('deepseek-coder-33b-instruct');
export const deepseek_r1_xhs = wrapLanguageModel({
  model: xhsProvider.chat('deepseek-r1'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

/**
 * 内部模型配置（用于 API 返回）
 */
export interface XhsChatModelConfig {
  id: string;
  name: string;
  description: string;
  reasoning: boolean;
  provider: XhsModelProvider;
}

export const xhsChatModels: Array<XhsChatModelConfig> = [
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    description: 'Anthropic 的 Claude 3.7 Sonnet 模型（内部）',
    reasoning: false,
    provider: 'xhs-anthropic',
  },
  {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    description: 'Anthropic 的 Claude 4 Sonnet 模型（内部）',
    reasoning: false,
    provider: 'xhs-anthropic',
  },
  {
    id: 'qwen3-235b-a22b',
    name: '通义千问3-235b-A22B',
    description: '通义千问3-235b-A22B（内部）',
    reasoning: false,
    provider: 'xhs-openai',
  },
  {
    id: 'deepseek-v3-0324',
    name: 'deepseek-v3-0324',
    description: '私有部署 deepseek-v3-0324（内部）',
    reasoning: false,
    provider: 'xhs-openai',
  },
  {
    id: 'deepseek-coder',
    name: 'deepseek-coder-33b-instruct',
    description: '私有部署 deepseek-coder-33b-instruct（内部）',
    reasoning: false,
    provider: 'xhs-openai',
  },
  {
    id: 'deepseek-r1-xhs',
    name: 'deepseek-r1',
    description: '私有部署 deepseek-r1（内部，支持 reasoning）',
    reasoning: true,
    provider: 'xhs-openai',
  },
];

/**
 * 内部模型映射
 */
export const xhsChatModelMap: Record<string, any> = {
  'qwen3-235b-a22b': qwen3_235b,
  'deepseek-v3-0324': deepseek_v3_0324,
  'deepseek-coder': deepseek_coder,
  'deepseek-r1-xhs': deepseek_r1_xhs,
  'claude-3-7-sonnet': claude37Sonnet,
  'claude-4-sonnet': claude4Sonnet,
};

/**
 * 图像模型映射（如果支持）
 */
export const xhsImageModelMap: Record<string, any> = {
  // 如果内部 API 支持图像生成，可以在这里添加
  // 'dall-e-3': xhsProvider.image('dall-e-3'),
  // 'dall-e-2': xhsProvider.image('dall-e-2'),
};

/**
 * 获取内部模型实例
 */
export function getXhsModel(modelId: string) {
  return xhsChatModelMap[modelId] || null;
}

/**
 * 检查模型是否可用
 */
export function isXhsModelAvailable(modelId: string): boolean {
  const model = getXhsModel(modelId);
  if (!model) return false;
  
  // 检查必要的环境变量
  const modelConfig = xhsChatModels.find(m => m.id === modelId);
  if (!modelConfig) return false;
  
  if (modelConfig.provider === 'xhs-openai') {
    return !!(process.env.XHS_API_KEY || process.env.XHS_API_BASE_URL);
  } else if (modelConfig.provider === 'xhs-anthropic') {
    return !!(process.env.XHS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);
  }
  
  return false;
}

