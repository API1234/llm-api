'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('api_key') || '';
      setApiKey(stored);
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('api_key', apiKey);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.push('/board');
      }, 1500);
    }
  };

  const handleCreateAccount = async () => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      const data = await response.json();
      setApiKey(data.account.api_key);
    } catch (error) {
      console.error('Error creating account:', error);
      alert('创建账号失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">⚙️ 设置</h1>

          <div className="space-y-6">
            {/* API Key 设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="请输入你的 API Key"
                  className="input flex-1"
                />
                <button onClick={handleSave} className="btn btn-primary">
                  保存
                </button>
              </div>
              {saved && (
                <p className="mt-2 text-sm text-green-600">✅ 已保存！正在跳转...</p>
              )}
            </div>

            {/* 创建新账号 */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">创建新账号</h2>
              <p className="text-sm text-gray-600 mb-4">
                如果你还没有 API Key，可以创建一个新账号来获取。
              </p>
              <button onClick={handleCreateAccount} className="btn btn-secondary">
                🆕 创建新账号
              </button>
            </div>

            {/* 说明 */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h2>
              <div className="text-sm text-gray-600 space-y-2">
                <p>1. 点击"创建新账号"按钮获取 API Key</p>
                <p>2. 将 API Key 复制并粘贴到上方输入框</p>
                <p>3. 点击"保存"按钮保存设置</p>
                <p>4. 保存后会自动跳转到词汇表页面</p>
              </div>
            </div>

            {/* 返回按钮 */}
            <div className="border-t pt-6">
              <button
                onClick={() => router.push('/board')}
                className="btn btn-secondary w-full"
              >
                ← 返回词汇表
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

