import { NextRequest } from 'next/server';
import { getAccountByApiKey } from './db';
import type { Account } from '@/types';

// 从请求中提取 API Key
export function getApiKeyFromRequest(req: NextRequest): string | undefined {
  // 优先从 header 中获取
  const apiKey = req.headers.get('x-api-key') || 
                 req.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey || undefined;
}

// 验证 API Key 并返回账号信息
export async function authenticateRequest(req: NextRequest): Promise<{ account: Account } | { error: string }> {
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

