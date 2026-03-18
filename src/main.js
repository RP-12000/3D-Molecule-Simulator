import { fetchProgress, fetchGenerate, renderSDF } from './molecule.js';

let mode = 'smiles';
let progressTimer = null;

// --------------------------------------------------
// 主生成函数
// --------------------------------------------------
export async function generateMolecule() {
  const inputEl = document.getElementById('moleculeInput');
  const formulaEl = document.getElementById('moleculeName');
  const smilesEl = document.getElementById('moleculeSmiles');
  const iterEl = document.getElementById('Iterations');
  const progressEl = document.getElementById('iterationProgress');
  const totalTrialsEl = document.getElementById('totalTrials');

  const input = inputEl?.value.trim();
  if (!input) {
    alert('请输入 SMILES 或化学式');
    return;
  }

  const type = mode;

  // SMILES 模式下 trials 强制为 1
  const totalTrials =
    mode === 'smiles'
      ? 1
      : parseInt(totalTrialsEl?.value) || 1_000_000;

  // ---------- UI：生成中 ----------
  if (formulaEl) formulaEl.innerText = 'Formula: generating...';
  if (smilesEl) smilesEl.innerText = 'SMILES: generating...';
  if (iterEl) iterEl.innerText = 'Iterations: 0';
  if (progressEl) {
    progressEl.value = 0;
    progressEl.max = totalTrials;
  }

  // ❗ 不再 innerHTML 覆盖 viewer-canvas
  const viewerCanvas = document.getElementById('viewer-canvas');
  if (viewerCanvas) {
    viewerCanvas.classList.add('loading');
  }

  // ---------- 启动轮询进度 ----------
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(async () => {
    try {
      const p = await fetchProgress();
      if (!p) return;

      const current = p.trials ?? 0;
      if (iterEl) iterEl.innerText = `Iterations: ${current}`;
      if (progressEl) progressEl.value = Math.min(current, totalTrials);
    } catch (e) {
      console.error('progress fetch failed', e);
    }
  }, 50);

  // ---------- 调用后端 ----------
  try {
    const data = await fetchGenerate(input, type, totalTrials);

    renderSDF(data.sdf, 'viewer-canvas');

    if (formulaEl) formulaEl.innerText = `Formula: ${data.formula}`;
    if (smilesEl) smilesEl.innerText = `SMILES: ${data.smiles}`;
    if (iterEl) iterEl.innerText = `Iterations: ${data.iter}`;

    if (progressEl) progressEl.value = progressEl.max;
  } catch (e) {
    console.error(e);
    if (formulaEl) formulaEl.innerText = 'No molecule loaded';
    if (smilesEl) smilesEl.innerText = '';
    if (iterEl) iterEl.innerText = '';
    if (progressEl) progressEl.value = 0;
  } finally {
    clearInterval(progressTimer);
    if (viewerCanvas) viewerCanvas.classList.remove('loading');
  }
}

// --------------------------------------------------
// 示例加载
// --------------------------------------------------
function loadExample(exampleValue, type = 'smiles') {
  const inputEl = document.getElementById('moleculeInput');
  if (inputEl) inputEl.value = exampleValue;

  setMode(type);
  generateMolecule();
}

// --------------------------------------------------
// 页面初始化
// --------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const smilesBtn = document.getElementById('SMILES');
  const randomBtn = document.getElementById('Random');
  const inputEl = document.getElementById('moleculeInput');

  window.setMode = function setMode(newMode) {
    mode = newMode;

    smilesBtn.classList.toggle('active', newMode === 'smiles');
    randomBtn.classList.toggle('active', newMode === 'formula');

    const inputEl = document.getElementById('moleculeInput');
    const trialsEl = document.getElementById('totalTrials');

    const smilesExamples = document.getElementById('examples-smiles');
    const formulaExamples = document.getElementById('examples-formula');

    if (newMode === 'smiles') {
      inputEl.placeholder = 'Enter SMILES e.g. CCO';

      trialsEl.disabled = true;
      trialsEl.classList.add('disabled');

      // ✅ 只显示 SMILES 示例
      smilesExamples.style.display = 'flex';
      formulaExamples.style.display = 'none';
    } else {
      inputEl.placeholder = 'Enter formula e.g. C2H6O';

      trialsEl.disabled = false;
      trialsEl.classList.remove('disabled');

      // ✅ 只显示 化学式 示例
      smilesExamples.style.display = 'none';
      formulaExamples.style.display = 'flex';
    }
  };

  smilesBtn.addEventListener('click', () => setMode('smiles'));
  randomBtn.addEventListener('click', () => setMode('formula'));

  setMode('smiles');

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.addEventListener('click', generateMolecule);

  document.querySelectorAll('.examples button').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadExample(
        btn.getAttribute('data-value'),
        btn.getAttribute('data-type') || 'smiles'
      );
    });
  });

  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateMolecule();
  });
});

// 页面刷新时停止后端
window.addEventListener('beforeunload', async () => {
  try {
    await fetch('http://127.0.0.1:8000/stop', { method: 'POST' });
  } catch {}
});