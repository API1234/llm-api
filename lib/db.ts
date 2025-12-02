import { neon } from '@neondatabase/serverless';
import type { Account, Word, WordRecord, Meaning } from '@/types';

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

    // 创建单词表（基于新的数据模型）
    await sql`
      CREATE TABLE IF NOT EXISTS words (
        id VARCHAR(255) PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        
        -- 基础信息
        word VARCHAR(255) NOT NULL,
        original_word VARCHAR(255),
        
        -- 来源信息
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at_ms BIGINT NOT NULL,
        
        -- 单词信息（自动获取）
        phonetic VARCHAR(255),
        audio_url TEXT,
        meanings JSONB,
        root VARCHAR(255),
        root_meaning TEXT,
        related_words JSONB,
        
        -- 学习内容
        sentences JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes JSONB,
        
        -- 复习系统
        review_times JSONB NOT NULL DEFAULT '[]'::jsonb,
        
        -- 数据库时间戳
        db_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        db_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- 唯一约束：同一账号下不能有重复的 word
        UNIQUE(account_id, word)
      );
    `;

    // 如果表已存在但缺少 audio_url 字段，则添加该字段
    try {
      const columnExists = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'words' AND column_name = 'audio_url';
      `;
      
      if (columnExists.length === 0) {
        await sql`
          ALTER TABLE words ADD COLUMN audio_url TEXT;
        `;
        console.log('Added audio_url column to existing words table');
      }
    } catch (error) {
      // 如果检查失败，继续执行（可能是表不存在，会在上面创建）
      console.warn('Could not check/add audio_url column:', error);
    }

    // 如果表已存在但缺少 root_meaning 字段，则添加该字段
    try {
      const columnExists = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'words' AND column_name = 'root_meaning';
      `;
      
      if (columnExists.length === 0) {
        await sql`
          ALTER TABLE words ADD COLUMN root_meaning TEXT;
        `;
        console.log('Added root_meaning column to existing words table');
      }
    } catch (error) {
      // 如果检查失败，继续执行
      console.warn('Could not check/add root_meaning column:', error);
    }

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_account_id ON words(account_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_created_at_ms ON words(created_at_ms);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_review_times ON words USING GIN (review_times);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_words_url ON words(url);
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

// 将数据库记录转换为 Word 类型
function wordRecordToWord(record: WordRecord): Word {
  // 确保 createdAt 是有效的时间戳
  let createdAt = record.created_at_ms;
  if (!createdAt || isNaN(Number(createdAt))) {
    // 如果没有有效的时间戳，使用数据库创建时间或当前时间
    if (record.db_created_at) {
      const dbDate = typeof record.db_created_at === 'string' 
        ? new Date(record.db_created_at) 
        : record.db_created_at;
      createdAt = dbDate.getTime();
    } else {
      createdAt = Date.now();
    }
  }

    return {
      id: record.id,
      word: record.word,
      originalWord: record.original_word || undefined,
      url: record.url,
      title: record.title,
      createdAt: Number(createdAt),
      phonetic: record.phonetic || undefined,
      audioUrl: record.audio_url || undefined,
      meanings: record.meanings || undefined,
      root: record.root || undefined,
      rootMeaning: record.root_meaning || undefined,
      relatedWords: record.related_words || undefined,
      sentences: record.sentences || [],
      notes: record.notes || undefined,
      reviewTimes: record.review_times || []
    };
}

// 将 Word 类型转换为数据库记录
function wordToWordRecord(word: Word, accountId: number): Partial<WordRecord> {
  return {
    id: word.id,
    account_id: accountId,
    word: word.word,
    original_word: word.originalWord || null,
    url: word.url,
    title: word.title,
    created_at_ms: word.createdAt,
    phonetic: word.phonetic || null,
    audio_url: word.audioUrl || null,
    meanings: word.meanings || null,
    root: word.root || null,
    root_meaning: word.rootMeaning || null,
    related_words: word.relatedWords || null,
    sentences: word.sentences || [],
    notes: word.notes || null,
    review_times: word.reviewTimes || []
  };
}

// 获取账号的所有单词
export async function getWordsByAccountId(accountId: number): Promise<Word[]> {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId}
      ORDER BY created_at_ms DESC;
    `;
    // neon 直接返回数组
    const records = result as WordRecord[];
    return records.map(wordRecordToWord);
  } catch (error) {
    console.error('Error getting words:', error);
    throw error;
  }
}

// 根据 ID 获取单词
export async function getWordById(accountId: number, wordId: string): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId} AND id = ${wordId}
      LIMIT 1;
    `;
    const records = result as WordRecord[];
    if (records.length === 0) return null;
    return wordRecordToWord(records[0]);
  } catch (error) {
    console.error('Error getting word by id:', error);
    throw error;
  }
}

