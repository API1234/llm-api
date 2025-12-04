'use client';

import { useState, useEffect } from 'react';
import { Word } from '@/types';
import WordDetailModal from '@/components/WordDetailModal';

interface WordCardProps {
  word: Word;
  searchQuery: string;
  onUpdate: (word: Word) => void;
  onDelete: (wordId: string) => void;
  onOpenNote: (
    wordId: string,
    sentenceKey: string,
    sentenceIndex: number,
    markdown: string
  ) => void;
}

export default function WordCard({
  word,
  searchQuery,
  onUpdate,
  onDelete,
  onOpenNote,
}: WordCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSentence, setPlayingSentence] = useState<string | null>(null); // 正在播放的例句
  const [showActions, setShowActions] = useState(false);
  const [newSentence, setNewSentence] = useState('');
  const [isAddingSentence, setIsAddingSentence] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 组件卸载时停止所有播放
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: '确认删除',
      message: '确认删除该单词？此操作不可撤销。',
      confirmText: '删除',
      cancelText: '取消',
      confirmButtonStyle: 'danger',
    });

    if (!confirmed) return;
    onDelete(word.id);
  };

  const handleAddSentence = async () => {
    if (!newSentence.trim()) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    setIsAddingSentence(true);
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
        const updatedWord = await response.json();
        onUpdate(updatedWord);
        setNewSentence('');
        showToast('例句添加成功', 'success');
      } else {
        showToast('添加例句失败，请重试', 'error');
      }
    } catch (error) {
      console.error('Error adding sentence:', error);
      showToast('添加例句失败，请重试', 'error');
    } finally {
      setIsAddingSentence(false);
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
        const updatedWord = await response.json();
        onUpdate(updatedWord);
        showToast('例句删除成功', 'success');
      } else {
        showToast('删除例句失败，请重试', 'error');
      }
    } catch (error) {
      console.error('Error deleting sentence:', error);
      showToast('删除例句失败，请重试', 'error');
    }
  };

  const handleRefresh = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      showToast('请先设置 API Key', 'warning');
      return;
    }

    const confirmed = await showConfirm({
      title: '确认刷新',
      message: '确认刷新该单词的信息？这将重新获取词性、词根、词族、翻译和例句。',
      confirmText: '刷新',
      cancelText: '取消',
      confirmButtonStyle: 'primary',
    });

    if (!confirmed) return;

    setIsRefreshing(true);
    try {
      const normalizedWord = word.word.toLowerCase();

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

      const enrichmentData = await enrichmentResponse.json();

      // 更新单词数据（保留原有的例句和笔记，所有信息都来自大模型）
      const updatedWordData = {
        id: word.id,
        phonetic: enrichmentData?.phonetic || word.phonetic,
        meanings: enrichmentData?.meanings || word.meanings,
        root: enrichmentData?.root || word.root,
        rootMeaning: enrichmentData?.rootMeaning || word.rootMeaning,
        relatedWords: enrichmentData?.wordFamily || word.relatedWords || [],
        // 保留原有的例句和笔记
        sentences: word.sentences || [],
        notes: word.notes || {},
      };

      // 更新到数据库
      const updateResponse = await fetch('/api/words', {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedWordData),
      });

      if (updateResponse.ok) {
        const updatedWord = await updateResponse.json();
        onUpdate(updatedWord);
        showToast('单词信息已刷新', 'success');
      } else {
        const error = await updateResponse.json().catch(() => ({ error: '更新失败' }));
        throw new Error(error.error || '更新单词失败');
      }
    } catch (error: any) {
      console.error('Error refreshing word:', error);
      showToast(`刷新失败: ${error.message || '未知错误'}`, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const normalizeSentenceKey = (s: string) => s.trim().toLowerCase();

  // 播放发音（使用浏览器 TTS）
  const handlePlayPronunciation = () => {
    if (isPlaying) return;

    setIsPlaying(true);

    if ('speechSynthesis' in window) {
      // 停止当前所有播放
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        showToast('播放失败，请重试', 'error');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      showToast('您的浏览器不支持语音播放功能', 'warning');
    }
  };

  // 播放例句（使用浏览器 TTS）
  const handlePlaySentence = (sentence: string) => {
    if (!sentence || !sentence.trim()) return;

    // 如果正在播放同一个例句，则停止
    if (playingSentence === sentence) {
      window.speechSynthesis.cancel();
      setPlayingSentence(null);
      return;
    }

    // 停止当前所有播放
    window.speechSynthesis.cancel();
    setPlayingSentence(sentence);

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => setPlayingSentence(null);
      utterance.onerror = () => {
        setPlayingSentence(null);
        showToast('播放失败，请重试', 'error');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingSentence(null);
      showToast('您的浏览器不支持语音播放功能', 'warning');
    }
  };

  const getPartOfSpeechAbbr = (pos: string) => {
    const map: Record<string, string> = {
      noun: 'n.',
      verb: 'v.',
      adjective: 'adj.',
      adverb: 'adv.',
      pronoun: 'pron.',
      preposition: 'prep.',
      conjunction: 'conj.',
      interjection: 'interj.',
    };
    return map[pos.toLowerCase()] || pos;
  };

  const sentenceCount = (word.sentences || []).length;
  const hasRoot = word.root && word.root.trim().length > 0;
  const hasWordFamily = word.relatedWords && word.relatedWords.length > 0;

  // 高亮例句中的单词（参考图片样式：粉红色高亮）
  const highlightWordInSentence = (sentence: string, wordToHighlight: string) => {
    // 转义特殊字符
    const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, i) => {
      if (regex.test(part)) {
        return (
          <strong key={i} className="text-pink-600 font-semibold">
            {part}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 头部：单词、音标和操作按钮 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* 单词、音标和播放按钮（同一行） */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-2xl font-bold text-gray-900">
              {highlightText(word.word, searchQuery)}
            </div>
            {word.phonetic && (
              <>
                <span className="text-sm text-gray-500">{word.phonetic}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPronunciation();
                  }}
                  disabled={isPlaying}
                  className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="播放发音"
                >
                  <span className="text-sm">{isPlaying ? '⏸️' : '🔊'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 操作按钮（hover 时显示，使用 opacity 和 pointer-events 避免布局抖动） */}
        <div
          className={`flex gap-1 ml-2 transition-opacity duration-200 ${
            showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailModal(true);
            }}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
            title="查看详情"
          >
            ℹ️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新单词信息"
          >
            {isRefreshing ? '⏳' : '🔄'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 释义（参考图片样式：词性 + 中文翻译 + 例句） */}
      {word.meanings && word.meanings.length > 0 && (
        <div className="mb-3 space-y-3">
          {word.meanings.map((meaning, idx) => (
            <div key={idx} className="space-y-2">
              {/* 词性和中文翻译 */}
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                  {getPartOfSpeechAbbr(meaning.partOfSpeech)}
                </span>
                <span className="text-sm text-gray-900 flex-1">
                  {meaning.translation || meaning.definitions[0]}
                </span>
              </div>

              {/* 例句（如果有） */}
              {meaning.examples && meaning.examples.length > 0 && (
                <div className="ml-6 space-y-1.5">
                  {meaning.examples.map((example, exampleIdx) => (
                    <div key={exampleIdx} className="space-y-0.5">
                      {/* 英文例句（高亮单词）和播放按钮（inline） */}
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {highlightWordInSentence(example.sentence, word.word)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySentence(example.sentence);
                          }}
                          className="inline-flex items-center justify-center w-4 h-4 ml-1.5 mb-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 align-middle"
                          title="播放例句"
                          disabled={
                            playingSentence === example.sentence && playingSentence !== null
                          }
                        >
                          <span className="text-xs leading-none">
                            {playingSentence === example.sentence ? '⏸️' : '🔊'}
                          </span>
                        </button>
                      </div>
                      {/* 中文翻译 */}
                      {example.translation && (
                        <div className="text-xs text-gray-500 ml-0">{example.translation}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 词根和词族（如果有，显示在核心位置） */}
      {hasRoot && (
        <div className="mb-3 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="text-xs font-semibold text-purple-700 mb-1">词根</div>
          <div className="text-sm font-medium text-gray-800">{word.root}</div>
          {word.rootMeaning && (
            <div className="text-xs text-gray-600 mt-0.5">{word.rootMeaning}</div>
          )}
          {hasWordFamily && (
            <div className="mt-2 pt-2 border-t border-purple-200">
              <div className="text-xs font-semibold text-purple-700 mb-1">词族</div>
              <div className="flex flex-wrap gap-1.5">
                {word.relatedWords?.map((relatedWord, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 bg-white rounded border border-purple-200 text-gray-700"
                  >
                    {relatedWord}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 关联词（如果没有词根，显示关联词） */}
      {!hasRoot && hasWordFamily && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1.5">关联词</div>
          <div className="flex flex-wrap gap-1.5">
            {(word.relatedWords || []).map((relatedWord, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                {relatedWord}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 例句（参考图片样式：高亮单词，简洁显示） */}
      {sentenceCount > 0 && (
        <div className="mb-3 space-y-2">
          {/* 显示所有例句 */}
          {(word.sentences || []).map((sentence, idx) => {
            const sentenceKey = normalizeSentenceKey(sentence);
            const hasNote = word.notes && word.notes[sentenceKey];

            return (
              <div
                key={idx}
                className="text-sm text-gray-700 leading-relaxed flex items-start gap-1.5 group"
              >
                <span
                  className={`${
                    hasNote
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                      : 'text-gray-400 hover:text-blue-500 hover:bg-gray-50'
                  } cursor-pointer transition-all flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNote(word.id, sentenceKey, idx, word.notes?.[sentenceKey] || '');
                  }}
                  title={hasNote ? '查看/编辑解析' : '添加解析'}
                >
                  {hasNote ? '📝 已解析' : '📝'}
                </span>
                <span className="flex-1">
                  {highlightWordInSentence(sentence, word.word)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySentence(sentence);
                    }}
                    className="inline-flex items-center justify-center w-4 h-4 ml-1.5 mb-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 align-middle"
                    title="播放例句"
                    disabled={playingSentence === sentence && playingSentence !== null}
                  >
                    <span className="text-xs leading-none">
                      {playingSentence === sentence ? '⏸️' : '🔊'}
                    </span>
                  </button>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSentence(idx);
                  }}
                  className="text-red-500 hover:text-red-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="删除例句"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加例句输入框（始终显示在底部） */}
      <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newSentence}
            onChange={(e) => setNewSentence(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isAddingSentence && newSentence.trim()) {
                e.stopPropagation();
                handleAddSentence();
              }
            }}
            placeholder="添加例句..."
            className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isAddingSentence}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddSentence();
            }}
            disabled={isAddingSentence || !newSentence.trim()}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isAddingSentence ? '...' : '添加'}
          </button>
        </div>
      </div>

      {/* 详情弹窗 */}
      <WordDetailModal
        show={showDetailModal}
        word={word}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}
