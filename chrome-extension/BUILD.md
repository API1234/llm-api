# Chrome 扩展构建说明

## 问题说明

Chrome 扩展由于内容安全策略（CSP）限制，无法加载外部 CDN 资源（如 Tailwind CSS CDN）。因此需要将 Tailwind CSS 编译为本地静态文件。

## 构建步骤

### 1. 安装依赖

确保项目根目录已安装 Tailwind CSS：

```bash
pnpm install
```

### 2. 编译 CSS

在项目根目录运行：

```bash
pnpm run build:chrome
```

或者直接进入 `chrome-extension` 目录：

```bash
cd chrome-extension
npx tailwindcss -i ./styles/popup.css -o ./styles/popup.min.css --minify
```

### 3. 加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `chrome-extension` 目录

## 文件说明

- `styles/popup.css` - 源 CSS 文件（包含 Tailwind 指令和自定义样式）
- `styles/popup.min.css` - 编译后的压缩 CSS 文件（由 Tailwind CLI 生成）
- `tailwind.config.js` - Tailwind 配置文件

## 开发流程

1. 修改 `popup.html` 中的 HTML 和 Tailwind 类名
2. 如需添加自定义样式，编辑 `styles/popup.css`
3. 运行 `pnpm run build:chrome` 重新编译 CSS
4. 在 Chrome 扩展管理页面点击"重新加载"按钮

## 注意事项

- `popup.min.css` 文件已添加到 `.gitignore`，需要编译生成
- 每次修改样式后都需要重新编译
- 编译后的文件会自动压缩以减小体积

