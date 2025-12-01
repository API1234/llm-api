import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Word Analyzer API',
  description: '一个基于大模型的英语词根与词族提取 API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

