import init, {
  modus_ecb_hc_cipher, modus_cbc_hc_cipher, modus_cfb_hc_cipher,
  modus_ofb_hc_cipher, modus_pcbc_hc_cipher, modus_ctr_hc_cipher,
  modus_ecb_hc_decipher, modus_cbc_hc_decipher, modus_cfb_hc_decipher,
  modus_ofb_hc_decipher, modus_pcbc_hc_decipher, modus_ctr_hc_decipher,
  matrix_determinant,
  matrix_inverse_module,
} from './modus_openrandi.js';

let wasmReady = false;

const state = {
  mode: 'cbc',
  action: 'cipher',
  lastResult: null,
  lastIv: null,
  originalMsg: null,
};

const $ = id => document.getElementById(id);

const cells = {
  msg: $('cells-msg'),
  iv: $('cells-iv'),
  key: $('cells-key'),
  nonce: $('cells-nonce'),
  result: $('cells-result'),
};
const scroll = {
  msg: $('scroll-msg'),
  iv: $('scroll-iv'),
  key: $('scroll-key'),
  nonce: $('scroll-nonce'),
  result: $('scroll-result'),
};
const row = {
  iv: $('row-iv'),
  nonce: $('row-nonce'),
  padding: $('row-padding'),
};
const res = {
  area: $('result-area'),
  caption: $('result-caption'),
  padding: $('res-padding'),
  iv: $('res-iv'),
  ivWrap: $('res-iv-wrap'),
  nonce: $('res-nonce'),
  nonceWrap: $('res-nonce-wrap'),
};
const labelMsg = $('label-msg');
const inpPadding = $('inp-padding');
const inpMod = $('inp-mod');
const dimHint = $('dim-hint');
const actionBtn = $('action-btn');
const keyDetEl = $('key-det');
const keyInvEl = $('key-inv');

function initCells(container, count, vals = null) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'cell-inp';
    inp.value = vals !== null && i < vals.length ? String(vals[i]) : '0';
    container.appendChild(inp);
  }
  refreshLast(container);
}

function setCells(container, arr) {
  container.innerHTML = '';
  arr.forEach((v, i) => {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'cell-inp';
    inp.value = String(v);
    container.appendChild(inp);
  });
  refreshLast(container);
}

function getValues(container) {
  return Array.from(container.querySelectorAll('.cell-inp')).map(
    inp => { const v = parseInt(inp.value, 10); return isNaN(v) ? 0 : v; }
  );
}

function refreshLast(container) {
  const all = container.querySelectorAll('.cell-inp');
  all.forEach(c => c.classList.remove('last'));
  if (all.length > 0) all[all.length - 1].classList.add('last');
}

function nextSquare(n) {
  const s = Math.ceil(Math.sqrt(n));
  return s * s;
}

function getBlockSize() {
  return Math.floor(Math.sqrt(cells.key.children.length));
}

function updateBlockHint() {
  dimHint.textContent = `block: ${getBlockSize()}`;
}

function insertCellAfter(container, refChild, val = '0') {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'cell-inp';
  inp.value = val;
  if (refChild.nextSibling) {
    container.insertBefore(inp, refChild.nextSibling);
  } else {
    container.appendChild(inp);
  }
  refreshLast(container);
  const parent = container.closest('.cell-scroll');
  if (parent) parent.scrollLeft = parent.scrollWidth;
  return inp;
}

function jumpKeyToSquare(sq) {
  while (cells.key.children.length < sq) {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'cell-inp';
    inp.value = '0';
    cells.key.appendChild(inp);
  }
  refreshLast(cells.key);
  updateBlockHint();
  syncIvDim();
  syncNonceDim();
  const parent = cells.key.closest('.cell-scroll');
  if (parent) parent.scrollLeft = parent.scrollWidth;
  const last = cells.key.lastElementChild;
  if (last) setTimeout(() => { last.focus(); last.select(); }, 0);
}

function syncIvDim() {
  const bs = getBlockSize();
  const cur = cells.iv.children.length;
  if (cur < bs) {
    for (let i = cur; i < bs; i++) insertCellAfter(cells.iv, cells.iv.lastElementChild, '0');
  } else if (cur > bs) {
    while (cells.iv.children.length > bs) cells.iv.removeChild(cells.iv.lastElementChild);
    refreshLast(cells.iv);
  }
}

function syncNonceDim() {
  const bs = getBlockSize();
  const need = bs - 1;
  const cur = cells.nonce.children.length;
  if (cur < need) {
    for (let i = cur; i < need; i++) insertCellAfter(cells.nonce, cells.nonce.lastElementChild, '0');
  } else if (cur > need) {
    while (cells.nonce.children.length > need) cells.nonce.removeChild(cells.nonce.lastElementChild);
    refreshLast(cells.nonce);
  }
}

