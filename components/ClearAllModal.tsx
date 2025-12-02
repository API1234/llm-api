'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

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
    onClose();
  };

  return (
    <Modal show={show} onClose={onClose} title="清空全部" size="md">
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="请输入 清空 以确认"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            autoFocus
          />
          <p className="text-sm text-gray-600 mt-2">
            为防误操作，请输入"清空"两个字后再确认。
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== '清空'}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认清空
          </button>
        </div>
      </div>
    </Modal>
  );
}

