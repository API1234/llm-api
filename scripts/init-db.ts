/**
 * 本地数据库初始化脚本
 * 使用方法: npx tsx scripts/init-db.ts
 * 或: ts-node scripts/init-db.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initDatabase } from '../lib/db';

// 手动加载 .env.local 文件（不依赖 dotenv 包）
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
          // 移除引号
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    }
  } catch (error) {
    // .env.local 文件不存在或无法读取，使用系统环境变量
    console.warn('⚠️  无法读取 .env.local 文件，使用系统环境变量');
  }
}

// 加载环境变量
loadEnvFile();

async function main() {
  // 检查环境变量
  const dbUrl = process.env.DATABASE_URL || 
                process.env.POSTGRES_URL || 
                process.env.PRISMA_DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ 错误: 未找到数据库连接字符串！');
    console.error('');
    console.error('请设置以下环境变量之一:');
    console.error('  - DATABASE_URL');
    console.error('  - POSTGRES_URL');
    console.error('  - PRISMA_DATABASE_URL');
    console.error('');
    console.error('方式 1: 创建 .env.local 文件并设置 DATABASE_URL');
    console.error('方式 2: 直接设置环境变量: DATABASE_URL=... npx tsx scripts/init-db.ts');
    process.exit(1);
  }

  try {
    console.log('开始初始化数据库...');
    console.log('数据库连接:', dbUrl.replace(/:[^:@]+@/, ':****@')); // 隐藏密码
    await initDatabase();
    console.log('✅ 数据库初始化成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    console.error('');
    console.error('请检查:');
    console.error('  1. 数据库连接字符串是否正确');
    console.error('  2. 数据库服务是否正在运行');
    console.error('  3. 网络连接是否正常');
    process.exit(1);
  }
}

main();

