import {
  fetchProgress,
  fetchGenerate,
  fetchValidity,
  renderSDF
} from './molecule.js';

let mode = 'smiles';
let progressTimer = null;

async function getSmilesFromAI(input) {
  const res = await fetch('http://127.0.0.1:8000/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: input }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error('API 返回错误:', errorData);
    return null;
  }

  const data = await res.json();
  return data.verdict;
}

export async function generateMolecule() {
  try {
    await fetch('http://127.0.0.1:8000/stop', { method: 'POST' });
  } catch {}

  const inputEl = document.getElementById('moleculeInput');
  const formulaEl = document.getElementById('moleculeName');
  const smilesEl = document.getElementById('moleculeSmiles');
  const iterEl = document.getElementById('Iterations');
  const progressEl = document.getElementById('iterationProgress');
  const viewerCanvas = document.getElementById('viewer-canvas');
  const validityBtn = document.getElementById('validityBtn');
  const validityPanel = document.getElementById('validityContent');

  let userInput = inputEl?.value.trim();
  if (!userInput) {
    alert('Please enter SMILES or chemical formula');
    return;
  }

  // --- 步骤 1: AI 预处理 ---
  let finalInput = userInput;
  let requestType = mode;

  if (mode === 'ai') {
    if (formulaEl) formulaEl.innerText = 'Formula: Waiting for SMILES...';
    if (smilesEl) smilesEl.innerText = 'SMILES: AI is generating...';
    const aiSmiles = await getSmilesFromAI(userInput);

    if (aiSmiles) {
      finalInput = aiSmiles;
      requestType = 'smiles'; // 转换成功后，按 SMILES 模式请求后端
      if (smilesEl) smilesEl.innerText = `SMILES: ${aiSmiles}`;
    } else {
      alert('AI request failed, please check internet connection');
      if (formulaEl) formulaEl.innerText = 'AI Error';
      return;
    }
  }

  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(async () => {
    try {
      const p = await fetchProgress();
      if (p.verdict !== "done"){
        if (iterEl) iterEl.innerText = p.verdict;
        if (progressEl) progressEl.value = p.percentage;
      }
    } catch (e) {
      console.error('progress fetch failed', e);
    }
  }, 50);

  let iterationVerdict = 0;
  try {
    if (viewerCanvas) viewerCanvas.classList.add('loading');
    if(validityBtn) validityBtn.style.display = 'none';
    if(mode === 'smiles'){
      if (formulaEl) formulaEl.innerText = `Formula: calculating...`;
      if (smilesEl) smilesEl.innerText = `Smiles: ${userInput}`;
      if (iterEl) iterEl.innerText = ``;
    }
    else if (mode === 'formula'){
      if (formulaEl) formulaEl.innerText = `Formula: ${userInput}`;
      if (smilesEl) smilesEl.innerText = `Smiles: calculating...`;
    }
    else{
      if (formulaEl) formulaEl.innerText = `Formula: calculating...`;
      if (iterEl) iterEl.innerText = ``;
    }

    const data = await fetchGenerate(finalInput, requestType)
    renderSDF(data.sdf, 'viewer-canvas');
    if (progressTimer) clearInterval(progressTimer);

    if (formulaEl) formulaEl.innerText = `Formula: ${data.formula}`;
    if (smilesEl && mode !== 'ai')
      smilesEl.innerText = `SMILES: ${data.smiles}`;

    if (mode === 'formula' && data.smiles) {
      if(!DEBUG){
        const verdict = await fetchValidity(data.smiles);
        window._validityVerdict = verdict; // 缓存
        validityPanel.innerText = verdict;
      }
      else{
        validityPanel.innerText = "DEBUG mode: validity not fetched";
      }
      if (validityBtn) validityBtn.style.display = 'block';
    }
    iterationVerdict = data.iter;
    if(data.message !== "success") alert(data.message)
  } catch (e) {
    console.error(e);
    if (formulaEl) formulaEl.innerText = 'No molecule loaded';
    if (smilesEl) smilesEl.innerText = '';
    if (iterEl) iterEl.innerText = '';
  } finally {
    clearInterval(progressTimer);
    if (iterEl) iterEl.innerText = '';
    if (mode === 'formula') iterEl.innerText = `Total Iterations: ${iterationVerdict}`;
    if (progressEl) progressEl.value = progressEl.max;
    if (viewerCanvas) viewerCanvas.classList.remove('loading');
  }
}

