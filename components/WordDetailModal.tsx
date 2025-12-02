'use client';

import { Word } from '@/types';
import Modal from '@/components/ui/Modal';
import { format } from 'date-fns';

interface WordDetailModalProps {
  show: boolean;
  word: Word;
  onClose: () => void;
}

export default function WordDetailModal({ show, word, onClose }: WordDetailModalProps) {
  const formatDate = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '未知';
    try {
      return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return '未知';
    }
  };

  const formatDateShort = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '未知';
    try {
      return format(new Date(timestamp), 'yyyy-MM-dd');
    } catch {
      return '未知';
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const reviewTimes = word.reviewTimes || [];
  const sentences = word.sentences || [];
  const notes = word.notes || {};

  return (
    <Modal show={show} onClose={onClose} title="单词详情" size="lg">
      <div className="space-y-6">
        {/* 基础信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            基础信息
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">单词</div>
              <div className="text-base text-gray-900 font-semibold">{word.word}</div>
            </div>
            {word.originalWord && word.originalWord !== word.word && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">原始输入</div>
                <div className="text-base text-gray-900">{word.originalWord}</div>
              </div>
            )}
            {word.phonetic && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">音标</div>
                <div className="text-base text-gray-900">{word.phonetic}</div>
              </div>
            )}
            {word.root && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">词根</div>
                <div className="text-base text-gray-900">{word.root}</div>
              </div>
            )}
            {word.rootMeaning && (
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-500 mb-1">词根含义</div>
                <div className="text-base text-gray-900">{word.rootMeaning}</div>
              </div>
            )}
          </div>
        </div>

        {/* 来源信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            来源信息
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">来源站点</div>
              <div className="text-base text-gray-900 break-words">
                {word.url ? (
                  <a
                    href={word.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {getDomainFromUrl(word.url)}
                  </a>
                ) : (
                  '未知'
                )}
              </div>
            </div>
            {word.title && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">页面标题</div>
                <div className="text-base text-gray-900 break-words">{word.title}</div>
              </div>
            )}
            {word.url && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">完整 URL</div>
                <div className="text-sm text-gray-600 break-all">
                  <a
                    href={word.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {word.url}
                  </a>
                </div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">添加时间</div>
              <div className="text-base text-gray-900">
                {formatDate(word.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* 学习统计 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            学习统计
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">例句数量</div>
              <div className="text-base text-gray-900 font-semibold">{sentences.length} 条</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">解析数量</div>
              <div className="text-base text-gray-900 font-semibold">
                {Object.keys(notes).length} 条
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">复习次数</div>
              <div className="text-base text-gray-900 font-semibold">{reviewTimes.length} 次</div>
            </div>
            {word.relatedWords && word.relatedWords.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">词族数量</div>
                <div className="text-base text-gray-900 font-semibold">
                  {word.relatedWords.length} 个
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 复习记录 */}
        {reviewTimes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              复习记录
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reviewTimes
                .sort((a, b) => b - a)
                .map((timestamp, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">
                      第 {reviewTimes.length - index} 次复习
                    </span>
                    <span className="text-sm text-gray-600">{formatDate(timestamp)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 词族 */}
        {word.relatedWords && word.relatedWords.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              词族
            </h3>
            <div className="flex flex-wrap gap-2">
              {word.relatedWords.map((relatedWord, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                >
                  {relatedWord}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 关闭按钮 */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    </Modal>
  );
}

