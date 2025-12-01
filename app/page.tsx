export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧠 Word Analyzer API</h1>
      <p>一个基于大模型的英语词根与词族提取 API，支持账号隔离和单词管理。</p>
      
      <h2 style={{ marginTop: '2rem' }}>API 端点</h2>
      <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
        <li><strong>POST</strong> /api/analyze - 单词分析</li>
        <li><strong>POST</strong> /api/accounts - 创建账号</li>
        <li><strong>GET</strong> /api/words - 获取单词列表</li>
        <li><strong>POST</strong> /api/words - 创建单词</li>
        <li><strong>PUT</strong> /api/words - 更新单词</li>
        <li><strong>DELETE</strong> /api/words - 删除单词</li>
        <li><strong>POST</strong> /api/init-db - 初始化数据库</li>
      </ul>

      <h2 style={{ marginTop: '2rem' }}>文档</h2>
      <p style={{ marginTop: '1rem' }}>
        查看 README.md 获取详细的 API 文档和使用说明。
      </p>
    </main>
  )
}

