// 数据库类型定义
export interface Account {
  id: number;
  api_key: string;
  name: string | null;
  created_at: Date | string;
}

export interface Word {
  id: number;
  account_id: number;
  word: string;
  data: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
}

// API 请求/响应类型
export interface AnalyzeRequest {
  word: string;
}

export interface AnalyzeResponse {
  lemma?: string;
  pos?: string;
  family?: string[];
  text?: string;
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
  word?: string;
  data?: Record<string, any>;
}

export interface WordsResponse {
  words: Word[];
  count: number;
}

