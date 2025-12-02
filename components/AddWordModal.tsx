'use client';

import { useState } from 'react';
import { WordRequest } from '@/types';
import Modal from '@/components/ui/Modal';

interface AddWordModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWordModal({ show, onClose, onSuccess }: AddWordModalProps) {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);

  const getApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key') || '';
    }
    return '';
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, type);
    }
  };

  const handleSubmit = async () => {
    if (!word.trim()) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      showToast('请先设置 API Key', 'warning');
      return;
    }

    setLoading(true);

    try {
      const normalizedWord = word.trim().toLowerCase();

      // 并行调用两个接口：基础信息（音标、音频）和完整分析（词性、词根、词族、翻译、例句）
      const [analyzeResponse, enrichmentResponse] = await Promise.allSettled([
        fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ word: normalizedWord }),
        }),
        fetch('/api/word-enrichment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ word: normalizedWord }),
        }),
      ]);

      // 处理基础信息结果
      let analyzeData = null;
      if (analyzeResponse.status === 'fulfilled' && analyzeResponse.value.ok) {
        analyzeData = await analyzeResponse.value.json();
      } else {
        console.warn('Failed to fetch word analysis');
      }

      // 处理完整分析结果
      let enrichmentData = null;
      if (enrichmentResponse.status === 'fulfilled' && enrichmentResponse.value.ok) {
        enrichmentData = await enrichmentResponse.value.json();
      } else {
        const error = enrichmentResponse.status === 'rejected'
          ? enrichmentResponse.reason
          : await enrichmentResponse.value.json().catch(() => ({ error: '请求失败' }));
        throw new Error(error.message || error.error || '获取单词分析失败');
      }

      // 构建单词数据
      const wordData: WordRequest = {
        word: normalizedWord,
        url: typeof window !== 'undefined' ? window.location.href : '',
        title: typeof document !== 'undefined' ? document.title : '',
        sentences: [],
        phonetic: analyzeData?.phonetic,
        audioUrl: analyzeData?.audioUrl,
        meanings: enrichmentData?.meanings,
        root: enrichmentData?.root,
        rootMeaning: enrichmentData?.rootMeaning,
        relatedWords: enrichmentData?.wordFamily || [],
      };

      // 创建单词
      const createResponse = await fetch('/api/words', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wordData),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create word');
      }

      setWord('');
      showToast('单词添加成功', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding word:', error);
      showToast(error.message || '添加单词失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="新增单词" size="md">
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleSubmit();
              }
            }}
            placeholder="请输入英文单词，如 algorithm"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? '获取中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

