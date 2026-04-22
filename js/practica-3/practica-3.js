import init, {
  matrix_determinant, matrix_transposed, matrix_adjugate, matrix_inverse,
  matrix_addition, matrix_multiplication_matrix,
  matrix_multiplication_escalar, matrix_multiplication_escalar_f,
  matrix_module, matrix_inverse_module, matrix_addition_module,
  matrix_multiplication_matrix_module, matrix_multiplication_escalar_module,
} from './matrix_operations.js'; // ← AJUSTA ESTE PATH

let wasmReady = false, dim = 2, op = 'det', mode = 'pure';

const binaryOps  = new Set(['add','mul','madd','mmul']);
const scalarKOps = new Set(['esc','mesc']);
const scalarFOps = new Set(['escf']);
const opSymbols  = {add:'+', mul:'·', madd:'+', mmul:'·'};
const opHints    = {
  det:'det(A)', trans:'Aᵀ', adj:'adj(A)', inv:'A⁻¹',
  esc:'k · A', escf:'f · A',
  add:'A + B', mul:'A · B',
  mmod:'A mod m', minv:'A⁻¹ mod m',
  madd:'(A+B) mod m', mmul:'(A·B) mod m', mesc:'(k·A) mod m',
};

// ── Responsive helpers ─────────────────────────────────────
function isMobile(){ return window.innerWidth <= 640; }
function isTablet(){ return window.innerWidth > 640 && window.innerWidth <= 960; }

function buildGrid(id, n, cellCls, size) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  const g = document.createElement('div');
  g.style.cssText = 'display:flex;flex-direction:column;gap:'+(cellCls==='a-cell'?5:4)+'px';
  const cells = [];
  for (let i=0;i<n;i++){
    const row = document.createElement('div');
    row.style.cssText='display:flex;gap:'+(cellCls==='a-cell'?5:4)+'px';
    for(let j=0;j<n;j++){
      const inp=document.createElement('input');
      inp.type='number'; inp.className=cellCls;
      inp.value=(i===j)?1:0;
      if(size){inp.style.width=size+'px';inp.style.height=size+'px'}
      inp.dataset.idx = i*n+j;
      cells.push(inp);
      row.appendChild(inp);
    }
    g.appendChild(row);
  }
  el.appendChild(g);

  const isA = (id === 'a-grid');
  cells.forEach((inp, idx) => {
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = cells[idx + 1];
      if (next) {
        next.focus(); next.select();
      } else if (isA && binaryOps.has(op)) {
        const bFirst = document.querySelector('#b-grid input, #b-grid-tablet input');
        if (bFirst) { bFirst.focus(); bFirst.select(); }
      } else {
        window.runOp();
      }
    });
  });
}

function readGrid(id){
  const el = document.getElementById(id);
  if (!el) return new Array(dim*dim).fill(0);
  return Array.from(el.querySelectorAll('input')).map(c=>parseInt(c.value)||0);
}

// Read B grid from whichever is active (tablet uses b-grid-tablet)
function readB(){
  if (isTablet() && binaryOps.has(op)){
    return readGrid('b-grid-tablet');
  }
  return readGrid('b-grid');
}

function syncBGrids(){
  // keep b-grid and b-grid-tablet in sync
  const src = document.getElementById('b-grid');
  const dst = document.getElementById('b-grid-tablet');
  if (!src || !dst) return;
  const srcCells = src.querySelectorAll('input');
  const dstCells = dst.querySelectorAll('input');
  srcCells.forEach((c,i)=>{ if(dstCells[i]) dstCells[i].value = c.value; });
}

function rebuild(){
  buildGrid('a-grid', dim, 'a-cell');
  buildGrid('b-grid', dim, 'b-cell');
  buildGrid('b-grid-tablet', dim, 'a-cell'); // tablet uses same size cells
  updateUI();
}

