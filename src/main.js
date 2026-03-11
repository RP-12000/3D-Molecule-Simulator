import { renderFromSMILES } from './molecule.js';

/**
 * 生成分子并渲染
 */
export async function generateMolecule() {
  const formulaInput = document.getElementById('moleculeInput');
  const formula = formulaInput?.value.trim();
  if (!formula) {
    alert('请输入 SMILES 字符串');
    return;
  }

  const moleculeName = document.getElementById('moleculeName');
  if (moleculeName) {
    moleculeName.innerText = 'Current Molecule: ' + formula;
  }

  const viewerCanvas = document.getElementById('viewer-canvas');
  if (viewerCanvas) {
    viewerCanvas.innerHTML = '<p>正在生成分子，请稍候...</p>';
  }

  try {
    await renderFromSMILES(formula, 'viewer-canvas');
    console.log(`分子 ${formula} 渲染完成`);
  } catch (e) {
    console.error(e);
    if (viewerCanvas) {
      viewerCanvas.innerHTML =
        "<p style='color:red'>分子生成失败，请查看控制台</p>";
    }
    alert('分子生成失败，请检查 SMILES 是否正确或查看控制台错误。');
  }
}

/**
 * 加载示例 SMILES 并渲染
 * @param {string} smiles
 */
function loadExample(smiles) {
  const formulaInput = document.getElementById('moleculeInput');
  if (formulaInput) {
    formulaInput.value = smiles;
  }
  generateMolecule().then(() => {}); // 触发渲染
}

/**
 * 页面初始化事件绑定
 */
window.addEventListener('DOMContentLoaded', () => {
  // 生成按钮
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateMolecule);
  }

  // 示例按钮
  document.querySelectorAll('.examples button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const smiles = btn.innerText.trim();
      if (smiles) loadExample(smiles);
    });
  });

  // 可选：按 Enter 键也触发生成
  const formulaInput = document.getElementById('moleculeInput');
  if (formulaInput) {
    formulaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') generateMolecule().then(() => {});
    });
  }
});
