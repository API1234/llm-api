/**
 * 小红书内部模型框架统一导出
 * 完全独立于外部模型框架
 */

// 模型管理
export * from './models';

// 配置管理
export * from './config';

// Provider 管理
export * from './providers';

// 客户端管理
export * from './client';

// 便捷函数
export { generateTextWithXhsModel, streamTextWithXhsModel } from './client';
export { getXhsModelConfig, getAllXhsModels, getXhsModelsByProvider } from './models';
export { getXhsApiKeyConfig, getAllXhsApiKeysFromEnv } from './config';
export { 
  getXhsModel, 
  isXhsModelAvailable, 
  xhsChatModels,
  xhsChatModelMap,
  xhsImageModelMap,
  xhsOpenAIProvider,
} from './providers';

