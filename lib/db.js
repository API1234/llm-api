import { createClient } from '@vercel/postgres';

// 单例数据库客户端
let dbClient = null;

// 获取 SQL 查询函数
function getSql() {
  // Vercel Postgres 提供两种连接字符串：
  // 1. POSTGRES_URL - 池化连接（推荐用于大多数查询）
  // 2. POSTGRES_URL_NON_POOLING - 非池化连接（用于直接连接，如创建表等操作）
  const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  
  if (!postgresUrl) {
    throw new Error(
      'Missing POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable. ' +
      'Please set POSTGRES_URL in your Vercel project settings. ' +
      'If using Vercel Postgres, these should be automatically provided when you create the database.'
    );
  }

  // 如果已经创建了客户端，直接使用
  if (dbClient) {
    return dbClient.sql;
  }

  // 创建新的客户端
  // 对于创建表等操作，使用非池化连接更合适
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  dbClient = createClient({ connectionString });
  return dbClient.sql;
}

// 初始化数据库表
export async function initDatabase() {
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
export async function getAccountByApiKey(apiKey) {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM accounts WHERE api_key = ${apiKey} LIMIT 1;
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting account:', error);
    throw error;
  }
}

// 创建账号
export async function createAccount(apiKey, name = null) {
  const sql = getSql();
  try {
    const result = await sql`
      INSERT INTO accounts (api_key, name)
      VALUES (${apiKey}, ${name})
      RETURNING *;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

// 获取账号的所有单词
export async function getWordsByAccountId(accountId) {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId}
      ORDER BY updated_at DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting words:', error);
    throw error;
  }
}

// 获取单个单词
export async function getWordByAccountIdAndWord(accountId, word) {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId} AND word = ${word}
      LIMIT 1;
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting word:', error);
    throw error;
  }
}

// 创建单词
export async function createWord(accountId, word, data = {}) {
  const sql = getSql();
  try {
    const result = await sql`
      INSERT INTO words (account_id, word, data, updated_at)
      VALUES (${accountId}, ${word}, ${JSON.stringify(data)}, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error creating word:', error);
    throw error;
  }
}

// 更新单词
export async function updateWord(accountId, word, data = {}) {
  const sql = getSql();
  try {
    const result = await sql`
      UPDATE words 
      SET data = ${JSON.stringify(data)}, updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ${accountId} AND word = ${word}
      RETURNING *;
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating word:', error);
    throw error;
  }
}

// 删除单词
export async function deleteWord(accountId, word) {
  const sql = getSql();
  try {
    const result = await sql`
      DELETE FROM words 
      WHERE account_id = ${accountId} AND word = ${word}
      RETURNING *;
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error deleting word:', error);
    throw error;
  }
}

