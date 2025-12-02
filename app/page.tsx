'use client';

import { useState } from 'react';

export default function Home() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-7-sonnet');
  
  // 单词分析测试相关状态
  const [wordInput, setWordInput] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{
    basicInfo: any;
    wordAnalysis: any;
  } | null>(null);

  // 内部模型列表
  const xhsModels = [
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet (内部)' },
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet (内部)' },
    { id: 'qwen3-235b-a22b', name: '通义千问3-235b-A22B (内部)' },
    { id: 'deepseek-v3-0324', name: 'deepseek-v3-0324 (内部)' },
    { id: 'deepseek-coder', name: 'deepseek-coder (内部)' },
    { id: 'deepseek-r1-xhs', name: 'deepseek-r1 (内部)' },
  ];

  const handleTestXhsModel = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: selectedModel,
          prompt: '你好！请用中文简单介绍一下你自己。',
          options: {
            maxTokens: 200,
            temperature: 0.7,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          model: data.model,
          provider: data.provider,
          text: data.text,
          usage: data.usage,
        });
      } else {
        setTestResult({
          success: false,
          error: data.error || '未知错误',
          details: data.details,
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: '请求失败',
        details: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAnalyzeWord = async () => {
    if (!wordInput.trim()) {
      alert('请输入单词');
      return;
    }

    setAnalyzing(true);
    setAnalyzeResult(null);

    try {
      // 并行调用两个接口
      const [basicInfoResponse, wordAnalysisResponse] = await Promise.allSettled([
        fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ word: wordInput.trim() }),
        }),
        fetch('/api/word-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ word: wordInput.trim() }),
        }),
      ]);

      let basicInfo = null;
      let wordAnalysis = null;

      // 处理基础信息结果
      if (basicInfoResponse.status === 'fulfilled' && basicInfoResponse.value.ok) {
        basicInfo = await basicInfoResponse.value.json();
      } else {
        const error = basicInfoResponse.status === 'rejected' 
          ? basicInfoResponse.reason 
          : await basicInfoResponse.value.json().catch(() => ({ error: '请求失败' }));
        basicInfo = { error: error.message || error.error || '获取基础信息失败' };
      }

      // 处理词根词族分析结果
      if (wordAnalysisResponse.status === 'fulfilled' && wordAnalysisResponse.value.ok) {
        wordAnalysis = await wordAnalysisResponse.value.json();
      } else {
        const error = wordAnalysisResponse.status === 'rejected'
          ? wordAnalysisResponse.reason
          : await wordAnalysisResponse.value.json().catch(() => ({ error: '请求失败' }));
        wordAnalysis = { error: error.message || error.error || '获取词根词族分析失败' };
      }

      setAnalyzeResult({
        basicInfo,
        wordAnalysis,
      });
    } catch (error: any) {
      setAnalyzeResult({
        basicInfo: { error: '请求异常', details: error.message },
        wordAnalysis: { error: '请求异常', details: error.message },
      });
    } finally {
      setAnalyzing(false);
    }
  };

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

      <h2 style={{ marginTop: '2rem' }}>🤖 AI 大模型 API</h2>
      <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
        <li><strong>GET</strong> /api/ai/models - 获取支持的模型列表</li>
        <li><strong>POST</strong> /api/ai/generate - 使用模型生成文本</li>
        <li><strong>GET</strong> /api/ai/test - 测试模型是否可用</li>
      </ul>
      <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
        支持 Anthropic Claude 和 OpenAI 模型，API Key 通过环境变量配置
      </p>

      <h2 style={{ marginTop: '2rem' }}>📖 单词分析接口测试</h2>
      <div style={{ 
        marginTop: '1rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            输入单词：
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !analyzing) {
                  handleAnalyzeWord();
                }
              }}
              placeholder="例如: world, test, hello"
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
              disabled={analyzing}
            />
            <button
              onClick={handleAnalyzeWord}
              disabled={analyzing || !wordInput.trim()}
              style={{
                padding: '0.5rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: analyzing || !wordInput.trim() ? '#ccc' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: analyzing || !wordInput.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {analyzing ? '分析中...' : '🔍 分析单词'}
            </button>
          </div>
        </div>

        {analyzeResult && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>分析结果</h3>
            
            {/* 基础信息 */}
            <div style={{ 
              marginBottom: '1rem',
              padding: '1rem', 
              borderRadius: '4px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>
                1. 单词基础信息 (来自 /api/analyze)
              </h4>
              <pre style={{
                margin: 0,
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                maxHeight: '400px',
              }}>
                {JSON.stringify(analyzeResult.basicInfo, null, 2)}
              </pre>
            </div>

            {/* 词根词族分析 */}
            <div style={{ 
              padding: '1rem', 
              borderRadius: '4px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>
                2. 词根词族分析 (来自 /api/word-analysis)
              </h4>
              <pre style={{
                margin: 0,
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                maxHeight: '400px',
              }}>
                {JSON.stringify(analyzeResult.wordAnalysis, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '2rem' }}>🧪 内部模型快速测试</h2>
      <div style={{ 
        marginTop: '1rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            选择模型：
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            disabled={testing}
          >
            {xhsModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleTestXhsModel}
          disabled={testing}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: testing ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testing ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {testing ? '测试中...' : '🚀 测试内部模型'}
        </button>

        {testResult && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            borderRadius: '4px',
            backgroundColor: testResult.success ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${testResult.success ? '#4caf50' : '#f44336'}`,
          }}>
            {testResult.success ? (
              <div>
                <h3 style={{ marginTop: 0, color: '#2e7d32' }}>✅ 测试成功</h3>
                <p><strong>模型：</strong>{testResult.model}</p>
                <p><strong>提供商：</strong>{testResult.provider}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>响应：</strong>
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.75rem', 
                    backgroundColor: 'white', 
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {testResult.text}
                  </div>
                </div>
                {testResult.usage && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    <strong>Token 使用：</strong>
                    输入 {testResult.usage.promptTokens || 'N/A'} / 
                    输出 {testResult.usage.completionTokens || 'N/A'} / 
                    总计 {testResult.usage.totalTokens || 'N/A'}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h3 style={{ marginTop: 0, color: '#c62828' }}>❌ 测试失败</h3>
                <p><strong>错误：</strong>{testResult.error}</p>
                {testResult.details && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    <strong>详情：</strong>{testResult.details}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '2rem' }}>文档</h2>
      <p style={{ marginTop: '1rem' }}>
        查看 README.md 获取详细的 API 文档和使用说明。
      </p>
    </main>
  )
}

