import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .env 파일 직접 파싱
const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const apiKey = envContent.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error('❌ API 키를 찾을 수 없습니다.');
  process.exit(1);
}

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(model, messages) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}

// ── 1. 텍스트 생성 테스트 ──────────────────────────────────────
async function testText() {
  console.log('\n[1] 텍스트 생성 테스트 (qwen/qwen3-plus:free)');
  console.log('─'.repeat(50));
  const data = await callOpenRouter('qwen/qwen3.6-plus:free', [
    { role: 'user', content: '안녕하세요! 자기소개를 한 문장으로 해주세요.' }
  ]);
  const reply = data.choices?.[0]?.message?.content ?? '(응답 없음)';
  console.log('응답:', reply);
  console.log('모델:', data.model);
  console.log('토큰 사용:', JSON.stringify(data.usage));
}

// ── 2. 이미지 인식 테스트 ─────────────────────────────────────
async function testImage() {
  console.log('\n[2] 이미지 인식 테스트 (google/gemma-3-27b-it:free)');
  console.log('─'.repeat(50));

  // 공개 이미지 URL 사용 (OpenRouter Vision 지원 형식)
  const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png';

  const data = await callOpenRouter('google/gemma-3-27b-it:free', [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: '이 이미지에 무엇이 있는지 한국어로 설명해주세요.' }
      ]
    }
  ]);
  const reply = data.choices?.[0]?.message?.content ?? '(응답 없음)';
  console.log('응답:', reply);
  console.log('모델:', data.model);
  console.log('토큰 사용:', JSON.stringify(data.usage));
}

// ── 실행 ──────────────────────────────────────────────────────
(async () => {
  console.log('OpenRouter API 테스트 시작...');
  try {
    await testText();
  } catch (e) {
    console.error('텍스트 테스트 실패:', e.message);
  }
  try {
    await testImage();
  } catch (e) {
    console.error('이미지 테스트 실패:', e.message);
  }
  console.log('\n테스트 완료.');
})();
