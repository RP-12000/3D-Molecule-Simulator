// molecule.js
// 支持浏览器渲染和 Node.js fetch 测试

// --------------------------------------------------
// 判断环境
// --------------------------------------------------
const isBrowser = typeof window !== 'undefined';
const Jmol = isBrowser ? window.Jmol : null;

// --------------------------------------------------
// 调用后端 /generate
// --------------------------------------------------
export async function fetchGenerate(input, type = 'smiles') {
  const url = 'http://127.0.0.1:8000/generate';
  const body = type === 'smiles' ? { smiles: input } : { formula: input };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch {
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error('生成失败: ' + detail);
  }

  const data = await res.json();

  if (!data.sdf || typeof data.sdf !== 'string' || data.sdf.trim() === '') {
    throw new Error('后端未返回有效 SDF');
  }

  return data; // { formula, smiles, sdf, iter, message }
}

// --------------------------------------------------
// 渲染 SDF（仅浏览器可用）
// --------------------------------------------------
export function renderSDF(sdf, containerId) {
  if (!isBrowser) {
    console.warn('renderSDF 只能在浏览器中调用');
    return;
  }

  if (!Jmol) {
    console.error('Jmol 未加载');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = Jmol.getAppletHtml('jmolApplet', {
    width: '100%',
    height: '100%',
    use: 'HTML5',
    j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s',
    script: `
      set multipleBondSpacing 0.25;
      load inline "${sdf.replace(/"/g, '\\"')}";
      select all;
      spacefill 30%;
      wireframe 0.10;
      color cpk;
    `,
  });
}

// --------------------------------------------------
// 获取生成进度
// --------------------------------------------------
export async function fetchProgress() {
  try {
    const res = await fetch('http://127.0.0.1:8000/progress');
    if (!res.ok) return null;
    return await res.json(); // { verdict, percentage }
  } catch (e) {
    console.error('fetchProgress failed', e);
    return null;
  }
}
