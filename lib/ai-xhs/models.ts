/**
 * 小红书内部模型类型定义
 * 完全独立于外部模型
 */

export type XhsModelProvider = 'xhs-openai' | 'xhs-anthropic';

export interface XhsModelConfig {
  provider: XhsModelProvider;
  modelId: string;
  name: string;
  description?: string;
  reasoning?: boolean;
}

/**
 * 支持的内部模型列表
 */
export const XHS_SUPPORTED_MODELS: Record<string, XhsModelConfig> = {
  // 内部 Anthropic 模型
  'claude-3-7-sonnet': {
    provider: 'xhs-anthropic',
    modelId: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet (内部)',
    description: 'Anthropic 的 Claude 3.7 Sonnet 模型（内部部署）',
    reasoning: false,
  },
  'claude-4-sonnet': {
    provider: 'xhs-anthropic',
    modelId: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet (内部)',
    description: 'Anthropic 的 Claude 4 Sonnet 模型（内部部署）',
    reasoning: false,
  },
  // 内部 OpenAI 兼容模型
  'qwen3-235b-a22b': {
    provider: 'xhs-openai',
    modelId: 'qwen3-235b-a22b',
    name: '通义千问3-235b-A22B (内部)',
    description: '通义千问3-235b-A22B（内部部署）',
    reasoning: false,
  },
  'deepseek-v3-0324': {
    provider: 'xhs-openai',
    modelId: 'deepseek-v3-0324',
    name: 'deepseek-v3-0324 (内部)',
    description: '私有部署 deepseek-v3-0324（内部）',
    reasoning: false,
  },
  'deepseek-coder': {
    provider: 'xhs-openai',
    modelId: 'deepseek-coder',
    name: 'deepseek-coder-33b-instruct (内部)',
    description: '私有部署 deepseek-coder-33b-instruct（内部）',
    reasoning: false,
  },
  'deepseek-r1-xhs': {
    provider: 'xhs-openai',
    modelId: 'deepseek-r1-xhs',
    name: 'deepseek-r1 (内部)',
    description: '私有部署 deepseek-r1（内部，支持 reasoning）',
    reasoning: true,
  },
};

/**
 * 获取内部模型配置
 */
export function getXhsModelConfig(modelId: string): XhsModelConfig | null {
  return XHS_SUPPORTED_MODELS[modelId] || null;
}

/**
 * 获取所有支持的内部模型列表
 */
export function getAllXhsModels(): XhsModelConfig[] {
  return Object.values(XHS_SUPPORTED_MODELS);
}

/**
 * 按提供商获取内部模型列表
 */
export function getXhsModelsByProvider(provider: XhsModelProvider): XhsModelConfig[] {
  return Object.values(XHS_SUPPORTED_MODELS).filter(
    (model) => model.provider === provider
  );
}

