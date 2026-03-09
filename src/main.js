import { formulaToSDF, renderSDF } from './molecule.js';

/**
 * 生成分子并渲染
 */
export function generateMolecule() {
  const formula = document.getElementById('moleculeInput').value.trim();
  if (!formula) {
    alert('Please enter a chemical formula or SMILES');
    return;
  }
  document.getElementById('moleculeName').innerText =
    'Current Molecule: ' + formula;

  const sdf = formulaToSDF(formula); // OCL.Molecule.fromSmiles
  renderSDF(sdf, 'viewer-canvas');
}

/**
 * 加载示例
 */
function loadExample(smiles) {
  document.getElementById('moleculeInput').value = smiles;
  generateMolecule();
}

/**
 * 绑定事件（DOMContentLoaded 保证 DOM 已经加载完）
 */
window.addEventListener('DOMContentLoaded', () => {
  // 绑定“Generate”按钮
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateMolecule);
  }

  // 绑定示例按钮
  document.querySelectorAll('.examples button').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadExample(btn.innerText); // 或 btn.dataset.formula
    });
  });
});
