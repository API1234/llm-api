'use client';

import { useState, useEffect, useCallback } from 'react';
import { Word } from '@/types';
import WordCard from '@/components/WordCard';
import AddWordModal from '@/components/AddWordModal';
import ClearAllModal from '@/components/ClearAllModal';
import SentenceNoteModal from '@/components/SentenceNoteModal';
import ReviewPanel from '@/components/ReviewPanel';
import Select from '@/components/ui/Select';
import { format } from 'date-fns';

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type);
  }
};

type Tab = 'all' | 'vocab' | 'review' | 'history';
type SortOption = 'time_desc' | 'time_asc' | 'alpha_asc' | 'alpha_desc';

export default function BoardPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('time_desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [noteModal, setNoteModal] = useState<{
    show: boolean;
    wordId: string;
    sentenceKey: string;
    sentenceIndex: number;
    markdown: string;
  }>({
    show: false,
    wordId: '',
    sentenceKey: '',
    sentenceIndex: -1,
    markdown: '',
  });

  // 获取 API Key（从 localStorage 或环境变量）
  const getApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key') || '';
    }
    return '';
  };

  // 只在客户端检查 API Key
  useEffect(() => {
    setMounted(true);
    const apiKey = getApiKey();
    setHasApiKey(!!apiKey);
  }, []);

  // 获取单词列表
  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      const apiKey = getApiKey();
      if (!apiKey) {
        console.error('API Key not found');
        setWords([]);
        return;
      }

      const response = await fetch('/api/words', {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch words');
      }

      const data = await response.json();
      setWords(data.words || []);
    } catch (error) {
      console.error('Error fetching words:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // 监听 Chrome 扩展消息，刷新单词列表
  useEffect(() => {
    if (!mounted) return; // 等待客户端挂载
    
    console.log('[Board] 设置刷新监听器');
    
    // 使用防抖，避免重复刷新
    let refreshTimeout: NodeJS.Timeout | null = null;
    const handleRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        console.log('[Board] 执行刷新单词列表');
        fetchWords();
        refreshTimeout = null;
      }, 100); // 100ms 防抖，合并短时间内多次刷新请求
    };
    
    // 只监听 window.postMessage（content script 会转发消息）
    const postMessageListener = (event: MessageEvent) => {
      // 检查消息来源
      if (event.data && event.data.type === 'refresh-words') {
        console.log('[Board] 收到刷新单词列表消息 (postMessage):', event.data);
        handleRefresh();
      }
    };
    window.addEventListener('message', postMessageListener);
    
    return () => {
      window.removeEventListener('message', postMessageListener);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [fetchWords, mounted]);

  // 过滤和排序单词
  const filteredAndSortedWords = words
    .filter((word) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return word.word.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'time_asc':
          return (a.createdAt || 0) - (b.createdAt || 0);
        case 'time_desc':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'alpha_asc':
          return a.word.localeCompare(b.word);
        case 'alpha_desc':
          return b.word.localeCompare(a.word);
        default:
          return 0;
      }
    });

  // 计算今日待复习
  const getTodayReviewWords = () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startTs = todayStart.getTime();
    const endTs = startTs + dayMs;
    const schedule = [1, 3, 7, 15, 30].map((d) => d * dayMs);

    const isDueToday = (created: number) =>
      schedule.some((off) => created + off >= startTs && created + off < endTs);
    const isReviewedToday = (reviews: number[] = []) =>
      reviews.some((t) => t >= startTs && t < endTs);

    return words.filter((word) => {
      if (!word.createdAt) return false;
      const due = isDueToday(word.createdAt);
      const reviewed = isReviewedToday(word.reviewTimes);
      return due && !reviewed;
    });
  };

  // 计算历史待复习
  const getHistoryReviewWords = () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startTs = todayStart.getTime();
    const schedule = [1, 3, 7, 15, 30].map((d) => d * dayMs);

    const isReviewedAtDay = (reviews: number[] = [], cp: number) => {
      const start = new Date(cp);
      start.setHours(0, 0, 0, 0);
      const s = start.getTime();
      const e = s + dayMs;
      return reviews.some((t) => t >= s && t < e);
    };

    const items: Array<{ word: Word; checkpoint: number }> = [];
    words.forEach((word) => {
      const created = word.createdAt || 0;
      if (!created) return;
      const reviews = word.reviewTimes || [];
      schedule.forEach((off) => {
        const cp = created + off;
        if (cp < startTs && !isReviewedAtDay(reviews, cp)) {
          items.push({ word, checkpoint: cp });
        }
      });
    });

    // 去重
    const wordMap = new Map<string, { word: Word; checkpoint: number }>();
    items.forEach((item) => {
      const wordKey = item.word.word.toLowerCase();
      if (!wordMap.has(wordKey) || item.checkpoint < wordMap.get(wordKey)!.checkpoint) {
        wordMap.set(wordKey, item);
      }
    });

    return Array.from(wordMap.values());
  };

  // 导出词库
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清空词库
  const handleClearAll = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    // 删除所有单词
    for (const word of words) {
      try {
        await fetch('/api/words', {
          method: 'DELETE',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: word.id }),
        });
      } catch (error) {
        console.error('Error deleting word:', error);
      }
    }

    setWords([]);
    setShowClearModal(false);
  };

  // 更新单词
  const handleUpdateWord = (updatedWord: Word) => {
    setWords((prevWords) =>
      prevWords.map((word) => (word.id === updatedWord.id ? updatedWord : word))
    );
  };

  // 删除单词
  const handleDeleteWord = async (wordId: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const response = await fetch('/api/words', {
        method: 'DELETE',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: wordId }),
      });

      if (response.ok) {
        setWords((prevWords) => prevWords.filter((word) => word.id !== wordId));
        showToast('删除成功', 'success');
      } else {
        console.error('Failed to delete word');
        showToast('删除失败，请重试', 'error');
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      showToast('删除失败，请重试', 'error');
    }
  };

  const todayReviewWords = getTodayReviewWords();
  const historyReviewWords = getHistoryReviewWords();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">📚 英语词汇表</h1>
          <p className="text-gray-600">管理你的单词学习进度</p>
        </div>

        {/* API Key 提示 - 只在客户端渲染 */}
        {mounted && !hasApiKey && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <p className="text-yellow-800">
              ⚠️ 请先设置 API Key 才能使用词汇表功能。
            </p>
            <a
              href="/settings"
              className="btn btn-primary ml-4 whitespace-nowrap"
            >
              前往设置
            </a>
          </div>
        )}

        {/* TAB 导航 */}
        <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
          {(['all', 'vocab', 'review', 'history'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-6 py-3 font-semibold transition-all duration-200 relative ${
                currentTab === tab
                  ? 'text-cyan-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'all' && '全部'}
              {tab === 'vocab' && '单词表'}
              {tab === 'review' && '今日待复习'}
              {tab === 'history' && '历史待复习'}
              {currentTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></span>
              )}
            </button>
          ))}
        </div>

        {/* 工具栏 */}
        {(currentTab === 'all' || currentTab === 'vocab') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 搜索单词..."
                  className="input w-full"
                />
              </div>
              <div className="w-[180px]">
                <Select
                  value={sortOption}
                  onChange={(value) => setSortOption(value as SortOption)}
                  options={[
                    { value: 'time_desc', label: '添加时间：新→旧' },
                    { value: 'time_asc', label: '添加时间：旧→新' },
                    { value: 'alpha_asc', label: '首字母：A→Z' },
                    { value: 'alpha_desc', label: '首字母：Z→A' },
                  ]}
                />
              </div>
              <button 
                onClick={() => setShowAddModal(true)} 
                className="btn btn-primary whitespace-nowrap"
                disabled={mounted && !hasApiKey}
              >
                ➕ 新增单词
              </button>
              <button 
                onClick={handleExport} 
                className="btn btn-secondary whitespace-nowrap"
                disabled={words.length === 0}
              >
                📥 导出词库
              </button>
              <button 
                onClick={() => setShowClearModal(true)} 
                className="btn btn-danger whitespace-nowrap"
                disabled={words.length === 0 || (mounted && !hasApiKey)}
              >
                🗑️ 清空词库
              </button>
            </div>
            {words.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                共 {words.length} 个单词
                {searchQuery && `，搜索到 ${filteredAndSortedWords.length} 个结果`}
              </div>
            )}
          </div>
        )}

        {/* 今日待复习面板 */}
        {currentTab === 'review' && (
          <>
            {todayReviewWords.length > 0 ? (
              <ReviewPanel
                title="今日待复习"
                words={todayReviewWords}
                onReviewUpdate={fetchWords}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">今日已完成复习</h3>
                <p className="text-gray-600">太棒了！继续保持！</p>
              </div>
            )}
          </>
        )}

        {/* 历史待复习面板 */}
        {currentTab === 'history' && (
          <>
            {historyReviewWords.length > 0 ? (
              <ReviewPanel
                title="历史待复习"
                words={historyReviewWords.map((item) => item.word)}
                onReviewUpdate={fetchWords}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无历史待复习</h3>
                <p className="text-gray-600">所有单词都已按时复习！</p>
              </div>
            )}
          </>
        )}

        {/* 在全部标签页显示复习面板 */}
        {currentTab === 'all' && (
          <>
            {todayReviewWords.length > 0 && (
              <ReviewPanel
                title="今日待复习"
                words={todayReviewWords}
                onReviewUpdate={fetchWords}
              />
            )}
            {historyReviewWords.length > 0 && (
              <ReviewPanel
                title="历史待复习"
                words={historyReviewWords.map((item) => item.word)}
                onReviewUpdate={fetchWords}
              />
            )}
          </>
        )}

        {/* 单词列表 */}
        {(currentTab === 'all' || currentTab === 'vocab') && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                <p className="mt-4 text-gray-600">加载中...</p>
              </div>
            ) : filteredAndSortedWords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无词汇数据</h3>
                <p className="text-gray-600 mb-6">开始添加你的第一个单词吧！</p>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                  添加单词
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedWords.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    searchQuery={searchQuery}
                    onUpdate={handleUpdateWord}
                    onDelete={handleDeleteWord}
                    onOpenNote={(wordId, sentenceKey, sentenceIndex, markdown) => {
                      setNoteModal({
                        show: true,
                        wordId,
                        sentenceKey,
                        sentenceIndex,
                        markdown,
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddWordModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchWords}
      />

      <ClearAllModal
        show={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearAll}
      />

      <SentenceNoteModal
        show={noteModal.show}
        wordId={noteModal.wordId}
        sentenceKey={noteModal.sentenceKey}
        sentenceIndex={noteModal.sentenceIndex}
        initialMarkdown={noteModal.markdown}
        onClose={() => setNoteModal({ ...noteModal, show: false })}
        onSave={fetchWords}
      />
    </div>
  );
}