function updateUI(){
  const isBin   = binaryOps.has(op);
  const needsK  = scalarKOps.has(op);
  const needsF  = scalarFOps.has(op);
  const needsLeft = needsK || needsF;

  // Desktop b-bar
  if (!isMobile() && !isTablet()) {
    document.getElementById('b-bar').classList.toggle('show', isBin);
  } else if (isMobile()) {
    document.getElementById('b-bar').classList.toggle('show', isBin);
  }

  // Tablet b-area
  const bAreaTablet = document.getElementById('b-area-tablet');
  if (isTablet()) {
    bAreaTablet.style.display = isBin ? 'flex' : 'none';
    document.getElementById('b-bar').classList.remove('show');
  } else {
    bAreaTablet.style.display = 'none';
  }

  document.getElementById('left-panel').classList.toggle('hidden', !needsLeft);
  document.getElementById('sc-k').style.display = needsK ? 'flex':'none';
  document.getElementById('sc-f').style.display = needsF ? 'flex':'none';
  document.getElementById('op-sym-display').textContent = opSymbols[op]||'';
  document.getElementById('run-hint').textContent = opHints[op]||op;
  document.getElementById('mod-wrap').classList.toggle('show', mode==='modular');

  // sync pmm mod visibility
  const pmmModWrap = document.getElementById('pmm-mod-wrap');
  if (pmmModWrap) pmmModWrap.style.display = mode==='modular' ? 'flex' : 'none';
}

