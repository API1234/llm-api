import { initDatabase } from '../lib/db.js';

export default async function handler(req, res) {
  // 简单的保护：只在开发环境或使用特定密钥时允许
  const secret = req.headers['x-init-secret'] || req.query.secret;
  const expectedSecret = process.env.INIT_DB_SECRET || 'dev-secret';

  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    await initDatabase();
    return res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ 
      error: 'Database initialization failed', 
      details: error.message 
    });
  }
}

