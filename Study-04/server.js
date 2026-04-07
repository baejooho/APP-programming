const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// .env에서 API 키 로드
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const API_KEY = envContent.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
const GOOGLE_KEY = envContent.match(/GOOGLE_API_KEY=(.+)/)?.[1]?.trim();

if (!API_KEY) {
  console.error('❌ .env에 OPENROUTER_API_KEY가 없습니다.');
  process.exit(1);
}
if (GOOGLE_KEY) {
  console.log('✅ Google Gemini API 키 감지됨 — vision 폴백으로 사용');
} else {
  console.log('ℹ️  Google Gemini 미설정 (GOOGLE_API_KEY 없음) — OpenRouter만 사용');
}

// ── Step 1: 이미지 인식 ─────────────────────────────────────────

const VISION_MODELS = [
  'google/gemma-3-27b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];

const VISION_SYSTEM_PROMPT =
  'You are a food ingredient detector. Analyze the image and return ONLY a JSON array of ingredient names in Korean. Example: ["계란", "당근", "우유", "치즈"]. Do not include any other text.';

// OpenRouter vision 호출
async function callVisionModel(model, image_base64, mime_type) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mime_type};base64,${image_base64}` } },
            { type: 'text', text: '이 냉장고 사진에서 식재료를 모두 찾아주세요.' },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || 'OpenRouter 오류'), { code: data?.error?.code });
  return data;
}

// Google Gemini vision 호출 (폴백)
async function callGemini(image_base64, mime_type) {
  if (!GOOGLE_KEY) throw new Error('GOOGLE_API_KEY 없음');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: mime_type, data: image_base64 } },
          { text: VISION_SYSTEM_PROMPT + '\n\n이 냉장고 사진에서 식재료를 모두 찾아주세요.' },
        ],
      }],
      generationConfig: { temperature: 0.1 },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Gemini 오류');
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { text, model_used: 'google/gemini-2.0-flash' };
}

// 재료 인식 API
app.post('/api/recognize', async (req, res) => {
  const { image_base64, mime_type } = req.body;
  if (!image_base64) return res.status(400).json({ error: '이미지가 없습니다.' });

  // 1) OpenRouter 모델 순서대로 시도
  let lastError = null;
  for (const model of VISION_MODELS) {
    try {
      console.log(`[인식 시도] OpenRouter 모델: ${model}`);
      const data = await callVisionModel(model, image_base64, mime_type);
      const raw = data.choices?.[0]?.message?.content ?? '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return res.json({ ingredients: [], model_used: data.model });
      const ingredients = JSON.parse(match[0]);
      console.log(`[인식 성공] ${data.model} | 재료: ${ingredients.join(', ')}`);
      return res.json({ ingredients, model_used: data.model });
    } catch (err) {
      console.warn(`[인식 실패] ${model} | ${err.message}`);
      lastError = err;
      if (err.code !== 429 && err.code !== 502) break;
    }
  }

  // 2) OpenRouter 전부 실패 → Gemini API 시도
  if (GOOGLE_KEY) {
    try {
      console.log('[인식 시도] Google Gemini API');
      const { text, model_used } = await callGemini(image_base64, mime_type);
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return res.json({ ingredients: [], model_used });
      const ingredients = JSON.parse(match[0]);
      console.log(`[인식 성공] ${model_used} | 재료: ${ingredients.join(', ')}`);
      return res.json({ ingredients, model_used });
    } catch (err) {
      console.warn(`[인식 실패] Gemini | ${err.message}`);
      lastError = err;
    }
  }

  const msg = lastError?.message || '모든 모델에서 인식에 실패했습니다.';
  const isRateLimit = lastError?.code === 429 || msg.includes('rate') || msg.includes('Rate');
  res.status(503).json({
    error: isRateLimit
      ? 'AI 서버가 혼잡합니다. 1~2분 후 다시 시도하거나 재료를 직접 입력해주세요.'
      : msg,
  });
});

// ── Step 2: 레시피 생성 (SSE 스트리밍) ──────────────────────────

app.post('/api/recipe', async (req, res) => {
  const { ingredients, servings = 2, max_time = 30, diet = [] } = req.body;
  if (!ingredients?.length) return res.status(400).json({ error: '재료가 없습니다.' });

  const dietNote = diet.length ? `식단 제한: ${diet.join(', ')}.` : '';
  const systemPrompt = `당신은 요리 전문가입니다. 주어진 재료로 만들 수 있는 레시피 3가지를 추천해주세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "recipes": [
    {
      "name": "요리명",
      "description": "한 줄 설명",
      "cooking_time": 15,
      "servings": ${servings},
      "difficulty": "쉬움",
      "ingredients": [{"name": "재료명", "amount": "양"}],
      "steps": ["1. ...", "2. ..."],
      "missing_ingredients": ["없으면 아쉬운 재료"]
    }
  ]
}`;

  const userMessage = `재료: ${ingredients.join(', ')}
인원: ${servings}명, 최대 조리 시간: ${max_time}분 이내. ${dietNote}
위 재료로 만들 수 있는 레시피 3가지를 JSON으로 추천해주세요.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    console.log(`[레시피 생성] 재료: ${ingredients.join(', ')}`);
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-plus:free',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json();
      res.write(`data: ${JSON.stringify({ error: err?.error?.message || '오류 발생' })}\n\n`);
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) res.write(line + '\n\n');
      }
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
