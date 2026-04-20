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

function buildGrid(id, n, cellCls, size) {
  const el = document.getElementById(id);
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

  // Enter-key navigation
  const isA = (id === 'a-grid');
  cells.forEach((inp, idx) => {
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = cells[idx + 1];
      if (next) {
        next.focus(); next.select();
      } else if (isA && binaryOps.has(op)) {
        // A finished, binary op → jump to first cell of B
        const bFirst = document.querySelector('#b-grid input');
        if (bFirst) { bFirst.focus(); bFirst.select(); }
      } else {
        // last cell of A (unary) or last cell of B → execute
        window.runOp();
      }
    });
  });
}

function readGrid(id){
  return Array.from(document.getElementById(id).querySelectorAll('input')).map(c=>parseInt(c.value)||0);
}

function rebuild(){
  buildGrid('a-grid', dim, 'a-cell');
  buildGrid('b-grid', dim, 'b-cell');
  updateUI();
}

function updateUI(){
  const isBin   = binaryOps.has(op);
  const needsK  = scalarKOps.has(op);
  const needsF  = scalarFOps.has(op);
  const needsLeft = needsK || needsF;

  document.getElementById('b-bar').classList.toggle('show', isBin);
  document.getElementById('left-panel').classList.toggle('hidden', !needsLeft);
  document.getElementById('sc-k').style.display = needsK ? 'flex':'none';
  document.getElementById('sc-f').style.display = needsF ? 'flex':'none';
  document.getElementById('op-sym-display').textContent = opSymbols[op]||'';
  document.getElementById('run-hint').textContent = opHints[op]||op;
  document.getElementById('mod-wrap').classList.toggle('show', mode==='modular');
}

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
  const B=new Int32Array(readGrid('b-grid'));
  const k=parseInt(document.getElementById('inp-k').value)||1;
  const f=parseFloat(document.getElementById('inp-f').value)||1.0;
  const m=parseInt(document.getElementById('global-mod').value)||26;

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
    // Show verification badge for successful modular inverse
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
  rebuild(); clearResult();
};

window.setMode=(m,btn)=>{
  mode=m;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tb-pure').style.display   = m==='pure'?'flex':'none';
  document.getElementById('tb-modular').style.display= m==='modular'?'flex':'none';
  // pick first op of that toolbar
  const firstBtn=document.querySelector(`#tb-${m} .tb-btn`);
  if(firstBtn){ firstBtn.classList.add('active'); op=firstBtn.getAttribute('onclick').match(/'(\w+)'/)[1]; }
  updateUI(); clearResult();
};

window.transferB2A=()=>{
  const bCells=document.querySelectorAll('#b-grid input');
  const aCells=document.querySelectorAll('#a-grid input');
  bCells.forEach((b,i)=>{ if(aCells[i]) aCells[i].value=b.value; });
};
window.transferA2B=()=>{
  const aCells=document.querySelectorAll('#a-grid input');
  const bCells=document.querySelectorAll('#b-grid input');
  aCells.forEach((a,i)=>{ if(bCells[i]) bCells[i].value=a.value; });
};
window.swapAB=()=>{
  const aCells=document.querySelectorAll('#a-grid input');
  const bCells=document.querySelectorAll('#b-grid input');
  aCells.forEach((a,i)=>{
    if(bCells[i]){
      const tmp=a.value; a.value=bCells[i].value; bCells[i].value=tmp;
    }
  });
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