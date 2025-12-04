'use client';

import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
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
  const [loading, setLoading] = useState(false);

  // 当 initialMarkdown 变化时更新 markdown
  useEffect(() => {
    setMarkdown(initialMarkdown);
  }, [initialMarkdown]);

  // 判断初始是否有内容（用于决定预览模式，只在打开时判断，不影响编辑过程）
  const hasInitialContent = !!initialMarkdown?.trim();
  // 判断当前是否有内容（用于显示删除按钮）
  const hasContent = !!markdown?.trim();

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
        <div data-color-mode="light" className="min-h-[600px]">
          <MDEditor
            value={markdown || ''}
            onChange={(value) => setMarkdown(value || '')}
            preview={hasInitialContent ? 'preview' : 'edit'}
            visibleDragbar={false}
            textareaProps={{
              placeholder: '使用 Markdown 编写解析...（如：单词高亮、语法点、替换、近义词等）',
            }}
            height={600}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          {hasContent && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              删除解析
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
