import { NextRequest, NextResponse } from 'next/server';
import { createAccount, getAccountByApiKey } from '@/lib/db';
import crypto from 'crypto';
import type { CreateAccountRequest, CreateAccountResponse } from '@/types';

// 生成随机 API Key
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateAccountRequest = await req.json();
    const { name, api_key } = body;

    // 如果提供了 api_key，使用它；否则生成新的
    const apiKey = api_key || generateApiKey();

    // 检查 API Key 是否已存在
    const existing = await getAccountByApiKey(apiKey);
    if (existing) {
      return NextResponse.json(
        { error: 'API Key already exists' },
        { status: 409 }
      );
    }

    // 创建账号
    const account = await createAccount(apiKey, name || null);

    const response: CreateAccountResponse = {
      message: 'Account created successfully',
      account: {
        id: account.id,
        name: account.name,
        api_key: account.api_key,
        created_at: account.created_at
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Failed to create account', details: err.message },
      { status: 500 }
    );
  }
}