// 根据 word 字段获取单词
export async function getWordByAccountIdAndWord(accountId: number, word: string): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      SELECT * FROM words 
      WHERE account_id = ${accountId} AND word = ${word}
      LIMIT 1;
    `;
    const records = result as WordRecord[];
    if (records.length === 0) return null;
    return wordRecordToWord(records[0]);
  } catch (error) {
    console.error('Error getting word:', error);
    throw error;
  }
}

// 创建单词
export async function createWord(accountId: number, wordData: Word): Promise<Word> {
  const sql = getSql();
  try {
    // 确保 root_meaning 字段存在（如果不存在则添加）
    try {
      const columnExists = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'words' AND column_name = 'root_meaning';
      `;
      
      if (columnExists.length === 0) {
        console.log('Adding root_meaning column to words table...');
        await sql`
          ALTER TABLE words ADD COLUMN root_meaning TEXT;
        `;
        console.log('Successfully added root_meaning column');
      }
    } catch (migrationError) {
      // 如果迁移失败，继续执行（可能是权限问题，但字段可能已存在）
      console.warn('Could not check/add root_meaning column:', migrationError);
    }

    const record = wordToWordRecord(wordData, accountId);
    const result = await sql`
      INSERT INTO words (
        id, account_id, word, original_word,
        url, title, created_at_ms,
        phonetic, audio_url, meanings, root, root_meaning, related_words,
        sentences, notes, review_times
      )
      VALUES (
        ${record.id}, 
        ${record.account_id}, 
        ${record.word}, 
        ${record.original_word},
        ${record.url}, 
        ${record.title}, 
        ${record.created_at_ms},
        ${record.phonetic}, 
        ${record.audio_url},
        ${record.meanings ? JSON.stringify(record.meanings) : null}::jsonb, 
        ${record.root}, 
        ${record.root_meaning},
        ${record.related_words ? JSON.stringify(record.related_words) : null}::jsonb,
        ${JSON.stringify(record.sentences)}::jsonb, 
        ${record.notes ? JSON.stringify(record.notes) : null}::jsonb, 
        ${JSON.stringify(record.review_times)}::jsonb
      )
      RETURNING *;
    `;
    const records = result as WordRecord[];
    return wordRecordToWord(records[0]);
  } catch (error) {
    console.error('Error creating word:', error);
    throw error;
  }
}

// 更新单词（根据 ID）
export async function updateWordById(accountId: number, wordId: string, wordData: Partial<Word>): Promise<Word | null> {
  const sql = getSql();
  try {
    // 先获取现有数据
    const existing = await getWordById(accountId, wordId);
    if (!existing) return null;

    // 合并更新数据
    const updatedWord: Word = {
      ...existing,
      ...wordData
    };

    // 转换为数据库记录
    const record = wordToWordRecord(updatedWord, accountId);

    const result = await sql`
      UPDATE words 
      SET 
        word = ${record.word},
        original_word = ${record.original_word},
        url = ${record.url},
        title = ${record.title},
        phonetic = ${record.phonetic},
        audio_url = ${record.audio_url},
        meanings = ${record.meanings ? JSON.stringify(record.meanings) : null}::jsonb,
        root = ${record.root},
        root_meaning = ${record.root_meaning},
        related_words = ${record.related_words ? JSON.stringify(record.related_words) : null}::jsonb,
        sentences = ${JSON.stringify(record.sentences)}::jsonb,
        notes = ${record.notes ? JSON.stringify(record.notes) : null}::jsonb,
        review_times = ${JSON.stringify(record.review_times)}::jsonb,
        db_updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ${accountId} AND id = ${wordId}
      RETURNING *;
    `;

    const records = result as WordRecord[];
    if (records.length === 0) return null;
    return wordRecordToWord(records[0]);
  } catch (error) {
    console.error('Error updating word:', error);
    throw error;
  }
}

// 更新单词（根据 word 字段，保持向后兼容）
export async function updateWord(accountId: number, word: string, wordData: Partial<Word>): Promise<Word | null> {
  const sql = getSql();
  try {
    // 先找到单词的 ID
    const existing = await getWordByAccountIdAndWord(accountId, word);
    if (!existing) return null;
    
    return await updateWordById(accountId, existing.id, wordData);
  } catch (error) {
    console.error('Error updating word:', error);
    throw error;
  }
}

// 根据 ID 删除单词
export async function deleteWordById(accountId: number, wordId: string): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      DELETE FROM words 
      WHERE account_id = ${accountId} AND id = ${wordId}
      RETURNING *;
    `;
    const records = result as WordRecord[];
    if (records.length === 0) return null;
    return wordRecordToWord(records[0]);
  } catch (error) {
    console.error('Error deleting word:', error);
    throw error;
  }
}

// 根据 word 字段删除单词（保持向后兼容）
export async function deleteWord(accountId: number, word: string): Promise<Word | null> {
  const sql = getSql();
  try {
    const result = await sql`
      DELETE FROM words 
      WHERE account_id = ${accountId} AND word = ${word}
      RETURNING *;
    `;
    const records = result as WordRecord[];
    if (records.length === 0) return null;
    return wordRecordToWord(records[0]);
  } catch (error) {
    console.error('Error deleting word:', error);
    throw error;
  }
}

// 添加复习时间
export async function addReviewTime(accountId: number, wordId: string, reviewTime: number): Promise<Word | null> {
  const sql = getSql();
  try {
    // 先获取当前单词
    const word = await getWordById(accountId, wordId);
    if (!word) return null;

    // 添加新的复习时间
    const newReviewTimes = [...(word.reviewTimes || []), reviewTime];
    
    return await updateWordById(accountId, wordId, { reviewTimes: newReviewTimes });
  } catch (error) {
    console.error('Error adding review time:', error);
    throw error;
  }
}

