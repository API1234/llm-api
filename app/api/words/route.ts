import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import {
  getWordsByAccountId,
  getWordById,
  getWordByAccountIdAndWord,
  createWord,
  updateWordById,
  updateWord,
  deleteWordById,
  deleteWord
} from '@/lib/db';
import type { WordRequest, WordsResponse, Word } from '@/types';

// 生成唯一 ID: timestamp-randomString
function generateWordId(): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}`;
}

export async function GET(req: NextRequest) {
  // 验证 API Key
  const authResult = await authenticateRequest(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { account } = authResult;
  const { searchParams } = new URL(req.url);
  const wordId = searchParams.get('id');
  const word = searchParams.get('word');

  try {
    if (wordId) {
      // 根据 ID 获取单词
      const wordData = await getWordById(account.id, wordId);
      if (!wordData) {
        return NextResponse.json(
          { error: 'Word not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(wordData);
    } else if (word) {
      // 根据 word 字段获取单词
      const wordData = await getWordByAccountIdAndWord(account.id, word);
      if (!wordData) {
        return NextResponse.json(
          { error: 'Word not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(wordData);
    } else {
      // 获取所有单词
      const words = await getWordsByAccountId(account.id);
      const response: WordsResponse = { words, count: words.length };
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Error handling request:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // 验证 API Key
  const authResult = await authenticateRequest(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { account } = authResult;
  const body: WordRequest = await req.json();

  try {
    // 验证必需字段
    if (!body.word) {
      return NextResponse.json(
        { error: 'Missing required field: "word"' },
        { status: 400 }
      );
    }
    if (!body.url) {
      return NextResponse.json(
        { error: 'Missing required field: "url"' },
        { status: 400 }
      );
    }
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: "title"' },
        { status: 400 }
      );
    }
    if (!body.sentences || !Array.isArray(body.sentences)) {
      return NextResponse.json(
        { error: 'Missing required field: "sentences" (must be an array)' },
        { status: 400 }
      );
    }

    // 检查单词是否已存在
    const existingWord = await getWordByAccountIdAndWord(account.id, body.word);
    if (existingWord) {
      return NextResponse.json(
        { error: 'Word already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    // 构建 Word 对象
    const wordData: Word = {
      id: body.id || generateWordId(),
      word: body.word,
      originalWord: body.originalWord,
      url: body.url,
      title: body.title,
      createdAt: Date.now(),
      phonetic: body.phonetic,
      audioUrl: body.audioUrl,
      meanings: body.meanings,
      root: body.root,
      rootMeaning: body.rootMeaning,
      relatedWords: body.relatedWords,
      sentences: body.sentences,
      notes: body.notes,
      reviewTimes: body.reviewTimes || []
    };

    const newWord = await createWord(account.id, wordData);
    return NextResponse.json(newWord, { status: 201 });
  } catch (error) {
    console.error('Error handling request:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // 验证 API Key
  const authResult = await authenticateRequest(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { account } = authResult;
  const body: Partial<WordRequest> & { id?: string; word?: string } = await req.json();

  try {
    if (body.id) {
      // 根据 ID 更新
      const updatedWord = await updateWordById(account.id, body.id, body as Partial<Word>);
      if (!updatedWord) {
        return NextResponse.json(
          { error: 'Word not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedWord);
    } else if (body.word) {
      // 根据 word 字段更新（向后兼容）
      const updatedWord = await updateWord(account.id, body.word, body as Partial<Word>);
      if (!updatedWord) {
        return NextResponse.json(
          { error: 'Word not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedWord);
    } else {
      return NextResponse.json(
        { error: 'Missing "id" or "word" in request body' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error handling request:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // 验证 API Key
  const authResult = await authenticateRequest(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { account } = authResult;
  const body: { id?: string; word?: string } = await req.json();

  try {
    if (body.id) {
      // 根据 ID 删除
      const deletedWord = await deleteWordById(account.id, body.id);
      if (!deletedWord) {
        return NextResponse.json(
          { error: 'Word not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        message: 'Word deleted successfully',
        word: deletedWord
      });
    } else if (body.word) {
      // 根据 word 字段删除（向后兼容）
      const deletedWord = await deleteWord(account.id, body.word);
      if (!deletedWord) {
        return NextResponse.json(
          { error: 'Word not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        message: 'Word deleted successfully',
        word: deletedWord
      });
    } else {
      return NextResponse.json(
        { error: 'Missing "id" or "word" in request body' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error handling request:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

