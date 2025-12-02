import { NextRequest, NextResponse } from 'next/server';
import type { AnalyzeRequest, AnalyzeResponse, Meaning } from '@/types';

/**
 * 使用 Free Dictionary API 获取单词信息
 * API 文档: https://dictionaryapi.dev/
 */
export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();
    const { word } = body;

    if (!word) {
      return NextResponse.json(
        { error: "Missing 'word'" },
        { status: 400 }
      );
    }

    // 规范化单词（转小写，去除空格）
    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord) {
      return NextResponse.json(
        { error: "Invalid word" },
        { status: 400 }
      );
    }

    // 调用 Free Dictionary API
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`;
    
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (fetchError) {
      console.error('Error fetching from Free Dictionary API:', fetchError);
      return NextResponse.json(
        { error: "Failed to fetch word information", details: (fetchError as Error).message },
        { status: 500 }
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Word not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Dictionary API error", details: `Status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Free Dictionary API 返回数组，取第一个结果
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "No word data found" },
        { status: 404 }
      );
    }

    const entry = data[0];

    // 提取音标和音频 URL（优先使用 phonetic，其次从 phonetics 数组获取）
    let phonetic: string | undefined;
    let audioUrl: string | undefined;
    
    if (entry.phonetic) {
      phonetic = entry.phonetic;
    }
    
    if (entry.phonetics && Array.isArray(entry.phonetics) && entry.phonetics.length > 0) {
      // 查找有音频的 phonetics（优先）
      const phoneticWithAudio = entry.phonetics.find((p: any) => p.audio && p.audio.trim());
      if (phoneticWithAudio) {
        audioUrl = phoneticWithAudio.audio;
        if (!phonetic && phoneticWithAudio.text) {
          phonetic = phoneticWithAudio.text;
        }
      }
      
      // 如果没有找到音频，查找有文本的 phonetics
      if (!phonetic) {
        const phoneticObj = entry.phonetics.find((p: any) => p.text) || entry.phonetics[0];
        phonetic = phoneticObj?.text;
        if (!audioUrl && phoneticObj?.audio) {
          audioUrl = phoneticObj.audio;
        }
      }
    }

    // 提取词性和释义
    const meanings: Meaning[] = [];
    if (entry.meanings && Array.isArray(entry.meanings)) {
      entry.meanings.forEach((meaning: any) => {
        if (meaning.partOfSpeech && meaning.definitions && Array.isArray(meaning.definitions)) {
          // 取前 5 个释义
          const definitions = meaning.definitions
            .slice(0, 5)
            .map((def: any) => def.definition)
            .filter((def: string) => def && def.trim());

          if (definitions.length > 0) {
            meanings.push({
              partOfSpeech: meaning.partOfSpeech,
              definitions,
            });
          }
        }
      });
    }

    // 提取词根（简单处理：使用单词本身作为词根，或尝试提取词干）
    // 这里可以后续优化，使用更复杂的词根提取逻辑
    const root = extractRoot(normalizedWord);

    // 提取关联词（从 meanings 中提取同义词和反义词）
    const relatedWords: string[] = [];
    if (entry.meanings && Array.isArray(entry.meanings)) {
      entry.meanings.forEach((meaning: any) => {
        if (meaning.synonyms && Array.isArray(meaning.synonyms)) {
          relatedWords.push(...meaning.synonyms.slice(0, 5));
        }
        if (meaning.antonyms && Array.isArray(meaning.antonyms)) {
          // 反义词也可以作为关联词
          relatedWords.push(...meaning.antonyms.slice(0, 3));
        }
      });
    }
    // 去重
    const uniqueRelatedWords = Array.from(new Set(relatedWords.map(w => w.toLowerCase())))
      .slice(0, 10);

    // 构建响应
    const result: AnalyzeResponse = {
      phonetic,
      audioUrl, // 音频 URL（如果可用）
      meanings: meanings.length > 0 ? meanings : undefined,
      root,
      relatedWords: uniqueRelatedWords.length > 0 ? uniqueRelatedWords : undefined,
      // 保留原有字段以兼容
      lemma: normalizedWord,
      pos: meanings.length > 0 ? meanings[0].partOfSpeech : undefined,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in analyze endpoint:', err);
    const error = err as Error;
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 简单的词根提取函数
 * 这里只是简单实现，可以后续优化
 */
function extractRoot(word: string): string {
  // 移除常见的后缀
  const suffixes = [
    'ing', 'ed', 'er', 'est', 'ly', 'tion', 'sion', 'ness', 'ment',
    'able', 'ible', 'ful', 'less', 'ous', 'ious', 'al', 'ic', 'ive'
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      return word.slice(0, -suffix.length);
    }
  }

  // 如果找不到后缀，返回单词本身（去掉可能的复数形式）
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

