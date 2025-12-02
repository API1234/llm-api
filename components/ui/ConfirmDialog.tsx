'use client';

import { useEffect, useState } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: 'primary' | 'danger';
}

interface ConfirmDialogProps {
  options: (ConfirmOptions & { onConfirm: () => void; onCancel?: () => void }) | null;
  onClose: () => void;
}

function ConfirmDialog({ options, onClose }: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (options) {
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [options]);

  if (!options) return null;

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(() => {
      options.onConfirm();
      onClose();
    }, 200);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      options.onCancel?.();
      onClose();
    }, 200);
  };

  const confirmStyle = options.confirmButtonStyle === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <div
      className={`
        fixed inset-0 z-[9998] flex items-center justify-center
        transition-opacity duration-200
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleCancel}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* 对话框 */}
      <div
        className={`
          relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4
          transform transition-all duration-200
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {options.title}
        </h3>
        
        {/* 内容 */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {options.message}
        </p>
        
        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {options.cancelText || '取消'}
          </button>
          <button
            onClick={handleConfirm}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              ${confirmStyle}
            `}
          >
            {options.confirmText || '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmDialogContainer() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  useEffect(() => {
    // 全局 Confirm 管理器
    const showConfirm = (opts: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setResolvePromise(() => resolve);
        setOptions(opts);
      });
    };

    // 暴露到 window 对象
    (window as any).showConfirm = showConfirm;

    return () => {
      delete (window as any).showConfirm;
    };
  }, []);

  const handleClose = (confirmed: boolean) => {
    if (resolvePromise) {
      resolvePromise(confirmed);
      setResolvePromise(null);
    }
    setOptions(null);
  };

  if (!options) return null;

  return (
    <ConfirmDialog
      options={{
        ...options,
        onConfirm: () => handleClose(true),
        onCancel: () => handleClose(false),
      }}
      onClose={() => handleClose(false)}
    />
  );
}
