var jmolApplet;

var Info = {
  width: '100%',
  height: '100%',
  use: 'HTML5',

  j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s',

  script:
    'load https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2519/record/SDF/?record_type=3d',

  disableJSCache: true,
  allowJavaScript: true,
};

window.onload = function () {
  document.getElementById('viewer').innerHTML = Jmol.getAppletHtml(
    'jmolApplet',
    Info,
  );
};
