# 迁移到 pnpm 指南

本项目已从 npm 迁移到 pnpm。

## 为什么使用 pnpm？

- ⚡ **更快的安装速度**: 使用硬链接和符号链接，节省磁盘空间
- 🔒 **更严格的依赖管理**: 避免幽灵依赖问题
- 💾 **节省磁盘空间**: 全局存储，避免重复安装
- 🎯 **更好的 monorepo 支持**: 原生支持 workspace

## 迁移步骤

### 1. 安装 pnpm

```bash
# 使用 npm 安装
npm install -g pnpm

# 或使用 Homebrew (macOS)
brew install pnpm

# 或使用官方安装脚本
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 2. 删除旧的锁文件

```bash
# 删除 npm 的锁文件
rm -f package-lock.json

# 如果存在 yarn 锁文件，也删除
rm -f yarn.lock
```

### 3. 安装依赖

```bash
pnpm install
```

这会生成 `pnpm-lock.yaml` 文件。

### 4. 验证安装

```bash
# 检查 pnpm 版本
pnpm --version

# 查看已安装的依赖
pnpm list

# 运行开发服务器
pnpm dev
```

## 常用命令对比

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm <script>` |
| `npm update` | `pnpm update` |

## 项目配置

### .npmrc

项目根目录的 `.npmrc` 文件包含以下配置：

```
registry=https://registry.npmjs.org/
@vercel:registry=https://registry.npmjs.org/

# pnpm 配置
shamefully-hoist=true
strict-peer-dependencies=false
```

- `shamefully-hoist=true`: 提升所有依赖到 node_modules 根目录（兼容某些工具）
- `strict-peer-dependencies=false`: 不严格检查 peer dependencies

### package.json

已添加以下字段：

- `packageManager`: 指定使用的包管理器版本
- `engines`: 指定 Node.js 和 pnpm 的最低版本要求

## CI/CD 配置

### GitHub Actions

如果使用 GitHub Actions，需要安装 pnpm：

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8

- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install
```

### Vercel

Vercel 会自动检测 `packageManager` 字段并使用相应的包管理器。

如果需要手动配置，在 Vercel 项目设置中：
- Build Command: `pnpm build`
- Install Command: `pnpm install`

## 故障排除

### 问题：依赖安装失败

```bash
# 清除 pnpm 缓存
pnpm store prune

# 删除 node_modules 和锁文件，重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 问题：某些包找不到

如果遇到模块找不到的错误，可能是 hoist 配置问题。检查 `.npmrc` 中的 `shamefully-hoist` 设置。

### 问题：peer dependencies 警告

如果看到 peer dependencies 警告，可以运行：

```bash
pnpm install --fix-lockfile
```

## 更多信息

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm vs npm vs yarn](https://pnpm.io/feature-comparison)

