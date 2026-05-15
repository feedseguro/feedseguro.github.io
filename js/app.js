const TOTAL_ROUNDS = 5;
const LIMIT_SECONDS = 12;
const RANK_KEY = 'feedseguro_ranking';
const ALIAS_KEY = 'feedseguro_alias';

const $ = (id) => document.getElementById(id);
const state = { mode: null, posts: [], round: 0, score: 0, hits: 0, combo: 0, maxCombo: 0, effectiveMs: 0, timerId: null, startMs: 0, left: LIMIT_SECONDS };

const animals = ['Lince', 'Zorro', 'Puma', 'Cóndor', 'Delfín'];
const adjs = ['Crítico', 'Seguro', 'Ágil', 'Atento', 'Sereno'];

function rand(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }
function genAlias() { return `${animals[rand(animals.length)]}${adjs[rand(adjs.length)]}${100 + rand(900)}`; }

function getAlias() {
  let alias = localStorage.getItem(ALIAS_KEY);
  if (!alias) { alias = genAlias(); localStorage.setItem(ALIAS_KEY, alias); }
  $('aliasDisplay').textContent = alias;
}

async function loadPosts() {
  const res = await fetch('data/publicaciones.json');
  return res.json();
}

function start(mode) {
  state.mode = mode; state.round = 0; state.score = 0; state.hits = 0; state.combo = 0; state.maxCombo = 0; state.effectiveMs = 0;
  $('endScreen').classList.add('hidden');
  $('feedCard').classList.remove('hidden');
  state.posts = shuffle(window.ALL_POSTS).slice(0, TOTAL_ROUNDS);
  next();
}

function renderStats() {
  $('score').textContent = state.score;
  const acc = state.round ? Math.round((state.hits / state.round) * 100) : 0;
  $('accuracy').textContent = `${acc}%`;
  $('combo').textContent = state.combo;
}

function tick() {
  state.left -= 0.1;
  const pct = Math.max(0, (state.left / LIMIT_SECONDS) * 100);
  $('timerBar').style.width = `${pct}%`;
  $('timerBar').classList.toggle('low', pct < 30);
  if (state.left <= 0) {
    clearInterval(state.timerId);
    evaluate(null, true);
  }
}

function next() {
  if (state.round >= TOTAL_ROUNDS) return endGame();
  const post = state.posts[state.round];
  $('author').textContent = post.autor;
  $('avatar').src = post.avatar;
  $('category').textContent = post.categoria;
  $('difficulty').textContent = post.dificultad;
  $('content').textContent = post.contenido;
  $('feedback').textContent = '';

  const options = $('options'); options.innerHTML = '';
  shuffle(post.opciones).forEach((op) => {
    const b = document.createElement('button');
    b.className = 'option'; b.textContent = op.texto;
    b.onclick = () => evaluate(op, false);
    options.appendChild(b);
  });

  state.left = LIMIT_SECONDS; state.startMs = Date.now();
  clearInterval(state.timerId); state.timerId = setInterval(tick, 100);
  renderStats();
}

function evaluate(option, timeout) {
  document.querySelectorAll('.option').forEach((b) => b.disabled = true);
  clearInterval(state.timerId);
  const elapsed = Date.now() - state.startMs;
  state.effectiveMs += Math.min(elapsed, LIMIT_SECONDS * 1000);
  const ok = option && option.correcta;

  if (ok) {
    const speedBonus = Math.max(0, Math.floor(state.left));
    state.score += 100 + speedBonus * 5;
    state.hits++; state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
    $('feedCard').classList.add('correct-pulse');
    $('combo').classList.add('combo-pop');
  } else {
    state.combo = 0;
    $('feedCard').classList.add('shake');
  }

  const msg = timeout ? 'Tiempo agotado: cuenta como error.' : option?.feedback || 'Respuesta no válida';
  $('feedback').textContent = msg;
  state.round++;
  renderStats();

  setTimeout(() => {
    $('feedCard').classList.remove('correct-pulse', 'shake');
    $('combo').classList.remove('combo-pop');
    next();
  }, 700);
}

function saveRanking() {
  if (state.mode !== 'oficial') return;
  const alias = localStorage.getItem(ALIAS_KEY);
  const acc = Math.round((state.hits / TOTAL_ROUNDS) * 100);
  const row = { alias, score: state.score, accuracy: acc, timeMs: state.effectiveMs, maxCombo: state.maxCombo, date: new Date().toISOString() };
  const prev = JSON.parse(localStorage.getItem(RANK_KEY) || '[]');
  prev.push(row);
  prev.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || a.timeMs - b.timeMs || b.maxCombo - a.maxCombo);
  localStorage.setItem(RANK_KEY, JSON.stringify(prev.slice(0, 20)));
}

function renderRanking() {
  const data = JSON.parse(localStorage.getItem(RANK_KEY) || '[]');
  $('rankingList').innerHTML = data.map((r) => `<li>${r.alias} · ${r.score} pts · ${r.accuracy}% · ${(r.timeMs/1000).toFixed(1)}s · combo ${r.maxCombo}</li>`).join('') || '<li>Sin partidas oficiales aún.</li>';
}

function endGame() {
  saveRanking(); renderRanking();
  $('feedCard').classList.add('hidden');
  $('endScreen').classList.remove('hidden');
  $('endMode').textContent = state.mode;
  $('endScore').textContent = `${state.score} pts`;
  $('endAccuracy').textContent = `${Math.round((state.hits / TOTAL_ROUNDS) * 100)}%`;
  $('endMaxCombo').textContent = state.maxCombo;
  $('endTime').textContent = `${(state.effectiveMs / 1000).toFixed(1)} s`;
}

$('practiceBtn').onclick = () => start('practica');
$('officialBtn').onclick = () => start('oficial');
$('playAgain').onclick = () => start(state.mode || 'practica');
$('changeAliasBtn').onclick = () => {
  const nextAlias = prompt('Nuevo alias (opcional):', localStorage.getItem(ALIAS_KEY) || '');
  if (nextAlias && nextAlias.trim()) localStorage.setItem(ALIAS_KEY, nextAlias.trim());
  else localStorage.setItem(ALIAS_KEY, genAlias());
  getAlias(); renderRanking();
};

(async function boot() {
  window.ALL_POSTS = await loadPosts();
  getAlias(); renderRanking();
})();
