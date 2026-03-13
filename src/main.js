import { fetchGenerate, renderSDF } from './molecule.js';

// --------------------------------------------------
// 主生成函数
// --------------------------------------------------
export async function generateMolecule() {
  const inputEl = document.getElementById('moleculeInput');
  const typeEl = document.getElementById('inputType');

  const formulaEl = document.getElementById('moleculeName');
  const smilesEl = document.getElementById('moleculeSmiles');
  const iterEl = document.getElementById('Iterations');

  const input = inputEl?.value.trim();
  if (!input) {
    alert('请输入 SMILES 或化学式');
    return;
  }

  const type = typeEl?.value || 'smiles';

  // ---------- UI：生成中 ----------
  if (formulaEl) formulaEl.innerText = 'Formula: generating...';
  if (smilesEl) smilesEl.innerText = 'SMILES: generating...';
  if (iterEl) iterEl.innerText = '';
  const container = document.getElementById('viewer-canvas');

  try {
    // 调用 molecule.js（内部已 fetch + render）
    container.innerHTML = '<p>正在生成分子，请稍候...</p>';
    const data = await fetchGenerate(input, type);
    renderSDF(data.sdf, 'viewer-canvas');

    // ---------- UI：生成成功 ----------
    if (formulaEl) formulaEl.innerText = `Formula: ${data.formula}`;
    if (smilesEl) smilesEl.innerText = `SMILES: ${data.smiles}`;
    if (iterEl) iterEl.innerText = `Iterations: ${data.iter}`;

    console.log('分子生成成功:', data);
  } catch (e) {
    // molecule.js 已经负责 alert，这里只负责 UI
    console.error(e);
    if (formulaEl) formulaEl.innerText = 'No molecule loaded';
    if (smilesEl) smilesEl.innerText = '';
    if (iterEl) iterEl.innerText = '';
    container.innerHTML = '<p>生成失败，请重新输入...</p>';
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
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) generateBtn.addEventListener('click', generateMolecule);

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