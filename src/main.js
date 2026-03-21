import { fetchProgress, fetchGenerate, renderSDF } from './molecule.js';

let mode = 'smiles';
let progressTimer = null;

/**
 * AI 转换逻辑：通过 OpenAI 将化学式转为 SMILES
 * 类比 Java: private String getSmilesFromAI(String formula)
 */
async function getSmilesFromAI(formula) {
  // 1. 在这里填入你的 API Key
  const API_KEY = 'sk-ebefa89a1fb34be796de1822741b0d97';

  // 2. 接口地址
  // 如果是 OpenAI: https://api.openai.com/v1/chat/completions
  // 如果是 DeepSeek: https://api.deepseek.com/chat/completions
  const API_URL = 'https://api.deepseek.com/chat/completions';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        // 如果是 DeepSeek，这里改用 "deepseek-chat"
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a precise chemical database assistant. You MUST provide the exact canonical SMILES from PubChem.'
          },
          {
            role: 'user',
            content: `What is the canonical SMILES for "${formula}"? Return ONLY the string (e.g., C(C1C(C(C(C(O1)O)O)O)O)O for glucose). No explanation.`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API 返回错误:', errorData);
      return null;
    }

    const data = await response.json();
    // 就像 Java 里的 data.getChoices().get(0).getMessage().getContent()
    const result = data.choices[0].message.content.trim();

    // 过滤掉 AI 可能返回的多余引号
    return result.replace(/`/g, '').replace(/"/g, '');
  } catch (error) {
    console.error('网络请求失败:', error);
    return null;
  }
}

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
  const viewerCanvas = document.getElementById('viewer-canvas');

  let userInput = inputEl?.value.trim();
  if (!userInput) {
    alert('请输入 SMILES 或化学式');
    return;
  }

  // --- 步骤 1: AI 预处理 ---
  let finalInput = userInput;
  let requestType = mode;

  if (mode === 'ai') {
    if (formulaEl) formulaEl.innerText = 'AI is converting formula...';
    const aiSmiles = await getSmilesFromAI(userInput);

    if (aiSmiles) {
      finalInput = aiSmiles;
      requestType = 'smiles'; // 转换成功后，按 SMILES 模式请求后端
      if (smilesEl) smilesEl.innerText = `AI suggested SMILES: ${aiSmiles}`;
    } else {
      alert('AI 转换失败，请检查网络或 API Key');
      if (formulaEl) formulaEl.innerText = 'AI Error';
      return;
    }
  }

  // --- 步骤 2: 参数准备 ---
  const totalTrials =
    requestType === 'smiles' ? 1 : parseInt(totalTrialsEl?.value) || 1000000;



  // UI 初始化
  if (formulaEl) formulaEl.innerText = 'Formula: generating...';

  if (iterEl) iterEl.innerText = 'Iterations: 0';
  if (progressEl) {
    progressEl.value = 0;
    progressEl.max = totalTrials;
  }
  if (viewerCanvas) viewerCanvas.classList.add('loading');

  // ---------- 启动轮询进度 ----------
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(async () => {
    try {
      const p = await fetchProgress();
      if (p.verdict !== "done"){
        if (iterEl)
          iterEl.innerText = p.verdict;
        if (progressEl) progressEl.value = p.percentage;
      }
    } catch (e) {
      console.error('progress fetch failed', e);
    }
  }, 50);

  // ---------- 调用后端 ----------
  try {
    const data = await fetchGenerate(finalInput, requestType);

    renderSDF(data.sdf, 'viewer-canvas');

    if (formulaEl) formulaEl.innerText = `Formula: ${data.formula}`;
    if (smilesEl && mode !== 'ai')
      smilesEl.innerText = `SMILES: ${data.smiles}`;
    if (iterEl) iterEl.innerText = `Iterations: ${data.iter}`;
    if (progressEl) progressEl.value = progressEl.max;
    if(data.message !== "success") alert(data.message);
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
    const aiBtn = document.getElementById('AIConvert');
    const inputEl = document.getElementById('moleculeInput');

  const inputLabel = document.getElementById('inputLabel');
  const examplesContainer = document.querySelector('.examples');

    window.setMode = function setMode(newMode) {
    mode = newMode;

    smilesBtn.classList.toggle('active', newMode === 'smiles');
    randomBtn.classList.toggle('active', newMode === 'formula');
    aiBtn.classList.toggle('active', newMode === 'ai');

    const inputEl = document.getElementById('moleculeInput');
    const trialsEl = document.getElementById('totalTrials');

    const smilesExamples = document.getElementById('examples-smiles');
    const formulaExamples = document.getElementById('examples-formula');
    const aiExamples = document.getElementById('examples-ai');

    // --- 2. 根据模式调整 UI 细节 ---
    if (newMode === 'smiles') {
      // SMILES 模式
      inputLabel.innerText = 'Enter SMILES string:';
      inputEl.placeholder = 'Enter SMILES e.g. CCO';

      trialsEl.disabled = true;
      trialsEl.classList.add('disabled');

      smilesExamples.style.display = 'flex';
      formulaExamples.style.display = 'none';
      aiExamples.style.display = 'none';
      examplesContainer.style.display = 'block'; // 确保显示示例区

      // 移除可能存在的 AI 提示
      const aiNote = document.getElementById('ai-note');
      if (aiNote) aiNote.remove();
    } else if (newMode === 'formula') {
      // Random 模式 (即 formula)
      inputLabel.innerText = 'Enter chemical formula:'; // 优化点 2
      inputEl.placeholder = 'Enter formula e.g. C2H6O';

      trialsEl.disabled = false;
      trialsEl.classList.remove('disabled');

      smilesExamples.style.display = 'none';
      formulaExamples.style.display = 'flex';
      aiExamples.style.display = 'none';
      examplesContainer.style.display = 'block';

      const aiNote = document.getElementById('ai-note');
      if (aiNote) aiNote.remove();
    } else if (newMode === 'ai') {
      // AI Magic 模式
      inputLabel.innerText = 'Enter name or formula:';
      inputEl.placeholder = 'Enter name or formula e.g. Water or H2O';

      // 优化点 1: 禁用 Trials 框 (类似 SMILES)
      trialsEl.disabled = true;
      trialsEl.classList.add('disabled');

      // 优化点 3: 隐藏示例，显示警告信息
      smilesExamples.style.display = 'none';
      formulaExamples.style.display = 'none';
      aiExamples.style.display = 'flex';

      // 如果还没加过提示文字，就加一个
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

  // 绑定事件
  smilesBtn.addEventListener('click', () => window.setMode('smiles'));
  randomBtn.addEventListener('click', () => window.setMode('formula'));
  aiBtn.addEventListener('click', () => window.setMode('ai'));
  setMode('smiles');

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

// 页面刷新时停止后端
window.addEventListener('beforeunload', async () => {
  try {
    await fetch('http://127.0.0.1:8000/stop', { method: 'POST' });
  } catch {}
});