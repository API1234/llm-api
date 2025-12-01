/**
 * API 测试脚本
 * 使用方法: node scripts/test-api.js
 * 
 * 确保：
 * 1. 已运行 npm run dev 启动服务器
 * 2. 已运行 npm run init-db 初始化数据库
 */

const API_BASE = 'http://localhost:3000';

async function testAPI() {
  console.log('🚀 开始测试 API...\n');

  try {
    // 1. 创建账号
    console.log('1️⃣ 创建账号...');
    const createAccountRes = await fetch(`${API_BASE}/api/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '测试账号' })
    });
    const accountData = await createAccountRes.json();
    const API_KEY = accountData.account.api_key;
    console.log('✅ 账号创建成功');
    console.log('   API Key:', API_KEY);
    console.log('   Account ID:', accountData.account.id);
    console.log('');

    // 2. 分析单词
    console.log('2️⃣ 分析单词 "hello"...');
    const analyzeRes = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'hello' })
    });
    const analysis = await analyzeRes.json();
    console.log('✅ 单词分析成功');
    console.log('   结果:', JSON.stringify(analysis, null, 2));
    console.log('');

    // 3. 保存单词
    console.log('3️⃣ 保存单词...');
    const saveWordRes = await fetch(`${API_BASE}/api/words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        word: 'hello',
        data: analysis
      })
    });
    const savedWord = await saveWordRes.json();
    console.log('✅ 单词保存成功');
    console.log('   Word ID:', savedWord.id);
    console.log('');

    // 4. 获取所有单词
    console.log('4️⃣ 获取所有单词...');
    const wordsRes = await fetch(`${API_BASE}/api/words`, {
      headers: { 'X-API-Key': API_KEY }
    });
    const wordsData = await wordsRes.json();
    console.log('✅ 获取成功');
    console.log('   单词数量:', wordsData.count);
    console.log('   单词列表:', wordsData.words.map(w => w.word).join(', '));
    console.log('');

    // 5. 获取单个单词
    console.log('5️⃣ 获取单个单词 "hello"...');
    const wordRes = await fetch(`${API_BASE}/api/words?word=hello`, {
      headers: { 'X-API-Key': API_KEY }
    });
    const wordData = await wordRes.json();
    console.log('✅ 获取成功');
    console.log('   单词:', wordData.word);
    console.log('   数据:', JSON.stringify(wordData.data, null, 2));
    console.log('');

    // 6. 更新单词
    console.log('6️⃣ 更新单词...');
    const updateRes = await fetch(`${API_BASE}/api/words`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        word: 'hello',
        data: {
          ...analysis,
          updated: true,
          timestamp: new Date().toISOString()
        }
      })
    });
    const updatedWord = await updateRes.json();
    console.log('✅ 更新成功');
    console.log('   更新时间:', updatedWord.updated_at);
    console.log('');

    // 7. 删除单词
    console.log('7️⃣ 删除单词...');
    const deleteRes = await fetch(`${API_BASE}/api/words`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ word: 'hello' })
    });
    const deleteData = await deleteRes.json();
    console.log('✅ 删除成功');
    console.log('   消息:', deleteData.message);
    console.log('');

    console.log('🎉 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.cause) {
      console.error('   原因:', error.cause);
    }
    process.exit(1);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'test' })
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('检查服务器连接...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ 无法连接到服务器！');
    console.error('   请确保已运行: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ 服务器连接正常\n');
  await testAPI();
}

main();

