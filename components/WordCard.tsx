'use client';

import { useState } from 'react';
import { Word } from '@/types';
import { format } from 'date-fns';

interface WordCardProps {
  word: Word;
  searchQuery: string;
  onUpdate: () => void;
  onNoteClick: (sentenceKey: string, sentenceIndex: number, markdown: string) => void;
}

export default function WordCard({ word, searchQuery, onUpdate, onNoteClick }: WordCardProps) {
  const [newSentence, setNewSentence] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const getApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key') || '';
    }
    return '';
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleAddSentence = async () => {
    if (!newSentence.trim()) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    const updatedSentences = [...(word.sentences || []), newSentence.trim()].slice(0, 20);

    try {
      const response = await fetch('/api/words', {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: word.id,
          sentences: updatedSentences,
        }),
      });

      if (response.ok) {
        setNewSentence('');
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding sentence:', error);
    }
  };

  const handleDeleteSentence = async (index: number) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const updatedSentences = (word.sentences || []).filter((_, i) => i !== index);

    try {
      const response = await fetch('/api/words', {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: word.id,
          sentences: updatedSentences,
        }),
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting sentence:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确认删除该条目？')) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const response = await fetch('/api/words', {
        method: 'DELETE',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: word.id }),
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  };

  const handleCopy = async () => {
    const text = [word.word, ...(word.sentences || [])].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制');
    } catch (error) {
      alert('复制失败');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: 实现刷新单词信息
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const normalizeSentenceKey = (s: string) => s.trim().toLowerCase();

  // 播放发音
  const handlePlayPronunciation = async () => {
    if (isPlaying) return;

    setIsPlaying(true);

    try {
      // 优先使用音频 URL
      if (word.audioUrl) {
        const audio = new Audio(word.audioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          // 如果音频 URL 失败，回退到 TTS
          playWithTTS();
        };
        await audio.play();
      } else {
        // 使用浏览器的 Text-to-Speech API
        playWithTTS();
      }
    } catch (error) {
      console.error('Error playing pronunciation:', error);
      // 如果播放失败，尝试使用 TTS
      playWithTTS();
    }
  };

  // 使用 Text-to-Speech API 播放
  const playWithTTS = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      alert('您的浏览器不支持语音播放功能');
    }
  };

  const getPartOfSpeechCN = (pos: string) => {
    const map: Record<string, string> = {
      noun: '名词',
      verb: '动词',
      adjective: '形容词',
      adverb: '副词',
      pronoun: '代词',
      preposition: '介词',
      conjunction: '连词',
      interjection: '感叹词',
    };
    return map[pos.toLowerCase()] || pos;
  };

  return (
    <div className="card card-hover">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {highlightText(word.word, searchQuery)}
          </div>
          {word.phonetic && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span>{word.phonetic}</span>
              <button
                onClick={handlePlayPronunciation}
                disabled={isPlaying}
                className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="播放发音"
              >
                {isPlaying ? '⏸️' : '🔊'}
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="刷新单词信息"
          >
            {isRefreshing ? '⏳' : '↻'}
          </button>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="复制"
          >
            ⧉
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 释义 */}
      {word.meanings && word.meanings.length > 0 && (
        <div className="mb-4">
          {word.meanings.map((meaning, idx) => (
            <div key={idx} className="mb-2">
              <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
                {getPartOfSpeechCN(meaning.partOfSpeech)}
              </span>
              <ul className="mt-1 ml-4 list-disc text-sm text-gray-700">
                {meaning.definitions.map((def, defIdx) => (
                  <li key={defIdx}>{def}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 关联词 */}
      {word.relatedWords && word.relatedWords.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">关联词：</div>
          <div className="flex flex-wrap gap-2">
            {word.relatedWords.map((relatedWord, idx) => (
              <span
                key={idx}
                className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer transition-colors"
              >
                {relatedWord}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 例句 */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">例句：</div>
        <div className="space-y-2">
          {(word.sentences || []).map((sentence, idx) => {
            const sentenceKey = normalizeSentenceKey(sentence);
            const hasNote = word.notes && word.notes[sentenceKey];
            return (
              <div
                key={idx}
                className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div
                  className={`flex-1 text-sm ${
                    hasNote ? 'text-cyan-700 font-medium cursor-pointer' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    if (hasNote) {
                      onNoteClick(sentenceKey, idx, word.notes![sentenceKey]);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onNoteClick(sentenceKey, idx, word.notes?.[sentenceKey] || '');
                  }}
                >
                  {sentence}
                </div>
                <button
                  onClick={() => handleDeleteSentence(idx)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <input
            type="text"
            value={newSentence}
            onChange={(e) => setNewSentence(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddSentence();
              }
            }}
            placeholder="为该单词新增例句，回车保存"
            className="input w-full text-sm"
          />
        </div>
      </div>

      {/* 来源信息 */}
      {(word.title || word.url) && (
        <div className="mb-4 text-sm text-gray-600">
          {word.title && <div className="font-medium mb-1">{word.title}</div>}
          {word.url && (
            <a
              href={word.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 hover:underline"
            >
              {new URL(word.url).hostname}
            </a>
          )}
        </div>
      )}

      {/* 元数据 */}
      <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
        <div className="flex justify-between">
          <span>添加时间</span>
          <span>
            {word.createdAt && !isNaN(word.createdAt)
              ? format(new Date(word.createdAt), 'yyyy-MM-dd HH:mm:ss')
              : '未知'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>复习次数</span>
          <span>{(word.reviewTimes || []).length} 次</span>
        </div>
      </div>
    </div>
  );
}

