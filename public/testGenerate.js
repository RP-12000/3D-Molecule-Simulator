import fetch from 'node-fetch'; // Node.js 18+ 可以直接用 fetch，如果低版本需要安装 node-fetch

// 测试 fetchGenerate 函数
async function fetchGenerate(input, type = 'smiles') {
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

  return data; // { formula, smiles, sdf, iter }
}

// ----------------- 测试调用 -----------------
(async () => {
  try {
    const input = 'CCO'; // 这里可以改成 SMILES 或 formula
    const type = 'smiles'; // 或 "formula"

    const data = await fetchGenerate(input, type);

    console.log('生成成功！');
    console.log('Formula:', data.formula);
    console.log('SMILES:', data.smiles);
    console.log('Iterations:', data.iter);
    console.log('SDF 前100字符:\n', data.sdf.slice(0, 100), '...');
  } catch (err) {
    console.error(err.message);
  }
})();
