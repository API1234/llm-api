'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Word } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ReviewPanelProps {
  title: string;
  words: Word[];
  onReviewUpdate: () => void;
}

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type);
  }
};

export default function ReviewPanel({ title, words, onReviewUpdate }: ReviewPanelProps) {
  const [checkedWords, setCheckedWords] = useState<Set<string>>(new Set());
  const [flippedWords, setFlippedWords] = useState<Set<string>>(new Set());
  const [reviewMode, setReviewMode] = useState<'flashcard' | 'list'>('flashcard');
  const initializedRef = useRef(false);
  const previousWordIdsRef = useRef<Set<string>>(new Set());
  const manuallyToggledRef = useRef<Set<string>>(new Set());

  const getApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key') || '';
    }
    return '';
  };

  // 检查单词今天是否已复习
  const isReviewedToday = (word: Word): boolean => {
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startTs = todayStart.getTime();
    const endTs = startTs + dayMs;
    const reviewTimes = word.reviewTimes || [];
    return reviewTimes.some((t: number) => t >= startTs && t < endTs);
  };

  // 计算当前单词 ID 集合
  const currentWordIds = useMemo(() => {
    return new Set(words.map((word) => word.id));
  }, [words]);

  // 计算复习进度
  const reviewProgress = useMemo(() => {
    const total = words.length;
    const reviewed = words.filter((word) => isReviewedToday(word)).length;
    return { total, reviewed, percentage: total > 0 ? Math.round((reviewed / total) * 100) : 0 };
  }, [words]);

  // 初始化：只在首次加载或单词列表发生变化时（新增/删除单词）才重新初始化
  useEffect(() => {
    const previousIds = previousWordIdsRef.current;
    const currentIds = currentWordIds;

    const hasNewWords = Array.from(currentIds).some((id) => !previousIds.has(id));
    const hasRemovedWords = Array.from(previousIds).some((id) => !currentIds.has(id));

    if (!initializedRef.current || hasNewWords || hasRemovedWords) {
      const initialChecked = new Set<string>();
      words.forEach((word) => {
        if (isReviewedToday(word)) {
          initialChecked.add(word.id);
        }
      });
      setCheckedWords(initialChecked);
      initializedRef.current = true;
      previousWordIdsRef.current = new Set(currentIds);
      manuallyToggledRef.current.clear();
      setFlippedWords(new Set()); // 重置翻转状态
    } else {
      setCheckedWords((prevChecked) => {
        const newChecked = new Set(prevChecked);
        words.forEach((word) => {
          if (!manuallyToggledRef.current.has(word.id)) {
            if (isReviewedToday(word)) {
              newChecked.add(word.id);
            } else {
              newChecked.delete(word.id);
            }
          }
        });
        return newChecked;
      });
    }
  }, [words, currentWordIds]);

  const handleToggle = async (word: Word, checked: boolean) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      showToast('请先设置 API Key', 'warning');
      return;
    }

    const previousChecked = checkedWords.has(word.id);
    manuallyToggledRef.current.add(word.id);

    // 乐观更新
    if (checked) {
      setCheckedWords(new Set([...checkedWords, word.id]));
    } else {
      const newSet = new Set(checkedWords);
      newSet.delete(word.id);
      setCheckedWords(newSet);
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startTs = todayStart.getTime();
    const endTs = startTs + dayMs;

    try {
      const wordResponse = await fetch(`/api/words?id=${word.id}`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!wordResponse.ok) throw new Error('Failed to fetch word');

      const currentWord = await wordResponse.json();
      const reviewTimes = currentWord.reviewTimes || [];

      let updatedReviewTimes: number[];
      if (checked) {
        if (!reviewTimes.some((t: number) => t >= startTs && t < endTs)) {
          updatedReviewTimes = [...reviewTimes, now];
        } else {
          updatedReviewTimes = reviewTimes;
        }
      } else {
        updatedReviewTimes = reviewTimes.filter((t: number) => !(t >= startTs && t < endTs));
      }

      const updateResponse = await fetch('/api/words', {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: word.id,
          reviewTimes: updatedReviewTimes,
        }),
      });

      if (!updateResponse.ok) throw new Error('Failed to update review');

      onReviewUpdate();
    } catch (error) {
      setCheckedWords((prevCheckedWords) => {
        const newSet = new Set(prevCheckedWords);
        if (previousChecked) {
          newSet.add(word.id);
        } else {
          newSet.delete(word.id);
        }
        return newSet;
      });
      manuallyToggledRef.current.delete(word.id);
      console.error('Error updating review:', error);
      showToast('更新复习状态失败，请重试', 'error');
    }
  };

  const handleFlip = (wordId: string) => {
    setFlippedWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleBatchToggle = (checked: boolean) => {
    words.forEach((word) => {
      if (checkedWords.has(word.id) !== checked) {
        handleToggle(word, checked);
      }
    });
  };

  if (words.length === 0) return null;

  const unReviewedCount = words.length - reviewProgress.reviewed;

  return (
    <div className="mb-6">
      {/* 头部：标题、进度、模式切换 */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              共 <span className="font-semibold text-gray-900">{reviewProgress.total}</span> 个单词
            </span>
            <span>
              待复习 <span className="font-semibold text-orange-600">{unReviewedCount}</span> 个
            </span>
            <span>
              已完成 <span className="font-semibold text-green-600">{reviewProgress.reviewed}</span> 个
            </span>
          </div>
          {/* 进度条 */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${reviewProgress.percentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 模式切换 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setReviewMode('flashcard')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                reviewMode === 'flashcard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎴 闪卡
            </button>
            <button
              onClick={() => setReviewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                reviewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 列表
            </button>
          </div>
          {/* 批量操作 */}
          {reviewMode === 'list' && unReviewedCount > 0 && (
            <button
              onClick={() => handleBatchToggle(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              全部标记
            </button>
          )}
        </div>
      </div>

      {/* 闪卡模式 */}
      {reviewMode === 'flashcard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {words.map((word) => {
            const isChecked = checkedWords.has(word.id);
            const isFlipped = flippedWords.has(word.id);
            const reviewCount = (word.reviewTimes || []).length;
            const firstMeaning = word.meanings?.[0];
            const daysSinceAdded = word.createdAt
              ? Math.floor((Date.now() - word.createdAt) / (24 * 60 * 60 * 1000))
              : 0;

            return (
              <div
                key={word.id}
                className={`relative h-64 cursor-pointer group ${
                  isChecked ? 'opacity-75' : ''
                }`}
                style={{ perspective: '1000px' }}
                onClick={() => handleFlip(word.id)}
              >
                {/* 卡片容器 */}
                <div
                  className="relative w-full h-full transition-transform duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* 正面：单词 */}
                  <div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200 p-6 flex flex-col items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="text-center flex-1 flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold text-gray-900 mb-4">{word.word}</div>
                      {word.phonetic && (
                        <div className="text-lg text-gray-600 mb-4">/{word.phonetic}/</div>
                      )}
                      {/* 轻量级统计信息 */}
                      <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                        {word.createdAt && (
                          <span className="px-2 py-1 bg-white/60 rounded-full backdrop-blur-sm">
                            {daysSinceAdded} 天前
                          </span>
                        )}
                        <span className="px-2 py-1 bg-white/60 rounded-full backdrop-blur-sm">
                          复习 {reviewCount} 次
                        </span>
                      </div>
                    </div>
                    {/* 复习勾选框 - 右上角 */}
                    <div className="absolute top-3 right-3">
                      <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggle(word, e.target.checked);
                          }}
                          className="w-6 h-6 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 背面：详情 */}
                  <div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6 overflow-y-auto shadow-lg"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="space-y-3">
                      {/* 单词和音标 */}
                      <div className="text-center border-b border-blue-200 pb-3">
                        <div className="text-2xl font-bold text-gray-900">{word.word}</div>
                        {word.phonetic && (
                          <div className="text-base text-gray-600 mt-1">/{word.phonetic}/</div>
                        )}
                      </div>

                      {/* 翻译 */}
                      {firstMeaning?.translation && (
                        <div className="text-lg font-semibold text-gray-900">
                          {firstMeaning.translation}
                        </div>
                      )}

                      {/* 词性 */}
                      {firstMeaning?.partOfSpeech && (
                        <div className="text-sm text-gray-600">{firstMeaning.partOfSpeech}</div>
                      )}

                      {/* 例句 */}
                      {firstMeaning?.examples && firstMeaning.examples.length > 0 && (
                        <div className="text-sm text-gray-700 italic">
                          "{firstMeaning.examples[0].sentence}"
                        </div>
                      )}
                    </div>
                    {/* 复习勾选框 - 右上角 */}
                    <div className="absolute top-3 right-3">
                      <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggle(word, e.target.checked);
                          }}
                          className="w-6 h-6 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 列表模式 */}
      {reviewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {words.map((word) => {
            const isChecked = checkedWords.has(word.id);
            const reviewCount = (word.reviewTimes || []).length;
            const firstMeaning = word.meanings?.[0];

            return (
              <div
                key={word.id}
                className={`p-4 bg-white rounded-xl border-2 transition-all hover:shadow-md ${
                  isChecked
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-gray-900">{word.word}</span>
                      {word.phonetic && (
                        <span className="text-sm text-gray-500">/{word.phonetic}/</span>
                      )}
                    </div>
                    {firstMeaning?.translation && (
                      <div className="text-sm text-gray-700 mb-1">{firstMeaning.translation}</div>
                    )}
                    {firstMeaning?.partOfSpeech && (
                      <div className="text-xs text-gray-500">{firstMeaning.partOfSpeech}</div>
                    )}
                  </div>
                  <label className="flex-shrink-0 ml-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggle(word, e.target.checked)}
                      className="w-5 h-5 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>复习 {reviewCount} 次</span>
                  {word.createdAt && !isNaN(word.createdAt) && (
                    <span>{format(new Date(word.createdAt), 'MM-dd')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
