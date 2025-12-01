import { createAccount, getAccountByApiKey } from '../lib/db.js';
import crypto from 'crypto';

// 生成随机 API Key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { name, api_key } = req.body;

    // 如果提供了 api_key，使用它；否则生成新的
    const apiKey = api_key || generateApiKey();

    // 检查 API Key 是否已存在
    const existing = await getAccountByApiKey(apiKey);
    if (existing) {
      return res.status(409).json({ error: 'API Key already exists' });
    }

    // 创建账号
    const account = await createAccount(apiKey, name || null);

    return res.status(201).json({
      message: 'Account created successfully',
      account: {
        id: account.id,
        name: account.name,
        api_key: account.api_key,
        created_at: account.created_at
      }
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return res.status(500).json({ 
      error: 'Failed to create account', 
      details: error.message 
    });
  }
}

