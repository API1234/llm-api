import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import {
  getWordsByAccountId,
  getWordByAccountIdAndWord,
  createWord,
  updateWord,
  deleteWord
} from '@/lib/db';
import type { WordRequest, WordsResponse, Word } from '@/types';

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
  const word = searchParams.get('word');

  try {
    if (word) {
      // 获取单个单词
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
  const { word, data } = body;

  try {
    if (!word) {
      return NextResponse.json(
        { error: 'Missing "word" in request body' },
        { status: 400 }
      );
    }

    // 检查单词是否已存在
    const existingWord = await getWordByAccountIdAndWord(account.id, word);
    if (existingWord) {
      return NextResponse.json(
        { error: 'Word already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    const newWord = await createWord(account.id, word, data || {});
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
  const body: WordRequest = await req.json();
  const { word, data } = body;

  try {
    if (!word) {
      return NextResponse.json(
        { error: 'Missing "word" in request body' },
        { status: 400 }
      );
    }

    const updatedWord = await updateWord(account.id, word, data || {});
    if (!updatedWord) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedWord);
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
  const body: WordRequest = await req.json();
  const { word } = body;

  try {
    if (!word) {
      return NextResponse.json(
        { error: 'Missing "word" in request body' },
        { status: 400 }
      );
    }

    const deletedWord = await deleteWord(account.id, word);
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
  } catch (error) {
    console.error('Error handling request:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

