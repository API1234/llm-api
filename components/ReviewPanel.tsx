'use client';

import { useState } from 'react';
import { Word } from '@/types';
import { format } from 'date-fns';

interface ReviewPanelProps {
  title: string;
  words: Word[];
  onReviewUpdate: () => void;
}

export default function ReviewPanel({ title, words, onReviewUpdate }: ReviewPanelProps) {
  const [checkedWords, setCheckedWords] = useState<Set<string>>(new Set());

  const getApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key') || '';
    }
    return '';
  };

  const handleToggle = async (word: Word, checked: boolean) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startTs = todayStart.getTime();
    const endTs = startTs + dayMs;

    try {
      // 获取当前单词数据
      const wordResponse = await fetch(`/api/words?id=${word.id}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!wordResponse.ok) {
        throw new Error('Failed to fetch word');
      }

      const currentWord = await wordResponse.json();
      const reviewTimes = currentWord.reviewTimes || [];

      let updatedReviewTimes: number[];
      if (checked) {
        // 添加今天的复习时间
        if (!reviewTimes.some((t: number) => t >= startTs && t < endTs)) {
          updatedReviewTimes = [...reviewTimes, now];
        } else {
          updatedReviewTimes = reviewTimes;
        }
      } else {
        // 移除今天的复习时间
        updatedReviewTimes = reviewTimes.filter(
          (t: number) => !(t >= startTs && t < endTs)
        );
      }

      // 更新单词
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

      if (updateResponse.ok) {
        if (checked) {
          setCheckedWords(new Set([...checkedWords, word.id]));
        } else {
          const newSet = new Set(checkedWords);
          newSet.delete(word.id);
          setCheckedWords(newSet);
        }
        onReviewUpdate();
      }
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  if (words.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {words.map((word) => {
          const isChecked = checkedWords.has(word.id);
          const reviewCount = (word.reviewTimes || []).length;

          return (
            <div
              key={word.id}
              className={`p-4 bg-white rounded-lg border-2 transition-all ${
                isChecked
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-cyan-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg text-gray-900">{word.word}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => handleToggle(word, e.target.checked)}
                  className="w-5 h-5 text-cyan-600 rounded focus:ring-cyan-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                <div>复习次数: {reviewCount}</div>
                {word.createdAt && !isNaN(word.createdAt) && (
                  <div>添加时间: {format(new Date(word.createdAt), 'yyyy-MM-dd')}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

