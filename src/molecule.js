const Jmol = window.Jmol; // 全局 JSmol

export async function fetchSDF(smiles) {
  try {
    const res = await fetch('http://127.0.0.1:8000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smiles }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`后端请求失败: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (!data.sdf) throw new Error('后端未返回 SDF 数据');

    return data.sdf;
  } catch (e) {
    console.error('fetchSDF 出错:', e);
    throw e;
  }
}

export function renderSDF(sdf, containerId) {
  if (!Jmol) {
    console.error('Jmol 未加载，请检查 jsmol.js 是否正确引入');
    return;
  }

  const Info = {
    width: '100%',
    height: '100%',
    use: 'HTML5',
    j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s',
    script: `
      set multipleBondSpacing 0.25; // 双键三键间隔
      load inline "${sdf.replace(/"/g, '\\"')}";
      select all;
      spacefill 30%;
      wireframe 0.10;
      color cpk;
    `,
  };

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`容器 ${containerId} 不存在`);
    return;
  }

  container.innerHTML = Jmol.getAppletHtml('jmolApplet', Info);
}

export async function renderFromSMILES(smiles, containerId) {
  try {
    const sdf = await fetchSDF(smiles);
    renderSDF(sdf, containerId);
  } catch (e) {
    console.error('renderFromSMILES 出错:', e);
    const container = document.getElementById(containerId);
    if (container)
      container.innerHTML = "<p style='color:red'>渲染失败，请检查控制台</p>";
    throw e; // ❌ 不 alert，这样前端只会弹一次
  }
}