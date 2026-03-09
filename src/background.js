// ----------------- FLOATING MOLECULES -----------------
const molecules = [
  'H₂O',
  'CO₂',
  'NH₃',
  'CH₄',
  'C₆H₆',
  'O₂',
  'N₂',
  'H₂SO₄',
  'NaCl',
];
const floatingMolecules = [];
const numMolecules = 25; // 可调整

for (let i = 0; i < numMolecules; i++) {
  const span = document.createElement('span');
  span.className = 'floating-molecule';
  span.innerText = molecules[Math.floor(Math.random() * molecules.length)];
  span.x = Math.random() * window.innerWidth;
  span.y = Math.random() * window.innerHeight;
  span.vx = (Math.random() - 0.5) * 1.5;
  span.vy = (Math.random() - 0.5) * 1.5;
  span.style.left = span.x + 'px';
  span.style.top = span.y + 'px';
  document.body.appendChild(span);
  floatingMolecules.push(span);
}

function animateMolecules() {
  for (const mol of floatingMolecules) {
    mol.x += mol.vx;
    mol.y += mol.vy;
    if (mol.x < 0 || mol.x + mol.offsetWidth > window.innerWidth) mol.vx *= -1;
    if (mol.y < 0 || mol.y + mol.offsetHeight > window.innerHeight)
      mol.vy *= -1;
    mol.style.left = mol.x + 'px';
    mol.style.top = mol.y + 'px';
  }
  requestAnimationFrame(animateMolecules);
}
animateMolecules();

window.addEventListener('resize', () => {
  for (const mol of floatingMolecules) {
    mol.x = Math.min(mol.x, window.innerWidth - mol.offsetWidth);
    mol.y = Math.min(mol.y, window.innerHeight - mol.offsetHeight);
  }
});
