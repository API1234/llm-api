import { authenticateRequest } from '../lib/auth.js';
import {
  getWordsByAccountId,
  getWordByAccountIdAndWord,
  createWord,
  updateWord,
  deleteWord
} from '../lib/db.js';

export default async function handler(req, res) {
  // 验证 API Key
  const authResult = await authenticateRequest(req);
  if (authResult.error) {
    return res.status(401).json({ error: authResult.error });
  }

  const { account } = authResult;
  const { word, data } = req.body;

  try {
    switch (req.method) {
      case 'GET':
        // 获取所有单词或单个单词
        if (word) {
          // 获取单个单词
          const wordData = await getWordByAccountIdAndWord(account.id, word);
          if (!wordData) {
            return res.status(404).json({ error: 'Word not found' });
          }
          return res.status(200).json(wordData);
        } else {
          // 获取所有单词
          const words = await getWordsByAccountId(account.id);
          return res.status(200).json({ words, count: words.length });
        }

      case 'POST':
        // 创建单词
        if (!word) {
          return res.status(400).json({ error: 'Missing "word" in request body' });
        }

        // 检查单词是否已存在
        const existingWord = await getWordByAccountIdAndWord(account.id, word);
        if (existingWord) {
          return res.status(409).json({ error: 'Word already exists. Use PUT to update.' });
        }

        const newWord = await createWord(account.id, word, data || {});
        return res.status(201).json(newWord);

      case 'PUT':
        // 更新单词
        if (!word) {
          return res.status(400).json({ error: 'Missing "word" in request body' });
        }

        const updatedWord = await updateWord(account.id, word, data || {});
        if (!updatedWord) {
          return res.status(404).json({ error: 'Word not found' });
        }

        return res.status(200).json(updatedWord);

      case 'DELETE':
        // 删除单词
        if (!word) {
          return res.status(400).json({ error: 'Missing "word" in request body' });
        }

        const deletedWord = await deleteWord(account.id, word);
        if (!deletedWord) {
          return res.status(404).json({ error: 'Word not found' });
        }

        return res.status(200).json({ message: 'Word deleted successfully', word: deletedWord });

      default:
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

