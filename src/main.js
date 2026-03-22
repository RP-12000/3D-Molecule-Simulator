import { fetchProgress, fetchGenerate, renderSDF } from './molecule.js';

let mode = 'smiles';
let progressTimer = null;

/**
 * AI 转换逻辑：通过 DeepSeek 将化学式/名称转为 SMILES
 */
async function getSmilesFromAI(formula) {
  const API_KEY = 'sk-ebefa89a1fb34be796de1822741b0d97';
  const API_URL = 'https://api.deepseek.com/chat/completions';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a precise chemical database assistant. You MUST provide the exact canonical SMILES from PubChem.',
          },
          {
            role: 'user',
            content: `What is the canonical SMILES for "${formula}"? Return ONLY the string.`,
          },
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
    return data.choices[0].message.content
      .trim()
      .replace(/`/g, '')
      .replace(/"/g, '');
  } catch (error) {
    console.error('网络请求失败:', error);
    return null;
  }
}

// ----------------------
// 主生成函数
// ----------------------
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

  let finalInput = userInput;
  let requestType = mode;

  if (mode === 'ai') {
    if (formulaEl) formulaEl.innerText = 'AI is converting formula...';
    const aiSmiles = await getSmilesFromAI(userInput);
    if (aiSmiles) {
      finalInput = aiSmiles;
      requestType = 'smiles';
      if (smilesEl) smilesEl.innerText = `AI suggested SMILES: ${aiSmiles}`;
    } else {
      alert('AI 转换失败，请检查网络或 API Key');
      if (formulaEl) formulaEl.innerText = 'AI Error';
      return;
    }
  }

  const totalTrials =
    requestType === 'smiles' ? 1 : parseInt(totalTrialsEl?.value) || 1000000;

  if (formulaEl) formulaEl.innerText = 'Formula: generating...';
  if (iterEl) iterEl.innerText = 'Iterations: 0';
  if (progressEl) {
    progressEl.value = 0;
    progressEl.max = totalTrials;
  }
  if (viewerCanvas) viewerCanvas.classList.add('loading');

  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(async () => {
    try {
      const p = await fetchProgress();
      if (p.verdict !== 'done') {
        if (iterEl) iterEl.innerText = p.verdict;
        if (progressEl) progressEl.value = p.percentage;
      }
    } catch (e) {
      console.error('progress fetch failed', e);
    }
  }, 50);

  try {
    const data = await fetchGenerate(finalInput, requestType);
    renderSDF(data.sdf, 'viewer-canvas');
    if (formulaEl) formulaEl.innerText = `Formula: ${data.formula}`;
    if (smilesEl && mode !== 'ai')
      smilesEl.innerText = `SMILES: ${data.smiles}`;
    if (iterEl) iterEl.innerText = `Iterations: ${data.iter}`;
    if (progressEl) progressEl.value = progressEl.max;
    if (data.message !== 'success') alert(data.message);
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

// ----------------------
// 示例加载
// ----------------------
function loadExample(exampleValue, type = 'smiles') {
  const inputEl = document.getElementById('moleculeInput');
  if (inputEl) inputEl.value = exampleValue;
  setMode(type);
  generateMolecule();
}

// ----------------------
// 页面初始化
// ----------------------
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

    const trialsEl = document.getElementById('totalTrials');
    const smilesExamples = document.getElementById('examples-smiles');
    const formulaExamples = document.getElementById('examples-formula');
    const aiExamples = document.getElementById('examples-ai');

    if (newMode === 'smiles') {
      inputLabel.innerText = 'Enter SMILES string:';
      inputEl.placeholder = 'Enter SMILES e.g. CCO';
      trialsEl.disabled = true;
      trialsEl.classList.add('disabled');
      smilesExamples.style.display = 'flex';
      formulaExamples.style.display = 'none';
      aiExamples.style.display = 'none';
      examplesContainer.style.display = 'block';
      const aiNote = document.getElementById('ai-note');
      if (aiNote) aiNote.remove();
    } else if (newMode === 'formula') {
      inputLabel.innerText = 'Enter chemical formula:';
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
      inputLabel.innerText = 'Enter name or formula:';
      inputEl.placeholder = 'Enter name or formula e.g. Water or H2O';
      trialsEl.disabled = true;
      trialsEl.classList.add('disabled');
      smilesExamples.style.display = 'none';
      formulaExamples.style.display = 'none';
      aiExamples.style.display = 'flex';
      if (!document.getElementById('ai-note')) {
        const note = document.createElement('p');
        note.id = 'ai-note';
        note.style.color = '#fbbf24';
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

  // ----------------------
  // 新增输入框帮助按钮 (小圆圈 ?)
  // ----------------------
  if (inputEl) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '5px';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    const helpBtn = document.createElement('button');
    helpBtn.textContent = '?';
    helpBtn.style.cssText = `
      padding: 2px 6px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid #888;
      background-color: #f0f0f0;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 1;
    `;

    // 点击 ? 弹出 AI 简介，不影响生成分子
    // 点击 ? 弹出 AI 简介，并判断分子是否存在，不影响生成分子
    // 点击 ? 显示漂亮假弹窗，不阻塞生成分子
    // 点击 ? 显示漂亮假弹窗，不阻塞生成分子
    helpBtn.addEventListener('click', async () => {
      const moleculeInput = inputEl.value.trim();

      // ---------- 空输入提示 ----------
      if (!moleculeInput) {
        alert('Please enter SMILES、chemical formulas or English names.');
        return;
      }

      // ---------- 创建或显示背景遮罩 ----------
      let overlay = document.getElementById('fake-popup-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'fake-popup-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9998';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        document.body.appendChild(overlay);
      }

      // ---------- 创建弹窗 ----------
      let fakePopup = document.getElementById('fake-popup');
      if (!fakePopup) {
        fakePopup = document.createElement('div');
        fakePopup.id = 'fake-popup';
        fakePopup.style.backgroundColor = '#fff';
        fakePopup.style.borderRadius = '10px';
        fakePopup.style.padding = '20px';
        fakePopup.style.width = '320px';
        fakePopup.style.maxWidth = '90%';
        fakePopup.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
        fakePopup.style.fontSize = '14px';
        fakePopup.style.color = '#333';
        fakePopup.style.position = 'relative';
        fakePopup.style.transform = 'translateY(-20px)';
        fakePopup.style.transition = 'transform 0.3s, opacity 0.3s';
        fakePopup.style.opacity = '0';

        const title = document.createElement('div');
        title.innerText = 'AI says';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        fakePopup.appendChild(title);

        const content = document.createElement('div');
        content.id = 'fake-popup-content';
        content.innerText = 'Loading...';
        fakePopup.appendChild(content);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Close';
        closeBtn.style.marginTop = '15px';
        closeBtn.style.padding = '5px 10px';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '5px';
        closeBtn.style.backgroundColor = '#fbbf24';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
          fakePopup.style.opacity = '0';
          fakePopup.style.transform = 'translateY(-20px)';
          overlay.style.opacity = '0';
          setTimeout(() => (overlay.style.display = 'none'), 300);
        });
        fakePopup.appendChild(closeBtn);

        overlay.appendChild(fakePopup);
      }

      // ---------- 显示弹窗 ----------
      overlay.style.display = 'flex';
      setTimeout(() => (overlay.style.opacity = '1'), 10);
      fakePopup.style.opacity = '1';
      fakePopup.style.transform = 'translateY(0)';

      // ---------- 调用 DeepSeek AI 获取分子简介 ----------
      try {
        const API_KEY = 'sk-ebefa89a1fb34be796de1822741b0d97';
        const API_URL = 'https://api.deepseek.com/chat/completions';

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content:
                  'You are a chemistry assistant that provides concise molecule summaries and checks whether molecules exist in PubChem.',
              },
              {
                role: 'user',
                content: `
Provide a short summary (structure, properties, common uses) of this molecule: "${moleculeInput}".
Also, indicate clearly whether this molecule exists in PubChem.
Return in the following format:
Existence: Exists / Does not exist
Summary: <brief summary>
Keep it concise.
`,
              },
            ],
            temperature: 0.2,
          }),
        });

        const data = await response.json();
        const summary = data.choices[0].message.content.trim();
        document.getElementById('fake-popup-content').innerText = summary;
      } catch (error) {
        console.error(error);
        document.getElementById('fake-popup-content').innerText =
          '获取分子简介失败';
      }
    });
    wrapper.appendChild(helpBtn);
  }
});
