import { getAccountByApiKey } from './db.js';

// 从请求中提取 API Key
export function getApiKeyFromRequest(req) {
  // 优先从 header 中获取
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  return apiKey;
}

// 验证 API Key 并返回账号信息
export async function authenticateRequest(req) {
  const apiKey = getApiKeyFromRequest(req);
  
  if (!apiKey) {
    return { error: 'Missing API Key. Please provide X-API-Key header or Authorization Bearer token.' };
  }

  try {
    const account = await getAccountByApiKey(apiKey);
    
    if (!account) {
      return { error: 'Invalid API Key.' };
    }

    return { account };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed.' };
  }
}

