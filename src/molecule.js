import OCL from 'openchemlib';

const Jmol = window.Jmol; // ★关键：解决“未解析 Jmol”

/**
 * 根据 SMILES 生成 SDF
 */
export function formulaToSDF(smiles) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.addImplicitHydrogens();

  // 生成 V3 molfile
  let sdf = molecule.toMolfileV3();

  // ★JSmol 需要 $$$$
  if (!sdf.includes('$$$$')) {
    sdf += '\n$$$$';
  }
  //调试专用：SMILES文件能生成
  //console.log('生成的 SDF:\n', sdf);
  return sdf;
}

/**
 * 渲染到 JSmol
 */
export function renderSDF(sdf, containerId) {
  if (!Jmol) {
    console.error('Jmol 未加载，请检查 JSmol.min.js');
    return;
  }
  const Info = {
    width: 400,
    height: 400,
    use: 'HTML5',
    j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s',
    script: `load inline "${sdf.replace(/"/g, '\\"')}"`,
    debug: true,
  };
  document.getElementById(containerId).innerHTML = Jmol.getAppletHtml(
    'jmolApplet',
    Info,
  );
}
