'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Modal from '@/components/ui/Modal';

interface SentenceNoteModalProps {
  show: boolean;
  wordId: string;
  sentenceKey: string;
  sentenceIndex: number;
  initialMarkdown: string;
  onClose: () => void;
  onSave: () => void;
}

export default function SentenceNoteModal({
  show,
  wordId,
  sentenceKey,
  sentenceIndex,
  initialMarkdown,
  onClose,
  onSave,
}: SentenceNoteModalProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [mode, setMode] = useState<'edit' | 'view'>(initialMarkdown ? 'view' : 'edit');
  const [loading, setLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, type);
    }
  };

  const showConfirm = async (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonStyle?: 'primary' | 'danger';
  }): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).showConfirm) {
      return (window as any).showConfirm(options);
    }
    return false;
  };

  const getApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key') || '';
    }
    return '';
  };

  const handleSave = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setLoading(true);

    try {
      // 获取当前单词数据
      const wordResponse = await fetch(`/api/words?id=${wordId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!wordResponse.ok) {
        throw new Error('Failed to fetch word');
      }

      const word = await wordResponse.json();
      const notes = word.notes || {};

      if (markdown.trim()) {
        notes[sentenceKey] = markdown.trim();
      } else {
        delete notes[sentenceKey];
      }

      // 更新单词
      const updateResponse = await fetch('/api/words', {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: wordId,
          notes,
        }),
      });

      if (updateResponse.ok) {
        showToast('保存成功', 'success');
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: '确认删除',
      message: '确认删除该例句的解析？',
      confirmText: '删除',
      cancelText: '取消',
      confirmButtonStyle: 'danger',
    });
    
    if (!confirmed) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    setLoading(true);

    try {
      const wordResponse = await fetch(`/api/words?id=${wordId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!wordResponse.ok) {
        throw new Error('Failed to fetch word');
      }

      const word = await wordResponse.json();
      const notes = word.notes || {};
      delete notes[sentenceKey];

      const updateResponse = await fetch('/api/words', {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: wordId,
          notes,
        }),
      });

      if (updateResponse.ok) {
        showToast('删除成功', 'success');
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('删除失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="例句详细解析（Markdown）" size="xl">
      <div className="space-y-4">
        {mode === 'view' ? (
          <div className="prose max-w-none min-h-[200px] p-4 bg-gray-50 rounded-lg">
            <ReactMarkdown>{markdown || '暂无解析'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="使用 Markdown 编写解析...（如：单词高亮、语法点、替换、近义词等）"
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        )}
        <div className="flex justify-end gap-3 pt-2">
          {mode === 'view' ? (
            <>
              <button
                onClick={() => setMode('edit')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                编辑
              </button>
              {markdown && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  删除解析
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('view')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                预览
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                保存
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

