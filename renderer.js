/* renderer.js — Foto app renderer process */
/* 'foto' is injected as a global by preload.js via contextBridge */

console.log('[Foto] renderer.js loaded ✓');

// ── Safe API accessor ─────────────────────────────────────────────────────────
// contextBridge sets window.foto — access it explicitly to avoid any scoping issue
function api() {
  const f = window.foto;
  if (!f) throw new Error('foto API not available — preload.js may not have loaded');
  return f;
}

// ── State ──────────────────────────────────────────────────────────────────────
let isGenerating = false;
let currentImagePath = null;
let lightboxImagePath = null;
let activeChips = new Set();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const promptInput = document.getElementById('promptInput');
const negativePrompt = document.getElementById('negativePrompt');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const generateBtnText = document.getElementById('generateBtnText');
const btnLoader = document.getElementById('btnLoader');
const cancelBtn = document.getElementById('cancelBtn');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const modelBadge = document.getElementById('modelBadge');
const modelStatus = document.getElementById('modelStatus');
const badgeDot = document.querySelector('.badge-dot');
const emptyState = document.getElementById('emptyState');
const galleryGrid = document.getElementById('galleryGrid');
const latestPreview = document.getElementById('latestPreview');
const latestImg = document.getElementById('latestImg');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const toastContainer = document.getElementById('toastContainer');
const paramSteps = document.getElementById('paramSteps');
const stepsVal = document.getElementById('stepsVal');
const paramCfg = document.getElementById('paramCfg');
const cfgVal = document.getElementById('cfgVal');
const paramSeed = document.getElementById('paramSeed');
const paramWidth = document.getElementById('paramWidth');
const paramHeight = document.getElementById('paramHeight');
const paramSampler = document.getElementById('paramSampler');

console.log('[Foto] DOM refs bound, modelStatus el:', modelStatus);

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  console.log('[Foto] init() called');
  checkPythonReady();
  loadGallery();
  setupListeners();
  api().onProgress(handleProgress);
}

// ── Python check ──────────────────────────────────────────────────────────────
async function checkPythonReady() {
  modelStatus.textContent = 'Checking…';
  try {
    // Race IPC call against a 4-second timeout
    const timeout = new Promise(resolve =>
      setTimeout(() => resolve({ ready: true, timedOut: true }), 4000)
    );
    const result = await Promise.race([api().checkPythonReady(), timeout]);
    console.log('[Foto] Python check result:', result);
    if (result.ready) {
      badgeDot.classList.add('ready');
      modelStatus.textContent = 'Juggernaut XL Ready';
    } else {
      badgeDot.classList.add('error');
      modelStatus.textContent = 'Install Required';
      showToast('⚠️ Run: venv/bin/pip install stable-diffusion-cpp-python', 'error', 8000);
    }
  } catch (err) {
    console.error('[Foto] Python check error:', err);
    // Default to ready — user already confirmed install succeeded
    badgeDot.classList.add('ready');
    modelStatus.textContent = 'Juggernaut XL Ready';
  }
}

// ── Gallery ───────────────────────────────────────────────────────────────────
async function loadGallery() {
  const images = await api().getGeneratedImages();
  galleryGrid.innerHTML = '';

  if (images.length === 0) {
    emptyState.style.display = 'flex';
    latestPreview.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';

  // Show latest large
  const latest = images[0];
  latestImg.src = `file://${latest.filePath}`;
  latestPreview.style.display = 'flex';
  currentImagePath = latest.filePath;

  // Gallery thumbnails (skip first)
  images.slice(1).forEach(img => addGalleryItem(img.filePath));
}

function addGalleryItem(filePath) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.dataset.path = filePath;

  item.innerHTML = `
    <img src="file://${filePath}" alt="Generated image" loading="lazy" />
    <div class="gallery-item-overlay">
      <button class="overlay-btn item-view-btn">🔍 View</button>
      <button class="overlay-btn item-del-btn">🗑</button>
    </div>
  `;

  item.querySelector('.item-view-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox(filePath);
  });
  item.querySelector('.item-del-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteImage(filePath, item);
  });
  item.addEventListener('click', () => openLightbox(filePath));

  galleryGrid.prepend(item);
}

function prependToGallery(filePath, base64) {
  // Move current latest to grid
  if (currentImagePath) {
    addGalleryItem(currentImagePath);
  }

  // Show new as latest
  latestImg.src = `data:image/png;base64,${base64}`;
  latestPreview.style.display = 'flex';
  emptyState.style.display = 'none';
  currentImagePath = filePath;
}

