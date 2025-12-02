# AI 大模型框架

统一的 AI 大模型管理框架，支持多种模型提供商（Anthropic Claude、OpenAI 等）。

## 功能特性

- ✅ 支持多种 AI 模型提供商（Anthropic、OpenAI）
- ✅ 统一的 API 接口，无需关心底层实现
- ✅ 灵活的 API Key 配置（环境变量）
- ✅ 模型列表查询和状态检查
- ✅ 文本生成和流式生成支持

## 支持的模型

### Anthropic Claude
- `claude-sonnet-4-latest` - Claude Sonnet 4 (最新版)
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `claude-3-opus-20240229` - Claude 3 Opus（最强性能）
- `claude-3-haiku-20240307` - Claude 3 Haiku（最快速度）

### OpenAI
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4` - GPT-4
- `gpt-3.5-turbo` - GPT-3.5 Turbo（性价比高）

## 快速开始

### 1. 配置 API Key

在 `.env.local` 文件中设置 API Key：

```env
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OpenAI API Key
OPENAI_API_KEY=sk-your-key-here
```

### 2. 使用统一接口

```typescript
import { generateTextWithModel } from '@/lib/ai';

// 使用 Claude 生成文本
const result = await generateTextWithModel(
  'claude-sonnet-4-latest',
  'What is love?',
  {
    maxTokens: 1000,
    temperature: 0.7,
  }
);

console.log(result.text);
```

### 3. 流式生成

```typescript
import { streamTextWithModel } from '@/lib/ai';

const stream = await streamTextWithModel(
  'claude-sonnet-4-latest',
  'Tell me a story about...',
  {
    maxTokens: 2000,
  }
);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## API 端点

### GET /api/ai/models
获取所有支持的模型列表

```bash
curl http://localhost:3000/api/ai/models
```

**响应：**
```json
{
  "models": [
    {
      "provider": "anthropic",
      "modelId": "claude-sonnet-4-latest",
      "name": "Claude Sonnet 4 (Latest)",
      "description": "Anthropic 最新的 Claude Sonnet 模型",
      "apiKeyConfigured": true
    }
  ],
  "count": 7
}
```

### POST /api/ai/generate
使用指定模型生成文本

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "claude-sonnet-4-latest",
    "prompt": "What is love?",
    "options": {
      "maxTokens": 1000,
      "temperature": 0.7
    }
  }'
```

**响应：**
```json
{
  "success": true,
  "model": "claude-sonnet-4-latest",
  "provider": "anthropic",
  "text": "Love is...",
  "usage": {
    "promptTokens": 5,
    "completionTokens": 100
  },
  "finishReason": "stop"
}
```

### GET /api/ai/test
测试模型是否可用

```bash
curl http://localhost:3000/api/ai/test?modelId=claude-sonnet-4-latest
```

## 代码结构

```
lib/ai/
├── index.ts          # 统一导出
├── models.ts         # 模型定义和配置
├── config.ts         # API Key 配置管理
└── client.ts         # 客户端创建和统一接口
```

## 扩展新模型

### 1. 在 `models.ts` 中添加模型定义

```typescript
export const SUPPORTED_MODELS: Record<string, ModelConfig> = {
  'your-new-model': {
    provider: 'your-provider',
    modelId: 'your-new-model',
    name: 'Your New Model',
    description: 'Model description',
  },
};
```

### 2. 在 `config.ts` 中添加 API Key 配置

```typescript
const envKeyMap: Record<ModelProvider, string> = {
  // ...
  'your-provider': 'YOUR_PROVIDER_API_KEY',
};
```

### 3. 在 `client.ts` 中添加客户端创建逻辑

```typescript
function createYourProviderClient(apiKey: string) {
  // 创建客户端
}

export function createModel(provider: ModelProvider, modelId: string) {
  // ...
  case 'your-provider':
    return createYourProviderClient(config.apiKey)(modelId);
}
```

## 注意事项

1. **API Key 安全**：API Key 存储在环境变量中，不要提交到代码仓库
2. **错误处理**：所有函数都会抛出错误，需要适当的错误处理
3. **速率限制**：注意各提供商的 API 速率限制
4. **成本控制**：使用 `maxTokens` 参数控制生成长度，避免意外高额费用

