# Next.js App Router 路由机制说明

## 文件系统路由（File-based Routing）

Next.js 13+ 使用 **App Router**，基于文件系统自动生成路由。

### 核心规则

1. **`app` 目录**：所有路由都在 `app` 目录下
2. **`page.tsx`**：自动成为路由端点
3. **文件夹路径 = URL 路径**

### 路由映射规则

```
app/
├── page.tsx              → 路由: /
├── layout.tsx            → 根布局（包裹所有页面）
│
├── about/
│   └── page.tsx          → 路由: /about
│
├── api/
│   ├── route.ts          → 路由: /api（如果存在）
│   └── words/
│       └── route.ts      → 路由: /api/words
│
└── dashboard/
    ├── page.tsx          → 路由: /dashboard
    └── settings/
        └── page.tsx      → 路由: /dashboard/settings
```

### 当前项目的路由结构

```
app/
├── page.tsx                    → 路由: / (首页)
├── layout.tsx                  → 根布局
│
└── api/
    ├── analyze/
    │   └── route.ts           → 路由: /api/analyze
    ├── accounts/
    │   └── route.ts           → 路由: /api/accounts
    ├── words/
    │   └── route.ts           → 路由: /api/words
    └── init-db/
        └── route.ts           → 路由: /api/init-db
```

## 特殊文件说明

### 1. `page.tsx` - 页面组件

- **作用**：定义路由的 UI
- **导出**：必须导出 `default` 组件
- **位置**：每个路由文件夹中

```tsx
// app/page.tsx → 路由: /
export default function Home() {
  return <div>首页</div>
}

// app/about/page.tsx → 路由: /about
export default function About() {
  return <div>关于</div>
}
```

### 2. `layout.tsx` - 布局组件

- **作用**：包裹子路由，共享 UI
- **嵌套**：可以嵌套多个 layout
- **必需**：`app/layout.tsx` 是根布局（必需）

```tsx
// app/layout.tsx - 根布局（必需）
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}

// app/dashboard/layout.tsx - 嵌套布局
export default function DashboardLayout({ children }) {
  return (
    <div>
      <nav>导航栏</nav>
      {children}
    </div>
  )
}
```

### 3. `route.ts` - API 路由

- **作用**：定义 API 端点
- **导出**：导出 HTTP 方法函数（GET, POST, PUT, DELETE 等）
- **位置**：`app/api/*/route.ts`

```tsx
// app/api/words/route.ts → 路由: /api/words
export async function GET(request: Request) {
  return Response.json({ data: '...' })
}

export async function POST(request: Request) {
  return Response.json({ data: '...' })
}
```

### 4. `loading.tsx` - 加载状态

- **作用**：显示加载 UI
- **自动**：Next.js 自动在数据加载时显示

```tsx
// app/loading.tsx
export default function Loading() {
  return <div>加载中...</div>
}
```

### 5. `error.tsx` - 错误处理

- **作用**：错误边界，捕获错误并显示错误 UI

```tsx
// app/error.tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>出错了</h2>
      <button onClick={reset}>重试</button>
    </div>
  )
}
```

## 路由工作原理

### 1. 构建时（Build Time）

Next.js 扫描 `app` 目录，根据文件结构生成路由映射：

```javascript
// Next.js 内部生成的路由映射（简化版）
{
  '/': 'app/page.tsx',
  '/api/analyze': 'app/api/analyze/route.ts',
  '/api/words': 'app/api/words/route.ts',
  // ...
}
```

### 2. 运行时（Runtime）

当用户访问 `/` 时：
1. Next.js 查找路由映射
2. 找到 `app/page.tsx`
3. 执行 `layout.tsx`（如果有）
4. 渲染 `page.tsx`
5. 返回 HTML

### 3. 代码示例

```tsx
// app/page.tsx
export default function Home() {
  // 这个组件会在访问 http://localhost:3000/ 时渲染
  return <h1>首页</h1>
}
```

访问流程：
```
用户访问: http://localhost:3000/
    ↓
Next.js 查找: app/page.tsx
    ↓
执行: app/layout.tsx (包裹)
    ↓
渲染: app/page.tsx
    ↓
返回: HTML 响应
```

## 动态路由

### 动态段（Dynamic Segments）

使用 `[param]` 创建动态路由：

```
app/
└── words/
    └── [id]/
        └── page.tsx      → 路由: /words/:id
```

```tsx
// app/words/[id]/page.tsx
export default function WordPage({ params }: { params: { id: string } }) {
  return <div>单词 ID: {params.id}</div>
}
```

### 捕获所有路由（Catch-all）

使用 `[...slug]` 捕获所有路径：

```
app/
└── docs/
    └── [...slug]/
        └── page.tsx      → 路由: /docs/* (匹配所有)
```

## API 路由特殊说明

### API 路由使用 `route.ts`

API 路由必须放在 `app/api/*/route.ts`：

```
app/api/
├── words/
│   └── route.ts          → /api/words
└── analyze/
    └── route.ts          → /api/analyze
```

### 导出 HTTP 方法

```tsx
// app/api/words/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'GET response' })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ data: 'POST response' })
}
```

## 与 Pages Router 的区别

### Pages Router (旧版)
```
pages/
├── index.tsx        → /
├── about.tsx        → /about
└── api/
    └── words.ts     → /api/words
```

### App Router (新版，当前使用)
```
app/
├── page.tsx         → /
├── about/
│   └── page.tsx    → /about
└── api/
    └── words/
        └── route.ts → /api/words
```

## 总结

- **`app/page.tsx`** 自动成为 `/` 路由
- **文件系统 = 路由系统**
- **无需配置**：Next.js 自动处理
- **类型安全**：TypeScript 支持完整
- **服务端组件**：默认使用 React Server Components

这就是为什么 `app/page.tsx` 会自动成为首页的原因！