function updateKeyInfo() {
  if (!wasmReady) return;
  const keyVals = getValues(cells.key);
  const bs = getBlockSize();
  if (bs * bs !== keyVals.length || keyVals.length === 0) {
    keyDetEl.textContent = '—';
    keyInvEl.textContent = '—';
    keyDetEl.style.color = '';
    return;
  }
  const m = parseInt(inpMod.value, 10) || 26;
  const keyArr = new Int32Array(keyVals);
  const det = matrix_determinant(keyArr);
  const detMod = ((det % m) + m) % m;
  keyDetEl.textContent = String(detMod);
  keyDetEl.style.color = detMod === 0 ? 'var(--err)' : 'var(--acc)';
  if (detMod !== 0) {
    const inv = matrix_inverse_module(keyArr, m);
    keyInvEl.textContent = '[' + Array.from(inv).join(', ') + ']';
  } else {
    keyInvEl.textContent = 'no invertible';
  }
}

function onCellKeydown(e) {
  const inp = e.target;
  const container = inp.closest('.cell-inner');
  if (!container || container === cells.result) return;
  const all = container.querySelectorAll('.cell-inp');
  const idx = Array.from(all).indexOf(inp);

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (idx < all.length - 1) { all[idx + 1].focus(); all[idx + 1].select(); }
    return;
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (idx > 0) { all[idx - 1].focus(); all[idx - 1].select(); }
    return;
  }

  if (e.key !== 'Enter') return;
  e.preventDefault();

  if (container === cells.key) {
    if (idx === all.length - 1) {
      const cur = cells.key.children.length;
      const sq = nextSquare(cur + 1);
      jumpKeyToSquare(sq);
    }
    return;
  }

  const newInp = insertCellAfter(container, inp, '0');
  newInp.focus();
  newInp.select();
}

function onCellKeyup(e) {
  if (e.key !== 'Backspace') return;
  const inp = e.target;
  const container = inp.closest('.cell-inner');
  if (!container || container === cells.result) return;
  const all = container.querySelectorAll('.cell-inp');
  const idx = Array.from(all).indexOf(inp);
  const isLast = idx === all.length - 1;

  if (idx === 0) return;

  if (inp.value === '' && isLast && all.length > 1) {
    inp.remove();
    refreshLast(container);
    if (container === cells.key) {
      updateBlockHint();
      syncIvDim();
      syncNonceDim();
      updateKeyInfo();
    }
    const prev = container.lastElementChild;
    if (prev) setTimeout(() => { prev.focus(); prev.select(); }, 0);
  }
}

function onCellFocus(e) {
  setTimeout(() => e.target.select(), 0);
}

function onCellInputGuard(e) {
  const inp = e.target;
  const container = inp.closest('.cell-inner');
  if (!container || container === cells.result) return;
  const all = container.querySelectorAll('.cell-inp');
  const idx = Array.from(all).indexOf(inp);
  if (idx === 0 && inp.value === '') inp.value = '0';
}

function attachCellEvents() {
  [cells.msg, cells.iv, cells.key, cells.nonce].forEach(ct => {
    ct.addEventListener('keydown', onCellKeydown);
    ct.addEventListener('keyup', onCellKeyup);
    ct.addEventListener('focusin', onCellFocus);
    ct.addEventListener('input', onCellInputGuard);
  });
}

function maybeShowIv() {
  const needsIv = ['cbc', 'cfb', 'ofb', 'pcbc'].includes(state.mode);
  if (needsIv) {
    row.iv.style.display = '';
    syncIvDim();
  } else {
    row.iv.style.display = 'none';
  }
  if (state.mode === 'ctr' && state.action === 'decipher') {
    row.nonce.style.display = '';
    syncNonceDim();
  } else {
    row.nonce.style.display = 'none';
  }
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  maybeShowIv();
}

function flipData() {
  if (!state.lastResult) return;
  const r = state.lastResult;
  state.originalMsg = getValues(cells.msg);
  setCells(cells.msg, Array.from(r.cipher_text));
  inpPadding.value = String(r.padding);
  if (r.nonce) setCells(cells.nonce, Array.from(r.nonce));
}

function setAction(action) {
  state.action = action;
  document.querySelectorAll('.mode-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.action === action);
  });
  document.body.classList.toggle('decipher', action === 'decipher');
  if (action === 'cipher') {
    if (state.originalMsg) {
      setCells(cells.msg, state.originalMsg);
      state.originalMsg = null;
    }
    labelMsg.textContent = 'msg';
    row.padding.style.display = 'none';
    row.nonce.style.display = 'none';
    actionBtn.textContent = 'Cifrar';
    res.caption.textContent = 'Cipher Text';
  } else {
    labelMsg.textContent = 'cipher text';
    row.padding.style.display = '';
    actionBtn.textContent = 'Descifrar';
    res.caption.textContent = 'Plain Text';
    flipData();
  }
  maybeShowIv();
}

