// 数据库类型定义
export interface Account {
  id: number;
  api_key: string;
  name: string | null;
  created_at: Date | string;
}

// 例句类型
export interface Example {
  sentence: string;      // 英文例句
  translation: string;   // 中文翻译
}

// 单词释义类型
export interface Meaning {
  partOfSpeech: string;  // 词性，如 "noun", "verb", "adjective"
  definitions: string[]; // 释义数组（英文定义）
  translation?: string;   // 中文翻译（多个翻译用分号分隔，如 "普遍的; 常见的"）
  examples?: Example[];  // 例句数组（每个例句包含英文和中文翻译）
}

// 单词数据模型
export interface Word {
  // 基础信息
  id: string;                    // 唯一标识符: "timestamp-randomString"
  word: string;                  // 规范化后的单词（小写、单数）
  originalWord?: string;         // 原始输入（如果不同）
  
  // 来源信息
  url: string;                   // 来源网页 URL
  title: string;                 // 来源网页标题
  createdAt: number;             // 创建时间戳（毫秒）
  
  // 单词信息（自动获取）
  phonetic?: string;             // 音标
  audioUrl?: string;             // 音频 URL（发音）
  meanings?: Meaning[];          // 释义数组 [{partOfSpeech, definitions}]
  root?: string;                 // 词根
  rootMeaning?: string;          // 词根含义
  relatedWords?: string[];       // 关联词列表
  
  // 学习内容
  sentences: string[];           // 例句数组（最多20条）
  notes?: {                      // 例句解析（Markdown）
    [sentenceKey: string]: string;
  };
  
  // 复习系统
  reviewTimes: number[];         // 复习时间戳数组
}

// 数据库中的单词表结构
export interface WordRecord {
  id: string;                    // 唯一标识符
  account_id: number;            // 账号 ID（外键）
  word: string;                  // 规范化后的单词
  original_word: string | null;  // 原始输入
  url: string;                   // 来源网页 URL
  title: string;                 // 来源网页标题
  created_at_ms: number;         // 创建时间戳（毫秒）
  phonetic: string | null;       // 音标
  audio_url: string | null;     // 音频 URL
  meanings: Meaning[] | null;     // 释义数组（JSONB）
  root: string | null;           // 词根
  root_meaning: string | null;   // 词根含义
  related_words: string[] | null; // 关联词列表（JSONB）
  sentences: string[];            // 例句数组（JSONB）
  notes: Record<string, string> | null; // 例句解析（JSONB）
  review_times: number[];         // 复习时间戳数组（JSONB）
  db_created_at: Date | string;   // 数据库创建时间
  db_updated_at: Date | string;   // 数据库更新时间
}

// API 请求/响应类型
export interface AnalyzeRequest {
  word: string;
}

export interface AnalyzeResponse {
  // 单词基本信息
  phonetic?: string;           // 音标
  audioUrl?: string;           // 音频 URL（发音）
  meanings?: Meaning[];        // 释义数组
  root?: string;               // 词根
  relatedWords?: string[];     // 关联词列表
  
  // 兼容旧字段
  lemma?: string;              // 词根形式（同 root）
  pos?: string;                // 词性（从 meanings 中提取）
  family?: string[];            // 词族（同 relatedWords）
  text?: string;                // 文本内容
  [key: string]: any;
}

export interface CreateAccountRequest {
  name?: string;
  api_key?: string;
}

export interface CreateAccountResponse {
  message: string;
  account: {
    id: number;
    name: string | null;
    api_key: string;
    created_at: Date | string;
  };
}

export interface WordRequest {
  id?: string;                    // 可选，不提供则自动生成
  word: string;                   // 必需：规范化后的单词
  originalWord?: string;         // 可选：原始输入
  url: string;                    // 必需：来源网页 URL
  title: string;                  // 必需：来源网页标题
  phonetic?: string;              // 可选：音标
  audioUrl?: string;              // 可选：音频 URL
  meanings?: Meaning[];           // 可选：释义数组
  root?: string;                  // 可选：词根
  relatedWords?: string[];        // 可选：关联词列表
  sentences: string[];            // 必需：例句数组
  notes?: {                       // 可选：例句解析
    [sentenceKey: string]: string;
  };
  reviewTimes?: number[];         // 可选：复习时间戳数组
}

export interface WordsResponse {
  words: Word[];
  count: number;
}

