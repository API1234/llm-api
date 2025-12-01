# 🧠 Word Analyzer API (Vercel)

一个基于大模型的英语词根与词族提取 API，支持账号隔离和单词管理。

## 功能特性

- ✅ 单词分析（基于 OpenAI）
- ✅ 数据库存储（PostgreSQL）
- ✅ 账号隔离（API Key 认证）
- ✅ 单词 CRUD 操作（创建、读取、更新、删除）

## 🚀 部署到 Vercel

### 1. 配置数据库

#### 方式一：使用 Vercel Postgres（推荐）

1. 在 Vercel 项目设置中，进入 **Storage** 标签
2. 点击 **Create Database**，选择 **Postgres**
3. 创建数据库后，Vercel 会自动添加以下环境变量：
   - `POSTGRES_URL` - 池化连接字符串（用于常规查询）
   - `POSTGRES_URL_NON_POOLING` - 非池化连接字符串（用于创建表等操作）
   
   代码会自动使用合适的连接字符串。

#### 方式二：使用外部 PostgreSQL 数据库

在 Vercel 项目设置中添加以下环境变量：

- `POSTGRES_URL`: PostgreSQL 连接字符串
  - 格式：`postgresql://username:password@host:port/database`
  - 示例：`postgresql://user:pass@localhost:5432/mydb`

### 2. 其他环境变量配置

在 Vercel 项目设置中添加以下环境变量：

- `OPENAI_API_KEY`: OpenAI API 密钥
- `INIT_DB_SECRET`: 数据库初始化密钥（可选，用于保护初始化接口，默认为 'dev-secret'）

### 3. 初始化数据库

部署后，访问 `/api/init-db` 接口初始化数据库表结构：

```bash
curl -X POST https://your-domain.vercel.app/api/init-db \
  -H "X-Init-Secret: your-secret" \
  # 或使用查询参数: ?secret=your-secret
```

### 4. 创建账号

```bash
curl -X POST https://your-domain.vercel.app/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "我的账号"}'
```

响应会返回 `api_key`，请妥善保存。

## 📚 API 接口文档

### 1. 单词分析（原有功能）

**POST** `/api/analyze`

```bash
curl -X POST https://your-domain.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"word": "hello"}'
```

### 2. 单词管理

所有单词管理接口都需要在请求头中提供 API Key：

```
X-API-Key: your-api-key
# 或
Authorization: Bearer your-api-key
```

#### 获取所有单词

**GET** `/api/words`

```bash
curl -X GET https://your-domain.vercel.app/api/words \
  -H "X-API-Key: your-api-key"
```

#### 获取单个单词

**GET** `/api/words?word=hello`

```bash
curl -X GET "https://your-domain.vercel.app/api/words?word=hello" \
  -H "X-API-Key: your-api-key"
```

#### 创建单词

**POST** `/api/words`

```bash
curl -X POST https://your-domain.vercel.app/api/words \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "hello",
    "data": {
      "lemma": "hello",
      "pos": "interjection",
      "family": ["hello", "hi", "greeting"]
    }
  }'
```

#### 更新单词

**PUT** `/api/words`

```bash
curl -X PUT https://your-domain.vercel.app/api/words \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "hello",
    "data": {
      "lemma": "hello",
      "pos": "interjection",
      "family": ["hello", "hi", "greeting", "hey"]
    }
  }'
```

#### 删除单词

**DELETE** `/api/words`

```bash
curl -X DELETE https://your-domain.vercel.app/api/words \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"word": "hello"}'
```

## 🔒 账号隔离

每个账号通过唯一的 API Key 进行身份验证，所有单词数据都按账号维度隔离。不同账号之间无法访问对方的单词数据。

## 📦 本地开发

### 1. Fork 或下载本仓库