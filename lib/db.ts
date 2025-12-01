import { neon } from '@neondatabase/serverless';
import type { Account, Word } from '@/types';

// 单例 SQL 函数
let sqlFunction: any = null;

// 获取 SQL 查询函数
function getSql() {
  // 如果已经初始化，直接返回
  if (sqlFunction) {
    return sqlFunction;
  }

  // 支持的数据库连接字符串环境变量（按优先级）
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.PRISMA_DATABASE_URL;
  
  if (!connectionString) {
    throw new Error(
      'Missing database connection string. ' +
      'Please set one of the following environment variables: ' +
      'DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL.'
    );
  }

  try {
    // 使用 neon 创建 SQL 函数
    sqlFunction = neon(connectionString);
    return sqlFunction;
  } catch (error) {
    console.error('Error initializing database connection:', error);
    console.error('Connection string exists:', !!connectionString);
    throw new Error(`Failed to initialize database connection: ${(error as Error).message}`);
  }
}

// 初始化数据库表
export async function initDatabase(): Promise<void> {
  const sql = getSql();
  try {
    // 创建账号表
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 创建单词表
    await sql`
      CREATE TABLE IF NOT EXISTS words (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        word VARCHAR(255) NOT NULL,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, word)
      );
    `;

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_account_id ON words(account_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// 根据 API Key 获取账号
export async function getAccountByApiKey(apiKey: string): Promise<Account | null> {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM accounts WHERE api_key = ${apiKey} LIMIT 1;
    `;
    // neon 直接返回数组，不是 { rows: [...] }
    return (result as Account[])[0] || null;
  } catch (error) {
    console.error('Error getting account:', error);
    throw error;
  }
}

// 创建账号
export async function createAccount(apiKey: string, name: string | null = null): Promise<Account> {
  const sql = getSql();
  try {
    const result = await sql`
      INSERT INTO accounts (api_key, name)
      VALUES (${apiKey}, ${name})
      RETURNING *;
    `;
    // neon 直接返回数组
    return (result as Account[])[0];
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

// 获取账号的所有单词
export async function getWordsByAccountId(accountId: number): Promise<Word[]> {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId}
      ORDER BY updated_at DESC;
    `;
    // neon 直接返回数组
    return result as Word[];
  } catch (error) {
    console.error('Error getting words:', error);
    throw error;
  }
}

// 获取单个单词
export async function getWordByAccountIdAndWord(accountId: number, word: string): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId} AND word = ${word}
      LIMIT 1;
    `;
    // neon 直接返回数组
    return (result as Word[])[0] || null;
  } catch (error) {
    console.error('Error getting word:', error);
    throw error;
  }
}

// 创建单词
export async function createWord(accountId: number, word: string, data: Record<string, any> = {}): Promise<Word> {
  const sql = getSql();
  try {
    const result = await sql`
      INSERT INTO words (account_id, word, data, updated_at)
      VALUES (${accountId}, ${word}, ${JSON.stringify(data)}, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    // neon 直接返回数组
    return (result as Word[])[0];
  } catch (error) {
    console.error('Error creating word:', error);
    throw error;
  }
}

// 更新单词
export async function updateWord(accountId: number, word: string, data: Record<string, any> = {}): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      UPDATE words 
      SET data = ${JSON.stringify(data)}, updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ${accountId} AND word = ${word}
      RETURNING *;
    `;
    // neon 直接返回数组
    return (result as Word[])[0] || null;
  } catch (error) {
    console.error('Error updating word:', error);
    throw error;
  }
}

// 删除单词
export async function deleteWord(accountId: number, word: string): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      DELETE FROM words 
      WHERE account_id = ${accountId} AND word = ${word}
      RETURNING *;
    `;
    // neon 直接返回数组
    return (result as Word[])[0] || null;
  } catch (error) {
    console.error('Error deleting word:', error);
    throw error;
  }
}

