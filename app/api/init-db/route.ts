import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  // 简单的保护：只在开发环境或使用特定密钥时允许
  const secret = req.headers.get('x-init-secret') || 
                 new URL(req.url).searchParams.get('secret');
  const expectedSecret = process.env.INIT_DB_SECRET || 'dev-secret';

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    await initDatabase();
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Database initialization failed', details: err.message },
      { status: 500 }
    );
  }
}

