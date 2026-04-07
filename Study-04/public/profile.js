// ── 초기화 ────────────────────────────────────────────────────
let currentMemoId = null;

const nicknameEl      = document.getElementById('nicknameEl');
const avatarEl        = document.getElementById('avatarEl');
const recipeCountEl   = document.getElementById('recipeCountEl');
const topIngredientsEl= document.getElementById('topIngredientsEl');
const searchInput     = document.getElementById('searchInput');
const recipeList      = document.getElementById('recipeList');
const emptyState      = document.getElementById('emptyState');

// 모달 요소
const detailModal  = document.getElementById('detailModal');
const detailTitle  = document.getElementById('detailTitle');
const detailBody   = document.getElementById('detailBody');
const detailClose  = document.getElementById('detailClose');
const memoModal    = document.getElementById('memoModal');
const memoText     = document.getElementById('memoText');
const memoClose    = document.getElementById('memoClose');
const memoSaveBtn  = document.getElementById('memoSaveBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');
const setupModal   = document.getElementById('setupModal');
const setupSaveBtn = document.getElementById('setupSaveBtn');
const settingsBtn  = document.getElementById('settingsBtn');

// ── 프로필 로드 & 최초 설정 ───────────────────────────────────
function initProfile() {
  const profile = FridgeStorage.getProfile();
  if (!profile) {
    setupModal.hidden = false;
    return;
  }
  renderHeader(profile);
  renderList(FridgeStorage.getRecipes());
}

function renderHeader(profile) {
  nicknameEl.textContent = `${profile.nickname}님의 마이 레시피`;
  const recipes = FridgeStorage.getRecipes();
  recipeCountEl.textContent = `저장된 레시피 ${recipes.length}개`;
  const top = FridgeStorage.getTopIngredients(3);
  topIngredientsEl.textContent = top.length ? `자주 쓰는 재료: ${top.join(', ')}` : '';
}

// ── 레시피 목록 렌더링 ────────────────────────────────────────
function renderList(recipes) {
  recipeList.innerHTML = '';
  if (!recipes.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  recipes.forEach(item => recipeList.appendChild(buildRow(item)));
}

function buildRow(item) {
  const { recipe, source_ingredients = [], saved_at, memo = '', id } = item;
  const date = new Date(saved_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const diffClass = { '쉬움': 'easy', '보통': 'medium', '어려움': 'hard' }[recipe.difficulty] || 'easy';

  const row = document.createElement('div');
  row.className = 'recipe-row';
  row.innerHTML = `
    <div class="row-main">
      <div class="row-title">${recipe.name}</div>
      <div class="row-meta">
        <span class="badge ${diffClass}">${recipe.difficulty || '쉬움'}</span>
        <span class="badge">⏱ ${recipe.cooking_time}분</span>
        <span class="badge">👥 ${recipe.servings}명</span>
        <span class="row-date">${date}</span>
      </div>
      <div class="row-ingredients">${source_ingredients.join(', ')}</div>
      ${memo ? `<div class="row-memo">${memo}</div>` : ''}
    </div>
    <div class="row-actions">
      <button class="btn btn-secondary view-btn">보기</button>
      <button class="btn btn-secondary memo-btn">${memo ? '메모 수정' : '메모'}</button>
      <button class="btn btn-danger del-btn">삭제</button>
    </div>
  `;

  row.querySelector('.view-btn').addEventListener('click', () => openDetail(recipe));
  row.querySelector('.memo-btn').addEventListener('click', () => openMemo(id, memo));
  row.querySelector('.del-btn').addEventListener('click', () => deleteItem(id, row));
  return row;
}

// ── 삭제 ─────────────────────────────────────────────────────
function deleteItem(id, rowEl) {
  if (!confirm('이 레시피를 삭제할까요?')) return;
  FridgeStorage.deleteRecipe(id);
  rowEl.remove();
  const profile = FridgeStorage.getProfile();
  if (profile) renderHeader(profile);
  if (!recipeList.children.length) emptyState.hidden = false;
}

// ── 검색 ─────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  renderList(FridgeStorage.searchRecipes(searchInput.value.trim()));
});

// ── 조리법 모달 ───────────────────────────────────────────────
function openDetail(recipe) {
  detailTitle.textContent = recipe.name;
  detailBody.innerHTML = `
    <p class="detail-desc">${recipe.description || ''}</p>
    ${(recipe.steps || []).map((step, i) => {
      const text = step.replace(/^\d+\.\s*/, '');
      return `<div class="step-item">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${text}</div>
      </div>`;
    }).join('')}
    ${recipe.missing_ingredients?.length
      ? `<div class="missing-box">없으면 아쉬운 재료: ${recipe.missing_ingredients.join(', ')}</div>`
      : ''}
  `;
  detailModal.hidden = false;
}
detailClose.addEventListener('click', () => detailModal.hidden = true);
detailModal.addEventListener('click', e => { if (e.target === detailModal) detailModal.hidden = true; });

// ── 메모 모달 ─────────────────────────────────────────────────
function openMemo(id, existing) {
  currentMemoId = id;
  memoText.value = existing || '';
  memoModal.hidden = false;
  memoText.focus();
}
memoSaveBtn.addEventListener('click', () => {
  if (!currentMemoId) return;
  FridgeStorage.updateMemo(currentMemoId, memoText.value.trim());
  memoModal.hidden = true;
  renderList(FridgeStorage.searchRecipes(searchInput.value.trim()));
});
memoClose.addEventListener('click', () => memoModal.hidden = true);
memoModal.addEventListener('click', e => { if (e.target === memoModal) memoModal.hidden = true; });

// ── 설정 모달 ─────────────────────────────────────────────────
settingsBtn.addEventListener('click', () => {
  const profile = FridgeStorage.getProfile();
  if (!profile) return;
  document.getElementById('settingsNickname').value = profile.nickname;
  document.getElementById('settingsServings').value = profile.preferences.servings;
  document.getElementById('settingsTime').value = profile.preferences.max_cooking_time;
  document.querySelectorAll('.diet-opt').forEach(cb => {
    cb.checked = profile.preferences.diet.includes(cb.value);
  });
  settingsModal.hidden = false;
});
settingsSaveBtn.addEventListener('click', () => {
  const nickname = document.getElementById('settingsNickname').value.trim();
  if (!nickname) return;
  const servings = Number(document.getElementById('settingsServings').value);
  const max_cooking_time = Number(document.getElementById('settingsTime').value);
  const diet = [...document.querySelectorAll('.diet-opt:checked')].map(cb => cb.value);
  const profile = FridgeStorage.getProfile();
  profile.nickname = nickname;
  profile.preferences = { servings, max_cooking_time, diet };
  FridgeStorage.saveProfile(profile);
  settingsModal.hidden = true;
  renderHeader(profile);
});
settingsClose.addEventListener('click', () => settingsModal.hidden = true);
settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.hidden = true; });

// ── 최초 설정 모달 ────────────────────────────────────────────
setupSaveBtn.addEventListener('click', () => {
  const nickname = document.getElementById('setupNickname').value.trim();
  if (!nickname) { alert('닉네임을 입력해주세요.'); return; }
  const profile = FridgeStorage.createProfile(nickname);
  setupModal.hidden = true;
  renderHeader(profile);
  renderList(FridgeStorage.getRecipes());
});

// ── 시작 ─────────────────────────────────────────────────────
initProfile();
