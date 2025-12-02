/**
 * 添加 root_meaning 字段到 words 表
 * 使用方法: npx tsx scripts/add-root-meaning-column.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

// 手动加载 .env.local 文件
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envFile = readFileSync(envPath, 'utf-8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  无法读取 .env.local 文件，使用系统环境变量');
  }
}

loadEnvFile();

async function main() {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.PRISMA_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ 错误: 未找到数据库连接字符串！');
    console.error('请设置 DATABASE_URL, POSTGRES_URL 或 PRISMA_DATABASE_URL 环境变量');
    process.exit(1);
  }

  try {
    const sql = neon(connectionString);
    
    console.log('检查 root_meaning 字段...');
    
    // 检查字段是否存在
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'words' AND column_name = 'root_meaning';
    `;
    
    if (columnExists.length > 0) {
      console.log('✅ root_meaning 字段已存在，无需添加');
      process.exit(0);
    }
    
    console.log('添加 root_meaning 字段...');
    await sql`
      ALTER TABLE words ADD COLUMN root_meaning TEXT;
    `;
    
    console.log('✅ 成功添加 root_meaning 字段！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error);
    process.exit(1);
  }
}

main();

