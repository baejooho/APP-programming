const uploadArea      = document.getElementById('uploadArea');
const fileInput       = document.getElementById('fileInput');
const browseBtn       = document.getElementById('browseBtn');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const previewWrap     = document.getElementById('previewWrap');
const previewImg      = document.getElementById('previewImg');
const removeImgBtn    = document.getElementById('removeImgBtn');
const recognizeBtn    = document.getElementById('recognizeBtn');
const recognizeBtnText = document.getElementById('recognizeBtnText');
const spinner         = document.getElementById('spinner');
const errorBox        = document.getElementById('errorBox');
const resultSection   = document.getElementById('resultSection');
const tagsContainer   = document.getElementById('tagsContainer');
const addInput        = document.getElementById('addInput');
const addBtn          = document.getElementById('addBtn');
const nextBtn         = document.getElementById('nextBtn');

let currentFile = null;
let ingredients = [];

// ── 파일 선택 ──────────────────────────────────────────────────
browseBtn.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('click', (e) => {
  if (e.target === uploadArea) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

// ── 드래그&드롭 ───────────────────────────────────────────────
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showError('JPG, PNG, WEBP 파일만 업로드할 수 있습니다.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('파일 크기는 10MB 이하여야 합니다.');
    return;
  }
  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  uploadPlaceholder.hidden = true;
  previewWrap.hidden = false;
  recognizeBtn.disabled = false;
  hideError();
  resultSection.hidden = true;
  ingredients = [];
}

removeImgBtn.addEventListener('click', () => {
  currentFile = null;
  previewImg.src = '';
  previewWrap.hidden = true;
  uploadPlaceholder.hidden = false;
  recognizeBtn.disabled = true;
  resultSection.hidden = true;
  fileInput.value = '';
});

// ── 재료 인식 ─────────────────────────────────────────────────
recognizeBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  setLoading(true);
  hideError();

  try {
    const base64 = await toBase64(currentFile);
    const body = {
      image_base64: base64,
      mime_type: currentFile.type,
    };

    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = data.error || '오류가 발생했습니다.';
      const isRateLimit = res.status === 503 || msg.toLowerCase().includes('rate') || msg.includes('429');
      showError(isRateLimit
        ? `AI 서버가 잠시 혼잡합니다. 1~2분 후 다시 시도해주세요.\n(${msg})`
        : msg);
      return;
    }

    ingredients = data.ingredients ?? [];
    if (ingredients.length === 0) {
      showError('재료를 인식하지 못했습니다. 더 선명한 사진으로 다시 시도해보세요.');
      return;
    }
    renderTags();
    resultSection.hidden = false;
  } catch (err) {
    showError('네트워크 오류: ' + err.message);
  } finally {
    setLoading(false);
  }
});

// ── 재료 태그 ─────────────────────────────────────────────────
function renderTags() {
  tagsContainer.innerHTML = '';
  ingredients.forEach((name, i) => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `<span>${name}</span><button title="삭제">✕</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      ingredients.splice(i, 1);
      renderTags();
    });
    tagsContainer.appendChild(tag);
  });
}

// ── 재료 추가 ─────────────────────────────────────────────────
addBtn.addEventListener('click', addIngredient);
addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addIngredient(); });

function addIngredient() {
  const val = addInput.value.trim();
  if (!val) return;
  if (!ingredients.includes(val)) {
    ingredients.push(val);
    renderTags();
  }
  addInput.value = '';
}

// ── 다음 단계 (Step 2) ────────────────────────────────────────
nextBtn.addEventListener('click', () => {
  sessionStorage.setItem('fridge_ingredients', JSON.stringify(ingredients));
  window.location.href = '/recipe.html';
});

// ── 유틸 ──────────────────────────────────────────────────────
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setLoading(on) {
  recognizeBtn.disabled = on;
  recognizeBtnText.textContent = on ? '인식 중...' : '재료 인식하기';
  spinner.hidden = !on;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
}
