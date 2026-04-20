// ── Page routing ──────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const idx = id === 'home' ? 0 : 1;
  document.querySelectorAll('.nav-link')[idx]?.classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'projects') renderProjects();
}

// ── Projects list ─────────────────────────────────────────
// Each entry links to a file inside /html/ relative to this page.
// Add your projects here as the folder grows.
const projects = [
  {
    id: 'matrixlab',
    name: 'MatrixLab',
    icon: 'ML',
    desc: 'Linear algebra engine (pure & modular) — determinant, inverse, adjugate, transposed, scalar and matrix multiplication, all mod-m variants.',
    tags: ['wasm', 'rust', 'linear-algebra', 'cryptography'],
    path: 'html/index.html',
  },
  // Add more projects below, e.g.:
  // {
  //   id: 'example',
  //   name: 'My Next Project',
  //   icon: 'NP',
  //   desc: 'Short description of what this WASM project does.',
  //   tags: ['wasm', 'rust'],
  //   path: 'html/next-project/index.html',
  // },
];

function renderProjects() {
  const grid = document.getElementById('proj-grid');
  if (!projects.length) {
    grid.innerHTML = '<div class="proj-empty">No projects yet.<br>Add entries to the projects array in the script.</div>';
    return;
  }
  grid.innerHTML = projects.map(p => `
    <a class="proj-card" href="${p.path}">
      <div class="proj-icon">${p.icon}</div>
      <div class="proj-info">
        <div class="proj-name">${p.name}</div>
        <div class="proj-desc">${p.desc}</div>
        <div class="proj-tags">
          ${p.tags.map(t => `<span class="proj-tag${t==='wasm'?' wasm':''}">${t}</span>`).join('')}
        </div>
      </div>
      <div class="proj-arrow">→</div>
    </a>
  `).join('');
}

// Intercept nav clicks
document.querySelectorAll('.nav-link').forEach((l, i) => {
  if (i < 2) l.addEventListener('click', e => {
    e.preventDefault();
    showPage(i === 0 ? 'home' : 'projects');
  });
});