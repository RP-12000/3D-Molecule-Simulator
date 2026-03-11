const Jmol = window.Jmol; // 全局 JSmol

/**
 * 从后端获取 SDF 文件
 * @param {string} smiles - SMILES 字符串
 * @returns {Promise<string>} - 返回 SDF 内容
 */
export async function fetchSDF(smiles) {
  try {
    const res = await fetch("http://127.0.0.1:8000/generate", { // TODO: 后期需要调整为其他地址
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`后端请求失败: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (!data.sdf) throw new Error("后端未返回 SDF 数据");

    return data.sdf;
  } catch (e) {
    console.error("fetchSDF 出错:", e);
    throw e;
  }
}

/**
 * 渲染 SDF 到 JSmol 容器
 * @param {string} sdf - SDF 内容
 * @param {string} containerId - HTML 容器 ID
 */
export function renderSDF(sdf, containerId) {
  if (!Jmol) {
    console.error('Jmol 未加载，请检查 jsmol.js 是否正确引入');
    return;
  }

  const Info = {
    width: '100%',
    height: '100%',
    use: 'HTML5',
    j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s', // 可改为本地路径
    script: `
      load inline "${sdf.replace(/"/g, '\\"')}";
      select all;
      spacefill 20%;  // 原子球半径占其范德华半径比例
      wireframe 0.10; // 化学键粗细
      color cpk;      // 用标准CPK颜色
    `,
    debug: true,
  };

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`容器 ${containerId} 不存在`);
    return;
  }

  container.innerHTML = Jmol.getAppletHtml('jmolApplet', Info);
}

/**
 * 高级封装：直接给 SMILES 渲染
 * @param {string} smiles
 * @param {string} containerId
 */
export async function renderFromSMILES(smiles, containerId) {
  try {
    const sdf = await fetchSDF(smiles);
    renderSDF(sdf, containerId);
  } catch (e) {
    console.error("renderFromSMILES 出错:", e);
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "<p style='color:red'>渲染失败，请检查控制台</p>";
  }
}