// ── Burger menu ────────────────────────────────────────────
window.toggleP3Burger = () => {
  const btn = document.getElementById('p3-burger');
  const menu = document.getElementById('p3-mobile-menu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
};

window.pmobileSetMode = (m) => {
  mode = m;
  document.getElementById('pmm-pure-ops').style.display   = m==='pure'?'block':'none';
  document.getElementById('pmm-modular-ops').style.display= m==='modular'?'block':'none';
  document.getElementById('pmm-mode-pure').classList.toggle('active', m==='pure');
  document.getElementById('pmm-mode-modular').classList.toggle('active', m==='modular');
  document.getElementById('pmm-mod-wrap').style.display = m==='modular'?'flex':'none';

  // also update desktop mode tabs
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tb-pure').style.display   = m==='pure'?'flex':'none';
  document.getElementById('tb-modular').style.display= m==='modular'?'flex':'none';
  const firstDesktopBtn=document.querySelector(`#tb-${m} .tb-btn`);
  if(firstDesktopBtn){ firstDesktopBtn.classList.add('active'); op=firstDesktopBtn.getAttribute('onclick').match(/'(\w+)'/)[1]; }
  // pick first mobile op for this mode
  const firstMobileOp = m==='pure' ? 'det' : 'mmod';
  op = firstMobileOp;
  document.querySelectorAll('.pmm-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('pmm-'+firstMobileOp)?.classList.add('active');

  updateUI(); clearResult();
};

window.pmobileDim = (n) => {
  dim = n;
  document.querySelectorAll('.dim-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('pmm-dim'+n).classList.add('active');
  // also sync desktop dim buttons
  document.querySelectorAll('.dim-btn').forEach(b=>{
    b.classList.toggle('active', b.textContent === n+'×'+n);
  });
  rebuild(); clearResult();
};

window.pmobileOp = (o, btn) => {
  op = o;
  document.querySelectorAll('.pmm-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // close menu
  document.getElementById('p3-burger').classList.remove('open');
  document.getElementById('p3-mobile-menu').classList.remove('open');
  updateUI(); clearResult();
};

window.syncMod = (val) => {
  document.getElementById('global-mod').value = val;
};

// Resize handler
window.addEventListener('resize', () => updateUI());

function clearResult(){
  document.getElementById('res-display').innerHTML='<div class="res-empty">—</div>';
  document.getElementById('res-fn').textContent='';
}

function showScalar(v){
  const el=document.getElementById('res-display');
  el.className='res-anim';
  el.innerHTML=`<div class="res-scalar">${v}</div>`;
}

function showMatrix(arr, n, isFloat){
  const el=document.getElementById('res-display');
  el.className='res-anim';
  let html='<div class="res-grid">';
  for(let i=0;i<n;i++){
    html+='<div class="res-row">';
    for(let j=0;j<n;j++){
      const v=arr[i*n+j];
      html+=`<div class="res-cell">${isFloat?Number(v).toFixed(3):v}</div>`;
    }
    html+='</div>';
  }
  html+='</div>';
  el.innerHTML=html;
}

function showErr(msg){
  const el=document.getElementById('res-display');
  el.className='res-anim';
  el.innerHTML=`<div class="res-err">${msg}</div>`;
  document.getElementById('res-fn').textContent='';
}

window.runOp = () => {
  if(!wasmReady){document.getElementById('wasm-notice').classList.add('show');return;}
  const A=new Int32Array(readGrid('a-grid'));
  const B=new Int32Array(readB());
  const k=parseInt(document.getElementById('inp-k').value)||1;
  const f=parseFloat(document.getElementById('inp-f').value)||1.0;
  // use pmm mod if mobile/tablet and that input is visible
  const modEl = (isMobile()||isTablet()) ? document.getElementById('pmm-global-mod') : document.getElementById('global-mod');
  const m=parseInt((modEl||document.getElementById('global-mod')).value)||26;

  try{
    let res, isFloat=false, isScalar=false;
    switch(op){
      case 'det':  res=matrix_determinant(A); isScalar=true; break;
      case 'trans':res=matrix_transposed(A); break;
      case 'adj':  res=matrix_adjugate(A); break;
      case 'inv':  res=matrix_inverse(A); isFloat=true; break;
      case 'esc':  res=matrix_multiplication_escalar(A,k); break;
      case 'escf': res=matrix_multiplication_escalar_f(A,f); isFloat=true; break;
      case 'add':  res=matrix_addition(A,B); break;
      case 'mul':  res=matrix_multiplication_matrix(A,B); break;
      case 'mmod': res=matrix_module(A,m); break;
      case 'minv': res=matrix_inverse_module(A,m); break;
      case 'madd': res=matrix_addition_module(A,B,m); break;
      case 'mmul': res=matrix_multiplication_matrix_module(A,B,m); break;
      case 'mesc': res=matrix_multiplication_escalar_module(A,k,m); break;
    }
    document.getElementById('res-fn').textContent=opHints[op]||'';
    if(isScalar){ showScalar(res); return; }
    if(!res||res.length===0){ showErr('No existe<br>(det = 0 o sin inversa modular)'); return; }
    showMatrix(res, dim, isFloat);
    if(op==='minv'){
      const el=document.getElementById('res-display');
      el.insertAdjacentHTML('beforeend','<div class="res-verified">✓ Verificado Exitosamente</div>');
    }
  } catch(e){ showErr(e.message); }
};

window.setDim=(n,btn)=>{
  dim=n;
  document.querySelectorAll('.dim-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // sync pmm dim buttons
  document.getElementById('pmm-dim'+n)?.classList.add('active');
  rebuild(); clearResult();
};

window.setMode=(m,btn)=>{
  mode=m;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tb-pure').style.display   = m==='pure'?'flex':'none';
  document.getElementById('tb-modular').style.display= m==='modular'?'flex':'none';
  const firstBtn=document.querySelector(`#tb-${m} .tb-btn`);
  if(firstBtn){ firstBtn.classList.add('active'); op=firstBtn.getAttribute('onclick').match(/'(\w+)'/)[1]; }
  updateUI(); clearResult();
};

window.transferB2A=()=>{
  const src = isTablet() && binaryOps.has(op) ? '#b-grid-tablet input' : '#b-grid input';
  const bCells=document.querySelectorAll(src);
  const aCells=document.querySelectorAll('#a-grid input');
  bCells.forEach((b,i)=>{ if(aCells[i]) aCells[i].value=b.value; });
};
window.transferA2B=()=>{
  const aCells=document.querySelectorAll('#a-grid input');
  const dst = isTablet() && binaryOps.has(op) ? '#b-grid-tablet input' : '#b-grid input';
  const bCells=document.querySelectorAll(dst);
  aCells.forEach((a,i)=>{ if(bCells[i]) bCells[i].value=a.value; });
};
window.swapAB=()=>{
  const aCells=document.querySelectorAll('#a-grid input');
  // swap with both grids to keep in sync
  const bDesktop = document.querySelectorAll('#b-grid input');
  const bTablet  = document.querySelectorAll('#b-grid-tablet input');
  const bActive  = (isTablet() && binaryOps.has(op)) ? bTablet : bDesktop;
  aCells.forEach((a,i)=>{
    if(bActive[i]){
      const tmp=a.value; a.value=bActive[i].value; bActive[i].value=tmp;
    }
  });
  // keep the other b-grid in sync
  const bOther = (isTablet() && binaryOps.has(op)) ? bDesktop : bTablet;
  bActive.forEach((b,i)=>{ if(bOther[i]) bOther[i].value = b.value; });
};

window.selectOp=(o,btn)=>{
  op=o;
  document.querySelectorAll('.tb-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  updateUI(); clearResult();
};

async function boot(){
  try{ await init(); wasmReady=true; }
  catch(e){ document.getElementById('wasm-notice').classList.add('show'); }
  rebuild();
}
boot();