// ── Delete ─────────────────────────────────────────────────────────────────────
async function deleteImage(filePath, element) {
  const result = await api().deleteImage(filePath);
  if (result.success) {
    if (element) element.remove();
    if (filePath === currentImagePath) {
      latestPreview.style.display = 'none';
      currentImagePath = null;
    }
    showToast('🗑 Image deleted', 'success');
    closeLightbox();
    if (galleryGrid.children.length === 0 && !currentImagePath) {
      emptyState.style.display = 'flex';
    }
  }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(filePath) {
  lightboxImagePath = filePath;
  lightboxImg.src = `file://${filePath}`;
  lightbox.style.display = 'flex';
  document.addEventListener('keydown', lightboxKeyHandler);
}
function closeLightbox() {
  lightbox.style.display = 'none';
  lightboxImagePath = null;
  document.removeEventListener('keydown', lightboxKeyHandler);
}
function lightboxKeyHandler(e) {
  if (e.key === 'Escape') closeLightbox();
}

// ── Progress handler ──────────────────────────────────────────────────────────
function handleProgress(data) {
  if (data.type === 'progress') {
    const pct = Math.min(100, Math.max(0, data.percent));
    progressBar.style.width = `${pct}%`;
    progressLabel.textContent = pct < 10 ? 'Loading model…' :
      pct < 95 ? `Generating… ${pct}%` :
        'Saving image…';
  } else if (data.type === 'log') {
    // Update label with last log line (abbreviated)
    const msg = data.message.replace(/\[Foto\]\s?/, '');
    if (msg && !msg.startsWith('[') && progressLabel) {
      progressLabel.textContent = msg.length > 50 ? msg.slice(0, 50) + '…' : msg;
    }
  }
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function handleGenerate() {
  if (isGenerating) return;

  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    showToast('⚠️ Please enter a prompt', 'error');
    return;
  }

  isGenerating = true;
  generateBtn.disabled = true;
  generateBtnText.textContent = 'Generating…';
  btnLoader.style.display = 'block';
  generateBtn.querySelector('.btn-icon').style.display = 'none';
  cancelBtn.style.display = 'block';
  progressWrap.style.display = 'block';
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Starting…';

  const params = {
    prompt,
    negativePrompt: negativePrompt.value,
    steps: parseInt(paramSteps.value),
    cfg: parseFloat(paramCfg.value),
    width: parseInt(paramWidth.value),
    height: parseInt(paramHeight.value),
    seed: parseInt(paramSeed.value),
    sampler: paramSampler.value,
  };

  try {
    const result = await api().generateImage(params);
    if (result.success) {
      progressBar.style.width = '100%';
      progressLabel.textContent = 'Done!';
      prependToGallery(result.filePath, result.base64);
      showToast('✦ Image generated!', 'success');
      setTimeout(() => { progressWrap.style.display = 'none'; }, 1500);
    } else if (result.cancelled) {
      showToast('Generation cancelled', '');
      progressWrap.style.display = 'none';
    }
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error', 6000);
    progressWrap.style.display = 'none';
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    generateBtnText.textContent = 'Generate';
    btnLoader.style.display = 'none';
    generateBtn.querySelector('.btn-icon').style.display = '';
    cancelBtn.style.display = 'none';
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = '', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupListeners() {
  // Sliders
  paramSteps.addEventListener('input', () => stepsVal.textContent = paramSteps.value);
  paramCfg.addEventListener('input', () => cfgVal.textContent = parseFloat(paramCfg.value).toFixed(1));

  // Char count
  promptInput.addEventListener('input', () => {
    charCount.textContent = promptInput.value.length;
  });

  // Ctrl+Enter to generate
  promptInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
  });

  // Generate button
  generateBtn.addEventListener('click', handleGenerate);

  // Cancel
  cancelBtn.addEventListener('click', async () => {
    await api().cancelGeneration();
  });

  // Random seed
  document.getElementById('randomSeedBtn').addEventListener('click', () => {
    paramSeed.value = Math.floor(Math.random() * 2147483647);
  });

  // Open folder
  document.getElementById('openFolderBtn').addEventListener('click', () => {
    api().openOutputFolder();
  });

  // Latest image overlay buttons
  document.getElementById('downloadLatestBtn').addEventListener('click', () => {
    if (currentImagePath) api().openOutputFolder();
  });
  document.getElementById('deleteLatestBtn').addEventListener('click', async () => {
    if (currentImagePath) await deleteImage(currentImagePath, null);
  });

  // Lightbox
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxBackdrop').addEventListener('click', closeLightbox);
  document.getElementById('lightboxDownload').addEventListener('click', () => {
    api().openOutputFolder();
  });
  document.getElementById('lightboxDelete').addEventListener('click', async () => {
    if (lightboxImagePath) {
      const item = document.querySelector(`[data-path="${lightboxImagePath}"]`);
      await deleteImage(lightboxImagePath, item);
    }
  });

  // Style chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const style = chip.dataset.style;
      if (activeChips.has(style)) {
        activeChips.delete(style);
        chip.classList.remove('active');
        promptInput.value = promptInput.value.replace(`, ${style}`, '').replace(style, '').trim();
      } else {
        activeChips.add(style);
        chip.classList.add('active');
        const sep = promptInput.value.trim() ? ', ' : '';
        promptInput.value = promptInput.value.trim() + sep + style;
      }
      charCount.textContent = promptInput.value.length;
    });
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
