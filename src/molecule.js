const Jmol = window.Jmol; // 全局 JSmol

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
    alert("生成失败: " + detail); // ✅ 直接 alert 错误信息
  }

  const data = await res.json();

  if (!data.sdf || typeof data.sdf !== 'string') {
    throw new Error('后端未返回有效 SDF');
  }

  return data; // { formula, smiles, sdf, iter }
}

// --------------------------------------------------
// 渲染 SDF
// --------------------------------------------------
export function renderSDF(sdf, containerId) {
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

export async function fetchProgress() {
  const res = await fetch("http://127.0.0.1:8000/progress");
  if (!res.ok) return null;
  return await res.json();
}