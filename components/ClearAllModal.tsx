'use client';

import { useState } from 'react';

interface ClearAllModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearAllModal({ show, onClose, onConfirm }: ClearAllModalProps) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText !== '清空') {
      return;
    }
    onConfirm();
    setConfirmText('');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">清空全部</h2>
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
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="请输入 清空 以确认"
            className="input w-full"
            autoFocus
          />
          <p className="text-sm text-gray-600 mt-2">
            为防误操作，请输入"清空"两个字后再确认。
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== '清空'}
            className="btn btn-danger"
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  );
}

