# API 调用示例

本文档提供了所有 API 端点的 fetch 调用示例。

## 前置准备

### 1. 初始化数据库

**方式一：使用 npm 脚本（推荐）**
```bash
npm run init-db
```

**方式二：直接运行脚本**
```bash
node scripts/init-db.js
```

**方式三：通过 API 接口**
```bash
curl -X POST http://localhost:3000/api/init-db \
  -H "X-Init-Secret: dev-secret" \
  -H "Content-Type: application/json"
```

### 2. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

---

## API 端点

### 1. 初始化数据库

```javascript
// POST /api/init-db
const response = await fetch('http://localhost:3000/api/init-db', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Init-Secret': 'dev-secret' // 或使用环境变量 INIT_DB_SECRET
  }
});

const data = await response.json();
console.log(data);
// { message: "Database initialized successfully" }
```

---

### 2. 创建账号

#### 基本用法（自动生成 API Key）

```javascript
// POST /api/accounts
const response = await fetch('http://localhost:3000/api/accounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '我的账号' // 可选
  })
});

const data = await response.json();
console.log(data);
// {
//   message: "Account created successfully",
//   account: {
//     id: 1,
//     name: "我的账号",
//     api_key: "abc123...",
//     created_at: "2024-01-01T00:00:00.000Z"
//   }
// }

// 保存 API Key 供后续使用
const API_KEY = data.account.api_key;
```

#### 自定义 API Key

```javascript
const response = await fetch('http://localhost:3000/api/accounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '我的账号',
    api_key: 'my-custom-api-key-12345' // 自定义 API Key
  })
});

const data = await response.json();
const API_KEY = data.account.api_key; // 将是你提供的 api_key
```

#### 无名称创建账号

```javascript
const response = await fetch('http://localhost:3000/api/accounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({}) // 不提供 name
});

const data = await response.json();
// data.account.name 将为 null
```

#### 带错误处理

```javascript
try {
  const response = await fetch('http://localhost:3000/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: '我的账号'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('账号创建成功:', data.account);
  const API_KEY = data.account.api_key;
} catch (error) {
  console.error('创建账号失败:', error.message);
}
```

#### 测试脚本

运行测试脚本查看所有测试用例：

```bash
npm run test-create-account
```

或查看 `scripts/create-account-examples.js` 获取更多示例代码。

---

### 3. 单词分析

```javascript
// POST /api/analyze
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    word: 'hello'
  })
});

const data = await response.json();
console.log(data);
// {
//   lemma: "hello",
//   pos: "interjection",
//   family: ["hello", "hi", "greeting"]
// }
```

---

### 4. 获取所有单词

```javascript
// GET /api/words
const API_KEY = 'your-api-key-here';

const response = await fetch('http://localhost:3000/api/words', {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY
    // 或使用: 'Authorization': `Bearer ${API_KEY}`
  }
});

const data = await response.json();
console.log(data);
// {
//   words: [
//     {
//       id: 1,
//       account_id: 1,
//       word: "hello",
//       data: { lemma: "hello", pos: "interjection" },
//       created_at: "2024-01-01T00:00:00.000Z",
//       updated_at: "2024-01-01T00:00:00.000Z"
//     }
//   ],
//   count: 1
// }
```

---

### 5. 获取单个单词

```javascript
// GET /api/words?word=hello
const API_KEY = 'your-api-key-here';

const response = await fetch('http://localhost:3000/api/words?word=hello', {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY
  }
});

const data = await response.json();
console.log(data);
// {
//   id: 1,
//   account_id: 1,
//   word: "hello",
//   data: { lemma: "hello", pos: "interjection" },
//   created_at: "2024-01-01T00:00:00.000Z",
//   updated_at: "2024-01-01T00:00:00.000Z"
// }
```

---

### 6. 创建单词

```javascript
// POST /api/words
const API_KEY = 'your-api-key-here';

const response = await fetch('http://localhost:3000/api/words', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  body: JSON.stringify({
    word: 'hello',
    data: {
      lemma: 'hello',
      pos: 'interjection',
      family: ['hello', 'hi', 'greeting']
    }
  })
});

const data = await response.json();
console.log(data);
// {
//   id: 1,
//   account_id: 1,
//   word: "hello",
//   data: { lemma: "hello", pos: "interjection", family: [...] },
//   created_at: "2024-01-01T00:00:00.000Z",
//   updated_at: "2024-01-01T00:00:00.000Z"
// }
```

---

### 7. 更新单词

```javascript
// PUT /api/words
const API_KEY = 'your-api-key-here';

const response = await fetch('http://localhost:3000/api/words', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  body: JSON.stringify({
    word: 'hello',
    data: {
      lemma: 'hello',
      pos: 'interjection',
      family: ['hello', 'hi', 'greeting', 'hey'] // 添加了新词
    }
  })
});

const data = await response.json();
console.log(data);
// 返回更新后的单词对象
```

---

### 8. 删除单词

```javascript
// DELETE /api/words
const API_KEY = 'your-api-key-here';

const response = await fetch('http://localhost:3000/api/words', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  body: JSON.stringify({
    word: 'hello'
  })
});

const data = await response.json();
console.log(data);
// {
//   message: "Word deleted successfully",
//   word: { ... } // 被删除的单词对象
// }
```

---

## 完整示例：从创建账号到管理单词

```javascript
// 1. 创建账号
const createAccountResponse = await fetch('http://localhost:3000/api/accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '测试账号' })
});
const { account } = await createAccountResponse.json();
const API_KEY = account.api_key;
console.log('API Key:', API_KEY);

// 2. 分析单词
const analyzeResponse = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'hello' })
});
const analysis = await analyzeResponse.json();

// 3. 保存单词
const saveWordResponse = await fetch('http://localhost:3000/api/words', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  body: JSON.stringify({
    word: 'hello',
    data: analysis
  })
});
const savedWord = await saveWordResponse.json();
console.log('保存的单词:', savedWord);

// 4. 获取所有单词
const wordsResponse = await fetch('http://localhost:3000/api/words', {
  headers: { 'X-API-Key': API_KEY }
});
const { words } = await wordsResponse.json();
console.log('所有单词:', words);
```

---

## 错误处理示例

```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API 调用失败:', error);
    throw error;
  }
}

// 使用示例
try {
  const data = await safeApiCall('http://localhost:3000/api/words', {
    headers: { 'X-API-Key': 'invalid-key' }
  });
} catch (error) {
  console.error('错误:', error.message);
  // 输出: 错误: Invalid API Key.
}
```

---

## 环境变量

确保在 `.env.local` 文件中设置以下环境变量：

```env
# 数据库连接
DATABASE_URL=postgresql://user:password@host:port/database

# OpenAI API Key
OPENAI_API_KEY=sk-...

# 数据库初始化密钥（可选）
INIT_DB_SECRET=dev-secret
```

---

## 注意事项

1. **API Key 认证**：所有单词管理接口都需要在请求头中提供 API Key
   - 使用 `X-API-Key` 头
   - 或使用 `Authorization: Bearer <api-key>` 头

2. **账号隔离**：每个账号只能访问自己的单词数据

3. **错误状态码**：
   - `400` - 请求参数错误
   - `401` - 未授权（缺少或无效的 API Key）
   - `404` - 资源不存在
   - `409` - 资源冲突（如单词已存在）
   - `500` - 服务器内部错误

