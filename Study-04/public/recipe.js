// ── 재료 불러오기 ─────────────────────────────────────────────
let ingredients = JSON.parse(sessionStorage.getItem('fridge_ingredients') || '[]');

const ingredientList    = document.getElementById('ingredientList');
const ingredientSummary = document.getElementById('ingredientSummary');
const manualInputBox    = document.getElementById('manualInputBox');
const manualInput       = document.getElementById('manualInput');
const manualSubmitBtn   = document.getElementById('manualSubmitBtn');
const generateBtn       = document.getElementById('generateBtn');
const errorBox          = document.getElementById('errorBox');
const rawOutput         = document.getElementById('rawOutput');
const cardsGrid         = document.getElementById('cardsGrid');
const regenWrap         = document.getElementById('regenWrap');
const regenBtn          = document.getElementById('regenBtn');
const modalOverlay      = document.getElementById('modalOverlay');
const modalTitle        = document.getElementById('modalTitle');
const modalBody         = document.getElementById('modalBody');
const modalClose        = document.getElementById('modalClose');

function applyIngredients(list) {
  ingredients.length = 0;
  list.forEach(i => ingredients.push(i));
  sessionStorage.setItem('fridge_ingredients', JSON.stringify(ingredients));
  ingredientList.textContent = ingredients.join(', ');
  ingredientSummary.hidden = false;
  manualInputBox.hidden = true;
  hideError();
}

if (!ingredients.length) {
  manualInputBox.hidden = false;
  ingredientSummary.hidden = true;
} else {
  ingredientSummary.hidden = false;
  ingredientList.textContent = ingredients.join(', ');
}

// ── 프로필 기본값 적용 ────────────────────────────────────────
const profile = FridgeStorage.getProfile();
if (profile?.preferences) {
  const p = profile.preferences;
  document.getElementById('servings').value = p.servings;
  document.getElementById('maxTime').value = p.max_cooking_time;
  if (p.diet?.includes('채식')) document.getElementById('dietVeg').checked = true;
  if (p.diet?.includes('글루텐 프리')) document.getElementById('dietGluten').checked = true;
}

// 수동 입력 제출
manualSubmitBtn.addEventListener('click', () => {
  const val = manualInput.value.trim();
  if (!val) return;
  const list = val.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
  if (!list.length) return;
  applyIngredients(list);
  generateRecipes();
});
manualInput.addEventListener('keydown', e => { if (e.key === 'Enter') manualSubmitBtn.click(); });

// 빠른 선택 프리셋
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const list = btn.dataset.preset.split(',').map(s => s.trim());
    applyIngredients(list);
    generateRecipes();
  });
});

// ── 레시피 생성 ───────────────────────────────────────────────
generateBtn.addEventListener('click', generateRecipes);
regenBtn.addEventListener('click', generateRecipes);

async function generateRecipes() {
  const servings = Number(document.getElementById('servings').value);
  const maxTime  = Number(document.getElementById('maxTime').value);
  const diet     = [...document.querySelectorAll('.diet-label input:checked')].map(el => el.value);

  hideError();
  rawOutput.hidden = true;
  regenWrap.hidden = true;
  cardsGrid.innerHTML = '';
  generateBtn.disabled = true;
  generateBtn.textContent = '생성 중...';

  // 스켈레톤 3개
  for (let i = 0; i < 3; i++) {
    const sk = document.createElement('div');
    sk.className = 'card-skeleton';
    sk.innerHTML = '<div class="skeleton-pulse"></div>';
    cardsGrid.appendChild(sk);
  }

  let fullText = '';

  try {
    const res = await fetch('/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, servings, max_time: maxTime, diet }),
    });

    if (!res.ok) {
      const err = await res.json();
      showError(err.error || '오류가 발생했습니다.');
      cardsGrid.innerHTML = '';
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;

        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) { showError(parsed.error); return; }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) fullText += delta;
        } catch (_) {}
      }
    }

    renderRecipes(fullText);
  } catch (err) {
    showError('네트워크 오류: ' + err.message);
    cardsGrid.innerHTML = '';
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = '레시피 생성';
  }
}

