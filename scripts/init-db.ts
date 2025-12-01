/**
 * 本地数据库初始化脚本
 * 使用方法: npx tsx scripts/init-db.ts
 * 或: ts-node scripts/init-db.ts
 */

import { initDatabase } from '../lib/db';

async function main() {
  try {
    console.log('开始初始化数据库...');
    await initDatabase();
    console.log('✅ 数据库初始化成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

main();

