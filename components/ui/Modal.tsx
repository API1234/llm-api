'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  closeOnBackdrop?: boolean;
}

export default function Modal({
  show,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      const body = document.body;
      const html = document.documentElement;

      // 计算滚动条宽度（避免闪动）
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // 防止背景滚动 - 使用更完善的方法
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      // 补偿滚动条宽度，避免页面闪动
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // 保存滚动位置到 data 属性，以便恢复
      body.setAttribute('data-scroll-y', scrollY.toString());

      setTimeout(() => setIsVisible(true), 10);

      return () => {
        // 恢复滚动位置
        const savedScrollY = body.getAttribute('data-scroll-y');
        body.style.position = '';
        body.style.top = '';
        body.style.width = '';
        body.style.overflow = '';
        body.style.paddingRight = '';
        body.removeAttribute('data-scroll-y');
        
        if (savedScrollY) {
          window.scrollTo(0, parseInt(savedScrollY, 10));
        }
      };
    } else {
      setIsVisible(false);
    }
  }, [show]);

  // 阻止触摸滚动穿透（移动端）
  useEffect(() => {
    if (!show) return;

    const handleTouchMove = (e: TouchEvent) => {
      // 如果触摸事件发生在 Modal 外部，阻止默认行为
      const target = e.target as HTMLElement;
      const modalContent = target.closest('[data-modal-content]');
      if (!modalContent) {
        e.preventDefault();
      }
    };

    // 使用 passive: false 以便可以 preventDefault
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [show]);

  // 处理 ESC 键
  useEffect(() => {
    if (!show) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  if (!show) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-3xl',
    fullscreen: 'max-w-[95vw] max-h-[95vh]',
  };

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className={`
        fixed inset-0 z-[9997] flex items-center justify-center p-4
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleBackdropClick}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* 对话框 */}
      <div
        data-modal-content
        className={`
          relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]}
          transform transition-all duration-300
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
          ${size === 'fullscreen' ? 'h-[95vh]' : 'max-h-[90vh]'} overflow-hidden flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              aria-label="关闭"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden px-6 py-4 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