// ── 파싱 & 렌더링 ─────────────────────────────────────────────
function renderRecipes(text) {
  cardsGrid.innerHTML = '';

  // <think>...</think> 태그 제거 (Qwen 추론 모델 대비)
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    rawOutput.textContent = text;
    rawOutput.hidden = false;
    showError('레시피 파싱에 실패했습니다. 원문을 확인하거나 다시 시도해주세요.');
    regenWrap.hidden = false;
    return;
  }

  let recipes;
  try {
    recipes = JSON.parse(match[0]).recipes;
  } catch (_) {
    rawOutput.textContent = text;
    rawOutput.hidden = false;
    showError('JSON 파싱 오류. 다시 시도해주세요.');
    regenWrap.hidden = false;
    return;
  }

  recipes.forEach(recipe => cardsGrid.appendChild(buildCard(recipe)));
  regenWrap.hidden = false;

  // Step 3 저장을 위해 마지막 레시피 목록을 sessionStorage에 보관
  sessionStorage.setItem('fridge_last_recipes', JSON.stringify(recipes));
}

function buildCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';

  const diffClass = { '쉬움': 'easy', '보통': 'medium', '어려움': 'hard' }[recipe.difficulty] || 'easy';
  const diffStar  = { '쉬움': '★', '보통': '★★', '어려움': '★★★' }[recipe.difficulty] || '★';

  // 재료 태그: 보유(녹색) vs 부족(회색)
  const ingTags = (recipe.ingredients || []).map(ing => {
    const have = ingredients.some(i => ing.name.includes(i) || i.includes(ing.name));
    return `<span class="ing-tag ${have ? 'have' : 'missing'}">${ing.name} ${ing.amount}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="card-name">${recipe.name}</div>
    <div class="card-desc">${recipe.description}</div>
    <div class="card-meta">
      <span class="badge">⏱ ${recipe.cooking_time}분</span>
      <span class="badge">👥 ${recipe.servings}명</span>
      <span class="badge ${diffClass}">${diffStar} ${recipe.difficulty}</span>
    </div>
    <div class="card-ingredients">${ingTags}</div>
    <div class="card-actions">
      <button class="btn btn-secondary view-btn">조리법 보기</button>
      <button class="btn btn-success save-btn">저장하기</button>
    </div>
  `;

  card.querySelector('.view-btn').addEventListener('click', () => openModal(recipe));
  card.querySelector('.save-btn').addEventListener('click', (e) => saveRecipe(recipe, e.target));

  return card;
}

// ── 조리법 모달 ───────────────────────────────────────────────
function openModal(recipe) {
  modalTitle.textContent = recipe.name;
  modalBody.innerHTML = (recipe.steps || []).map((step, i) => {
    const text = step.replace(/^\d+\.\s*/, '');
    return `<div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div class="step-text">${text}</div>
    </div>`;
  }).join('');
  modalOverlay.hidden = false;
}

modalClose.addEventListener('click', () => modalOverlay.hidden = true);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.hidden = true; });

// ── 저장 (Step 3 연결) ────────────────────────────────────────
function saveRecipe(recipe, btn) {
  const ok = FridgeStorage.saveRecipe({
    id: crypto.randomUUID(),
    saved_at: new Date().toISOString(),
    recipe,
    source_ingredients: [...ingredients],
    memo: '',
  });
  if (!ok) {
    btn.textContent = '이미 저장됨';
    btn.disabled = true;
    return;
  }
  btn.textContent = '저장 완료 ✓';
  btn.disabled = true;
  btn.style.background = '#68d391';
}

// ── 유틸 ──────────────────────────────────────────────────────
function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; }
function hideError()    { errorBox.hidden = true; }

// 페이지 진입 시 재료 있으면 자동 생성
if (ingredients.length) generateRecipes();
