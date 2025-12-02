# AI 大模型框架使用指南

## 快速开始

### 1. 配置 API Key

在 `.env.local` 文件中设置 API Key：

```env
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OpenAI API Key  
OPENAI_API_KEY=sk-your-key-here
```

### 2. 在代码中使用

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
console.log(result.usage);
```

## API 端点示例

### 获取支持的模型列表

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
    },
    {
      "provider": "openai",
      "modelId": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "description": "OpenAI GPT-3.5 Turbo 模型（性价比高）",
      "apiKeyConfigured": false
    }
  ],
  "count": 7
}
```

### 使用模型生成文本

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "claude-sonnet-4-latest",
    "prompt": "What is love?",
    "options": {
      "maxTokens": 1000,
      "temperature": 0.7,
      "topP": 0.9
    }
  }'
```

**响应：**
```json
{
  "success": true,
  "model": "claude-sonnet-4-latest",
  "provider": "anthropic",
  "text": "Love is a complex and multifaceted emotion...",
  "usage": {
    "promptTokens": 5,
    "completionTokens": 100
  },
  "finishReason": "stop"
}
```

### 测试模型是否可用

```bash
# 测试默认模型（自动选择第一个有 API Key 的模型）
curl http://localhost:3000/api/ai/test

# 测试指定模型
curl http://localhost:3000/api/ai/test?modelId=claude-sonnet-4-latest
```

**响应：**
```json
{
  "success": true,
  "model": "claude-sonnet-4-latest",
  "provider": "anthropic",
  "response": "Hello, AI SDK!",
  "usage": {
    "promptTokens": 10,
    "completionTokens": 5
  },
  "configuredProviders": ["anthropic"]
}
```

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

## 代码示例

### 在 API Route 中使用

```typescript
// app/api/my-route/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithModel } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { prompt, modelId } = await req.json();
  
  try {
    const result = await generateTextWithModel(
      modelId || 'claude-sonnet-4-latest',
      prompt,
      {
        maxTokens: 1000,
      }
    );
    
    return NextResponse.json({
      text: result.text,
      usage: result.usage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### 流式生成

```typescript
import { streamTextWithModel } from '@/lib/ai';

const stream = await streamTextWithModel(
  'claude-sonnet-4-latest',
  'Tell me a story...',
  {
    maxTokens: 2000,
  }
);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## 扩展新模型

1. 在 `lib/ai/models.ts` 中添加模型定义
2. 在 `lib/ai/config.ts` 中添加 API Key 配置
3. 在 `lib/ai/client.ts` 中添加客户端创建逻辑

详细说明请查看 `lib/ai/README.md`。

