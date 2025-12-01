# 数据库表结构说明

## 单词表 (words)

基于新的数据模型设计的单词表结构。

### 表结构

```sql
CREATE TABLE words (
  -- 主键和关联
  id VARCHAR(255) PRIMARY KEY,                    -- 唯一标识符: "timestamp-randomString"
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- 基础信息
  word VARCHAR(255) NOT NULL,                     -- 规范化后的单词（小写、单数）
  original_word VARCHAR(255),                     -- 原始输入（如果不同）
  
  -- 来源信息
  url TEXT NOT NULL,                              -- 来源网页 URL
  title TEXT NOT NULL,                            -- 来源网页标题
  created_at_ms BIGINT NOT NULL,                  -- 创建时间戳（毫秒）
  
  -- 单词信息（自动获取）
  phonetic VARCHAR(255),                          -- 音标
  meanings JSONB,                                 -- 释义数组 [{partOfSpeech, definitions}]
  root VARCHAR(255),                              -- 词根
  related_words JSONB,                            -- 关联词列表
  
  -- 学习内容
  sentences JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 例句数组（最多20条）
  notes JSONB,                                    -- 例句解析（Markdown格式）
  
  -- 复习系统
  review_times JSONB NOT NULL DEFAULT '[]'::jsonb, -- 复习时间戳数组
  
  -- 数据库时间戳
  db_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  db_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 唯一约束：同一账号下不能有重复的 word
  UNIQUE(account_id, word)
);
```

### 索引

- `idx_words_account_id` - 账号 ID 索引
- `idx_words_word` - 单词索引
- `idx_words_created_at_ms` - 创建时间索引
- `idx_words_review_times` - 复习时间 GIN 索引（支持 JSONB 查询）
- `idx_words_url` - URL 索引

### 数据类型说明

#### meanings (JSONB)
```json
[
  {
    "partOfSpeech": "noun",
    "definitions": ["定义1", "定义2"]
  },
  {
    "partOfSpeech": "verb",
    "definitions": ["定义1"]
  }
]
```

#### related_words (JSONB)
```json
["word1", "word2", "word3"]
```

#### sentences (JSONB)
```json
["例句1", "例句2", "例句3"]
```

#### notes (JSONB)
```json
{
  "sentence_0": "例句1的解析（Markdown格式）",
  "sentence_1": "例句2的解析（Markdown格式）"
}
```

#### review_times (JSONB)
```json
[1704067200000, 1704153600000, 1704240000000]
```

### 迁移说明

如果从旧表结构迁移，请运行：

```bash
npm run migrate-words
```

**注意**: 此脚本会：
1. 备份旧表到 `words_backup`
2. 删除旧表
3. 创建新表结构
4. 创建所有索引

旧数据需要手动迁移或重新导入。

### API 使用示例

#### 创建单词

```javascript
const response = await fetch('http://localhost:3000/api/words', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    word: 'hello',
    originalWord: 'Hello',  // 可选
    url: 'https://example.com/article',
    title: 'Example Article',
    phonetic: '/həˈloʊ/',  // 可选
    meanings: [             // 可选
      {
        partOfSpeech: 'interjection',
        definitions: ['used as a greeting']
      }
    ],
    root: 'hel',            // 可选
    relatedWords: ['hi', 'greeting'],  // 可选
    sentences: [            // 必需
      'Hello, how are you?',
      'Say hello to your friend.'
    ],
    notes: {                // 可选
      'sentence_0': '这是一个问候语'
    },
    reviewTimes: []         // 可选，默认为空数组
  })
});
```

#### 更新单词

```javascript
const response = await fetch('http://localhost:3000/api/words', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    id: '1704067200000-abc123',  // 或使用 word 字段
    sentences: ['新例句1', '新例句2'],  // 只更新需要的字段
    reviewTimes: [1704067200000, 1704153600000]
  })
});
```

#### 添加复习时间

```javascript
// 使用 updateWordById 或调用专门的函数
const word = await getWordById(accountId, wordId);
const newReviewTimes = [...(word.reviewTimes || []), Date.now()];
await updateWordById(accountId, wordId, { reviewTimes: newReviewTimes });
```

### 查询示例

#### 查询所有单词（按创建时间倒序）

```sql
SELECT * FROM words 
WHERE account_id = 1 
ORDER BY created_at_ms DESC;
```

#### 查询需要复习的单词（今天需要复习）

```sql
SELECT * FROM words 
WHERE account_id = 1 
AND (
  review_times = '[]'::jsonb 
  OR (review_times->-1)::bigint < EXTRACT(EPOCH FROM CURRENT_DATE) * 1000
);
```

#### 查询包含特定词根的单词

```sql
SELECT * FROM words 
WHERE account_id = 1 
AND root = 'hel';
```

#### 查询特定 URL 的单词

```sql
SELECT * FROM words 
WHERE account_id = 1 
AND url = 'https://example.com/article';
```