function loadExample(exampleValue, type = 'smiles') {
  const inputEl = document.getElementById('moleculeInput');
  if (inputEl) inputEl.value = exampleValue;
  setMode(type);
  generateMolecule();
}

window.addEventListener('DOMContentLoaded', () => {
  const smilesBtn = document.getElementById('SMILES');
  const randomBtn = document.getElementById('Random');
  const aiBtn = document.getElementById('AIConvert');
  const inputEl = document.getElementById('moleculeInput');
  const validityBtn = document.getElementById('validityBtn');
  const validityPanel = document.getElementById('validityPanel');

  const inputLabel = document.getElementById('inputLabel');
  const examplesContainer = document.querySelector('.examples');

  window.setMode = function setMode(newMode) {
      mode = newMode;

      smilesBtn.classList.toggle('active', newMode === 'smiles');
      randomBtn.classList.toggle('active', newMode === 'formula');
      aiBtn.classList.toggle('active', newMode === 'ai');

      const inputEl = document.getElementById('moleculeInput');

      const smilesExamples = document.getElementById('examples-smiles');
      const formulaExamples = document.getElementById('examples-formula');
      const aiExamples = document.getElementById('examples-ai');

      if (newMode === 'smiles') {
        // SMILES 模式
        inputLabel.innerText = 'Enter SMILES string:';
        inputEl.placeholder = 'Enter SMILES e.g. CCO';

        smilesExamples.style.display = 'flex';
        formulaExamples.style.display = 'none';
        aiExamples.style.display = 'none';
        examplesContainer.style.display = 'block'; // 确保显示示例区

        const aiNote = document.getElementById('ai-note');
        if (aiNote) aiNote.remove();
      } else if (newMode === 'formula') {
        inputLabel.innerText = 'Enter chemical formula:'; // 优化点 2
        inputEl.placeholder = 'Enter formula e.g. C2H6O';

        smilesExamples.style.display = 'none';
        formulaExamples.style.display = 'flex';
        aiExamples.style.display = 'none';
        examplesContainer.style.display = 'block';

        const aiNote = document.getElementById('ai-note');
        if (aiNote) aiNote.remove();
      } else if (newMode === 'ai') {
        inputLabel.innerText = 'Enter name or formula:';
        inputEl.placeholder = 'Enter name or formula e.g. Water or H2O';

        smilesExamples.style.display = 'none';
        formulaExamples.style.display = 'none';
        aiExamples.style.display = 'flex';

        if (!document.getElementById('ai-note')) {
          const note = document.createElement('p');
          note.id = 'ai-note';
          note.style.color = '#fbbf24'; // 黄色警告色
          note.style.fontSize = '13px';
          note.style.fontStyle = 'italic';
          note.style.marginTop = '10px';
          note.innerText =
            'Note: AI results are for reference only and may contain inaccuracies.';
          examplesContainer.appendChild(note);
        }
      }
    };

  smilesBtn.addEventListener('click', () => window.setMode('smiles'));
  randomBtn.addEventListener('click', () => window.setMode('formula'));
  aiBtn.addEventListener('click', () => window.setMode('ai'));
  setMode('smiles');

  validityBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    validityPanel.classList.toggle('open');
  });

  validityPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    validityPanel.classList.remove('open');
  });

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.addEventListener('click', generateMolecule);

  document.querySelectorAll('.examples button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-value');
      const type = btn.getAttribute('data-type') || 'smiles';
      loadExample(val, type);
    });
  });

  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateMolecule();
  });
});

window.addEventListener('beforeunload', async () => {
  try {
    await fetch('http://127.0.0.1:8000/stop', { method: 'POST' });
  } catch {}
});

let DEBUG = false;
let changed = false;
let dHoldTimer = null;
const HOLD_TIME = 1000; // 3 秒

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'd') return;

  // 防止 keydown 自动重复多次启动定时器
  if (dHoldTimer !== null) return;

  dHoldTimer = setTimeout(() => {
    if(!changed){
      DEBUG = !DEBUG;
      console.log('DEBUG mode:', DEBUG);
      dHoldTimer = null;
      changed = true;
    }
  }, HOLD_TIME);
});

window.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() !== 'd') return;

  // 提前松开，取消进入 debug
  if (dHoldTimer !== null) {
    clearTimeout(dHoldTimer);
    dHoldTimer = null;
    changed = false;
  }
});