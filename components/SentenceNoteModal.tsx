'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确认删除解析？')) return;

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
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('删除失败');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">例句详细解析（Markdown）</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="mb-4">
          {mode === 'view' ? (
            <div className="prose max-w-none">
              <ReactMarkdown>{markdown || '暂无解析'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="使用 Markdown 编写解析...（如：单词高亮、语法点、替换、近义词等）"
              className="input w-full h-64 font-mono text-sm"
            />
          )}
        </div>
        <div className="flex justify-end gap-3">
          {mode === 'view' ? (
            <>
              <button onClick={() => setMode('edit')} className="btn btn-secondary">
                编辑
              </button>
              {markdown && (
                <button onClick={handleDelete} className="btn btn-danger" disabled={loading}>
                  删除解析
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setMode('view')} className="btn btn-secondary">
                预览
              </button>
              <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
                取消
              </button>
              <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
                保存
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

