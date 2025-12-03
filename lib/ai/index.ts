/**
 * AI 模型框架统一导出
 * 支持通义千问模型
 */

// 模型管理
export * from './models';

// 配置管理
export * from './config';

// 客户端管理
export * from './client';

// 便捷函数
export { generateTextWithModel, streamTextWithModel } from './client';
export { getModelConfig, getAllModels, getModelsByProvider } from './models';
export { getApiKeyConfig, getAllApiKeysFromEnv } from './config';

