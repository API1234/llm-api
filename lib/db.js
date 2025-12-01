import { createPool, createClient } from '@vercel/postgres';

// 单例池或客户端
let dbInstance = null;
let sqlFunction = null;

// 获取 SQL 查询函数
function getSql() {
  // 如果已经初始化，直接返回
  if (sqlFunction) {
    return sqlFunction;
  }

  // 支持的数据库连接字符串环境变量（按优先级）
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL || 
    process.env.PRISMA_DATABASE_URL;
  
  if (!connectionString) {
    throw new Error(
      'Missing database connection string. ' +
      'Please set one of the following environment variables: ' +
      'POSTGRES_URL, DATABASE_URL, or PRISMA_DATABASE_URL. ' +
      'If using Vercel Postgres, POSTGRES_URL should be automatically provided.'
    );
  }

  try {
    // 首先尝试使用 createClient（适用于直接连接）
    // 因为错误信息提示需要使用 createClient 或池化连接字符串
    try {
      dbInstance = createClient({ connectionString });
      sqlFunction = dbInstance.sql;
      
      // 验证 sql 方法是否可用
      if (!sqlFunction || typeof sqlFunction !== 'function') {
        throw new Error('Client does not have sql method');
      }
      
      return sqlFunction;
    } catch (clientError) {
      // 如果 createClient 失败，尝试使用 createPool
      console.warn('createClient failed, trying createPool:', clientError.message);
      dbInstance = createPool({ connectionString });
      sqlFunction = dbInstance.sql;
      
      if (!sqlFunction || typeof sqlFunction !== 'function') {
        throw new Error('Pool does not have sql method');
      }
      
      return sqlFunction;
    }
  } catch (error) {
    console.error('Error initializing database connection:', error);
    console.error('Connection string exists:', !!connectionString);
    throw new Error(`Failed to initialize database connection: ${error.message}`);
  }
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

