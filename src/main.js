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
  const totalTrials = parseInt(totalTrialsEl?.value) || 1000000;

  // ---------- UI：生成中 ----------
  if (formulaEl) formulaEl.innerText = 'Formula: generating...';
  if (smilesEl) smilesEl.innerText = 'SMILES: generating...';
  if (iterEl) iterEl.innerText = 'Iterations: 0';
  if (progressEl) {
    progressEl.value = 0;
    progressEl.max = totalTrials;
  }

  const container = document.getElementById('viewer-canvas');
  container.innerHTML = '<p>正在生成分子，请稍候...</p>';

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

  // ---------- 调用后端生成 ----------
  try {
    const data = await fetchGenerate(input, type, totalTrials);
    renderSDF(data.sdf, 'viewer-canvas');

    // ---------- UI：生成成功 ----------
    if (formulaEl) formulaEl.innerText = `Formula: ${data.formula}`;
    if (smilesEl) smilesEl.innerText = `SMILES: ${data.smiles}`;
    if (iterEl) iterEl.innerText = `Iterations: ${data.trials}`;
    if (progressEl) progressEl.value = progressEl.max;

    console.log('分子生成成功:', data);
  } catch (e) {
    console.error(e);
    if (formulaEl) formulaEl.innerText = 'No molecule loaded';
    if (smilesEl) smilesEl.innerText = '';
    if (iterEl) iterEl.innerText = '';
    if (progressEl) progressEl.value = 0;
    container.innerHTML = '<p>生成失败，请重新输入...</p>';
  } finally {
    clearInterval(progressTimer);
  }
}

// --------------------------------------------------
// 加载示例
// --------------------------------------------------
function loadExample(exampleValue, type = 'smiles') {
  const inputEl = document.getElementById('moleculeInput');
  const typeEl = document.getElementById('inputType');

  if (inputEl) inputEl.value = exampleValue;
  if (typeEl) typeEl.value = type;

  generateMolecule().then(() => {});
}

// --------------------------------------------------
// 页面初始化
// --------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const smilesBtn = document.getElementById('SMILES');
  const randomBtn = document.getElementById('Random');

  function setMode(newMode) {
    mode = newMode;

    if (newMode === 'smiles') {
      smilesBtn.classList.add('active');
      randomBtn.classList.remove('active');
    } else {
      randomBtn.classList.add('active');
      smilesBtn.classList.remove('active');
    }

    const inputEl = document.getElementById('moleculeInput');
    if (newMode === 'smiles') {
      inputEl.placeholder = 'Enter SMILES e.g. CCO';
    } else {
      inputEl.placeholder = 'Enter formula e.g. C2H6O';
    }
  }

  smilesBtn.addEventListener('click', () => setMode('smiles'));
  randomBtn.addEventListener('click', () => setMode('formula'));

  // 默认 SMILES
  setMode('smiles');

  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) generateBtn.addEventListener('click', generateMolecule);

  // 示例按钮
  document.querySelectorAll('.examples button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-value');
      const type = btn.getAttribute('data-type') || 'smiles';
      loadExample(val, type);
    });
  });

  const inputEl = document.getElementById('moleculeInput');
  if (inputEl) {
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') generateMolecule().then(() => {});
    });
  }
});

// 页面刷新时请求停止后端
window.addEventListener('beforeunload', async () => {
  try {
    await fetch('http://127.0.0.1:8000/stop', { method: 'POST' });
  } catch (err) {
    console.warn('Stop request failed', err);
  }
});