async function execute() {
  if (!wasmReady) {
    alert('WASM no cargado — espera un momento');
    return;
  }
  const m = parseInt(inpMod.value, 10) || 26;
  const keyArr = getValues(cells.key);
  if (keyArr.length === 0) { alert('Ingresa una llave'); return; }
  const bs = getBlockSize();
  if (bs * bs !== keyArr.length) {
    alert(`La llave debe ser una matriz cuadrada (tiene ${keyArr.length} elementos, se espera ${bs*bs})`);
    return;
  }
  const msgArr = getValues(cells.msg);
  if (msgArr.length === 0) { alert('Ingresa un mensaje'); return; }
  try {
    if (state.action === 'cipher') await runCipher(msgArr, keyArr, m);
    else await runDecipher(msgArr, keyArr, m);
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}

async function runCipher(msgArr, keyArr, m) {
  const needsIv = ['cbc', 'cfb', 'ofb', 'pcbc'].includes(state.mode);
  let c0 = null;
  if (needsIv) {
    c0 = getValues(cells.iv);
    if (c0.length === 0) { alert('Ingresa el vector de inicialización c₀'); return; }
  }
  const msg = new Int32Array(msgArr);
  const key = new Int32Array(keyArr);
  let result;
  switch (state.mode) {
    case 'ecb': result = modus_ecb_hc_cipher(msg, key, m); break;
    case 'cbc': result = modus_cbc_hc_cipher(msg, new Int32Array(c0), key, m); break;
    case 'cfb': result = modus_cfb_hc_cipher(msg, new Int32Array(c0), key, m); break;
    case 'ofb': result = modus_ofb_hc_cipher(msg, new Int32Array(c0), key, m); break;
    case 'pcbc': result = modus_pcbc_hc_cipher(msg, new Int32Array(c0), key, m); break;
    case 'ctr': result = modus_ctr_hc_cipher(msg, key, m); break;
    default: alert('Modo no soportado'); return;
  }
  if (!result) { alert('Error en el cifrado — revisa parámetros'); return; }
  state.lastResult = result;
  if (needsIv) state.lastIv = c0;
  displayCipherResult(result);
}

async function runDecipher(cipherTextArr, keyArr, m) {
  const needsIv = ['cbc', 'cfb', 'ofb', 'pcbc'].includes(state.mode);
  const padding = parseInt(inpPadding.value, 10) || 0;
  let c0 = null;
  if (needsIv) {
    c0 = getValues(cells.iv);
    if (c0.length === 0) { alert('Ingresa c₀'); return; }
  }
  let nonce = null;
  if (state.mode === 'ctr') {
    nonce = getValues(cells.nonce);
    if (nonce.length === 0) { alert('Ingresa el nonce'); return; }
  }
  const ct = new Int32Array(cipherTextArr);
  const key = new Int32Array(keyArr);
  let result;
  switch (state.mode) {
    case 'ecb': result = modus_ecb_hc_decipher(ct, key, padding, m); break;
    case 'cbc': result = modus_cbc_hc_decipher(ct, new Int32Array(c0), key, padding, m); break;
    case 'cfb': result = modus_cfb_hc_decipher(ct, new Int32Array(c0), key, padding, m); break;
    case 'ofb': result = modus_ofb_hc_decipher(ct, new Int32Array(c0), key, padding, m); break;
    case 'pcbc': result = modus_pcbc_hc_decipher(ct, new Int32Array(c0), key, padding, m); break;
    case 'ctr': result = modus_ctr_hc_decipher(ct, new Int32Array(nonce), key, padding, m); break;
    default: alert('Modo no soportado'); return;
  }
  if (!result) { alert('Error en el descifrado — revisa parámetros'); return; }
  displayDecipherResult(result);
}

function displayCipherResult(result) {
  res.area.style.display = '';
  res.caption.textContent = 'Cipher Text';
  setCells(cells.result, Array.from(result.cipher_text));
  scroll.result.scrollLeft = 0;
  res.padding.textContent = String(result.padding);
  if (state.lastIv) {
    res.ivWrap.style.display = '';
    res.iv.textContent = state.lastIv.join(', ');
  } else {
    res.ivWrap.style.display = 'none';
  }
  if (result.nonce) {
    res.nonceWrap.style.display = '';
    res.nonce.textContent = Array.from(result.nonce).join(', ');
  } else {
    res.nonceWrap.style.display = 'none';
  }
}

function displayDecipherResult(result) {
  res.area.style.display = '';
  res.caption.textContent = 'Plain Text';
  setCells(cells.result, Array.from(result.plain_text));
  scroll.result.scrollLeft = 0;
  res.padding.textContent = inpPadding.value;
  res.ivWrap.style.display = 'none';
  res.nonceWrap.style.display = 'none';
}

async function main() {
  try {
    await init();
    wasmReady = true;
  } catch (e) {
    console.warn('modus_openrandi WASM init error', e);
  }

  initCells(cells.msg, 3);
  initCells(cells.key, 1);
  initCells(cells.iv, 1);
  initCells(cells.nonce, 1);
  updateBlockHint();
  attachCellEvents();

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => setAction(tab.dataset.action));
  });
  actionBtn.addEventListener('click', execute);

  inpMod.addEventListener('input', updateKeyInfo);

  const obs = new MutationObserver(() => {
    updateBlockHint();
    syncIvDim();
    syncNonceDim();
    updateKeyInfo();
  });
  obs.observe(cells.key, { childList: true });
}

main();
