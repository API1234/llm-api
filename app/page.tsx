'use client';

import { useState, useEffect } from 'react';

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type);
  }
};

export default function Home() {
  // 外部模型测试相关状态
  const [testingExternal, setTestingExternal] = useState(false);
  const [testResultExternal, setTestResultExternal] = useState<any>(null);
  const [selectedExternalModel, setSelectedExternalModel] = useState<string>('');
  const [externalModels, setExternalModels] = useState<Array<{
    modelId: string;
    name: string;
    provider: string;
    description?: string;
    apiKeyConfigured: boolean;
  }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // 单词分析测试相关状态
  const [wordInput, setWordInput] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{
    enrichment?: any;
  } | null>(null);

  // 加载外部模型列表
  useEffect(() => {
    const loadExternalModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetch('/api/ai/models');
        const data = await response.json();
        if (response.ok && data.models && Array.isArray(data.models)) {
          setExternalModels(data.models);
          // 设置默认选中的模型（优先选择已配置 API Key 的模型）
          const configuredModel = data.models.find((m: any) => m.apiKeyConfigured);
          if (configuredModel) {
            setSelectedExternalModel(configuredModel.modelId);
          } else if (data.models.length > 0) {
            setSelectedExternalModel(data.models[0].modelId);
          }
        } else {
          console.error('Failed to load external models: Invalid response', data);
        }
      } catch (error) {
        console.error('Failed to load external models:', error);
        showToast('加载外部模型列表失败', 'error');
      } finally {
        setLoadingModels(false);
      }
    };
    loadExternalModels();
  }, []);

  const handleTestExternalModel = async () => {
    if (!selectedExternalModel) {
      showToast('请选择模型', 'warning');
      return;
    }

    setTestingExternal(true);
    setTestResultExternal(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: selectedExternalModel,
          prompt: '你好！请用中文简单介绍一下你自己。',
          options: {
            maxTokens: 200,
            temperature: 0.7,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResultExternal({
          success: true,
          model: data.model,
          provider: data.provider,
          text: data.text,
          usage: data.usage,
        });
        showToast('测试成功', 'success');
      } else {
        setTestResultExternal({
          success: false,
          error: data.error || '未知错误',
          details: data.details,
        });
        showToast(`测试失败: ${data.error || '未知错误'}`, 'error');
      }
    } catch (error: any) {
      setTestResultExternal({
        success: false,
        error: '请求失败',
        details: error.message,
      });
      showToast(`请求失败: ${error.message}`, 'error');
    } finally {
      setTestingExternal(false);
    }
  };

  const handleAnalyzeWord = async () => {
    if (!wordInput.trim()) {
      showToast('请输入单词', 'warning');
      return;
    }

    setAnalyzing(true);
    setAnalyzeResult(null);

    try {
      const normalizedWord = wordInput.trim().toLowerCase();

      // 调用大模型接口获取所有单词信息（包括音标）
      const enrichmentResponse = await fetch('/api/word-enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: normalizedWord }),
      });

      if (!enrichmentResponse.ok) {
        const error = await enrichmentResponse.json().catch(() => ({ error: '请求失败' }));
        throw new Error(error.message || error.error || '获取单词分析失败');
      }

      const enrichment = await enrichmentResponse.json();

      setAnalyzeResult({
        enrichment,
      });
    } catch (error: any) {
      setAnalyzeResult({
        enrichment: { error: '请求异常', details: error.message },
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
        <li><strong>POST</strong> /api/word-enrichment - 单词完整分析（包括音标、词性、词根、词族、翻译和例句）</li>
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
        支持通义千问模型，API Key 通过环境变量配置
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
              disabled={analyzing}
              style={{
                padding: '0.5rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: analyzing ? '#ccc' : wordInput.trim() ? '#0070f3' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: analyzing ? 'not-allowed' : wordInput.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                opacity: analyzing || !wordInput.trim() ? 0.6 : 1,
              }}
              title={!wordInput.trim() ? '请输入单词' : ''}
            >
              {analyzing ? '分析中...' : '🔍 分析单词'}
            </button>
          </div>
        </div>

        {analyzeResult && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>分析结果</h3>
            
            {/* 单词完整信息（来自大模型） */}
            {analyzeResult.enrichment && (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '4px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>
                  单词完整信息 (来自 /api/word-enrichment，包括音标、词性、词根、词族、翻译和例句)
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
                  {JSON.stringify(analyzeResult.enrichment, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '2rem' }}>🌐 外部模型快速测试</h2>
      <div style={{ 
        marginTop: '1rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            选择外部模型：
          </label>
          {loadingModels ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              加载模型中...
            </div>
          ) : externalModels.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              暂无可用模型，请检查 API Key 配置
            </div>
          ) : (
            <select
              value={selectedExternalModel}
              onChange={(e) => setSelectedExternalModel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
              disabled={testingExternal}
            >
              {externalModels.map((model) => (
                <option key={model.modelId} value={model.modelId}>
                  {model.name} ({model.provider}) {model.apiKeyConfigured ? '✓' : '⚠️ 未配置 API Key'}
                </option>
              ))}
            </select>
          )}
          {externalModels.length > 0 && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
              支持通义千问模型
            </p>
          )}
        </div>

        <button
          onClick={handleTestExternalModel}
          disabled={testingExternal || !selectedExternalModel || externalModels.length === 0}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: testingExternal || !selectedExternalModel || externalModels.length === 0 ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testingExternal || !selectedExternalModel || externalModels.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {testingExternal ? '测试中...' : '🚀 测试外部模型'}
        </button>

        {testResultExternal && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            borderRadius: '4px',
            backgroundColor: testResultExternal.success ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${testResultExternal.success ? '#4caf50' : '#f44336'}`,
          }}>
            {testResultExternal.success ? (
              <div>
                <h3 style={{ marginTop: 0, color: '#2e7d32' }}>✅ 测试成功</h3>
                <p><strong>模型：</strong>{testResultExternal.model}</p>
                <p><strong>提供商：</strong>{testResultExternal.provider}</p>
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
                    {testResultExternal.text}
                  </div>
                </div>
                {testResultExternal.usage && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    <strong>Token 使用：</strong>
                    输入 {testResultExternal.usage.inputTokens || testResultExternal.usage.promptTokens || 'N/A'} / 
                    输出 {testResultExternal.usage.outputTokens || testResultExternal.usage.completionTokens || 'N/A'} / 
                    总计 {testResultExternal.usage.totalTokens || 'N/A'}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h3 style={{ marginTop: 0, color: '#c62828' }}>❌ 测试失败</h3>
                <p><strong>错误：</strong>{testResultExternal.error}</p>
                {testResultExternal.details && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    <strong>详情：</strong>{testResultExternal.details}
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

