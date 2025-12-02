'use client';

import { useState } from 'react';
import { WordRequest } from '@/types';

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

  const handleSubmit = async () => {
    if (!word.trim()) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      alert('请先设置 API Key');
      return;
    }

    setLoading(true);

    try {
      // 调用分析 API 获取单词信息
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word.trim() }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze word');
      }

      const analyzeData = await analyzeResponse.json();

      // 构建单词数据
      const wordData: WordRequest = {
        word: word.trim().toLowerCase(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        title: typeof document !== 'undefined' ? document.title : '',
        sentences: [],
        phonetic: analyzeData.phonetic,
        audioUrl: analyzeData.audioUrl,
        meanings: analyzeData.meanings,
        root: analyzeData.root,
        relatedWords: analyzeData.relatedWords || [],
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
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding word:', error);
      alert(error.message || '添加单词失败');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">新增单词</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="mb-4">
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
            className="input w-full"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
            取消
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
            {loading ? '获取中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

