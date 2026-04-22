// ── Page routing ──────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const pageOrder = ['home', 'projects', 'docs'];
  const idx = pageOrder.indexOf(id);
  document.querySelectorAll('.nav-link')[idx]?.classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'projects') renderProjects();
  if (id === 'docs') renderDocs();
}

// ── Burger menu ───────────────────────────────────────────
function toggleBurger() {
  const btn = document.getElementById('burger-btn');
  const menu = document.getElementById('mobile-menu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
}

function mobileNav(id) {
  showPage(id);
  document.getElementById('burger-btn').classList.remove('open');
  document.getElementById('mobile-menu').classList.remove('open');
  document.querySelectorAll('.mobile-menu-link').forEach(l => l.classList.remove('active'));
  document.getElementById('mob-' + id)?.classList.add('active');
}

// ── Projects list ─────────────────────────────────────────
const projects = [
  {
    id: 'matrixlab',
    name: 'MatrixLab',
    icon: 'ML',
    desc: 'Linear algebra engine (pure & modular) — determinant, inverse, adjugate, transposed, scalar and matrix multiplication, all mod-m variants.',
    tags: ['wasm', 'rust', 'linear-algebra', 'cryptography'],
    path: 'html/practica-3.html',
  },
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

// ── Docs / Certifications ─────────────────────────────────
// Language certificates — update logo, pdf path, description as needed
const langCerts = [
  /*
  {
    name: 'English Certificate B2',
    logo: './docs/png/certs/english.png',
    logoFallback: 'EN',
    desc: 'Cambridge B2 First Certificate in English — demonstrates upper-intermediate proficiency in reading, writing, listening and speaking.',
    tags: ['English', 'B2', 'Cambridge'],
    pdf: './docs/pdf/certs/english-b2.pdf',
  },
  */
];

// Technical / other certificates
const techCerts = [
  /*
  {
    name: 'Rust Programming Fundamentals',
    logo: './docs/png/certs/rust.png',
    logoFallback: 'RS',
    desc: 'Completion certificate for systems programming in Rust — ownership model, borrowing, lifetimes, and safe concurrency patterns.',
    tags: ['Rust', 'Systems', 'Programming'],
    pdf: './docs/pdf/certs/rust-fundamentals.pdf',
  },
  */
 {
  name: 'Talent Land',
  logo: '../docs/png/cert_talentland.png',
  logoFallback: 'TL',
  desc: 'Participation certificate for attending as a Volunteer in the Contents area on the year 2026',
  tags: ['Soft Skills', 'Volunteer'],
  pdf: '../html/doc-pages/cert_talentland.html',
 }
];

function certCardHTML(cert) {
  return `
    <a class="cert-card" href="${cert.pdf}" target="_blank">
      <div class="cert-logo-wrap">
        <img class="cert-logo" src="${cert.logo}" alt="${cert.name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
        <div class="cert-logo-fallback" style="display:none">${cert.logoFallback}</div>
      </div>
      <div class="cert-info">
        <div class="cert-name">${cert.name}</div>
        <div class="cert-desc">${cert.desc}</div>
        <div class="cert-meta">
          ${cert.tags.map((t,i) => `<span class="cert-tag${i===0?' hi':''}">${t}</span>`).join('')}
        </div>
      </div>
      <div class="cert-arrow">↗</div>
    </a>
  `;
}

function renderDocs() {
  const langGrid = document.getElementById('lang-cert-grid');
  const techGrid = document.getElementById('tech-cert-grid');

  langGrid.innerHTML = langCerts.length
    ? langCerts.map(certCardHTML).join('')
    : '<div class="cert-empty">No language certificates added yet.</div>';

  techGrid.innerHTML = techCerts.length
    ? techCerts.map(certCardHTML).join('')
    : '<div class="cert-empty">No certifications added yet.</div>';
}

// Intercept nav clicks
document.querySelectorAll('.nav-link').forEach((l, i) => {
  if (i < 3) l.addEventListener('click', e => {
    e.preventDefault();
    const pages = ['home', 'projects', 'docs'];
    showPage(pages[i]);
  });
});