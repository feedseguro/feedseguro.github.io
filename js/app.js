const feedContainer = document.getElementById("feed-container");

let indiceActual = 0;
let puntaje = 0;
const CLAVE_RANKING = "rankingFeedSeguro";
let aciertos = 0;
let errores = 0;
let combo = 0;
let comboMaximo = 0;
let modoJuego = "practica";
let publicacionesPartida = [];
let publicaciones = [];
const LIMITE_PRACTICA = 5;
const LIMITE_OFICIAL = 10;
let tiempoInicioPregunta = 0;
let tiempoTotalRespuestaMs = 0;

const TIEMPO_PRACTICA = 20;
const TIEMPO_OFICIAL = 12;

let aliasJugador = "";
let tiempoRestante = 0;
let temporizador = null;
let temporizadorAnimacion = null;
let respuestaBloqueada = false;

function formatearTiempo(ms) { return (ms / 1000).toFixed(2) + "s"; }

function generarAlias() {
  const animales = ["Zorro","Puma","Lince","Condor","Carpincho","Jaguar","Hornero","Tero","Aguila","Gato"];
  const adjetivos = ["Digital","Seguro","Rapido","Atento","Curioso","Valiente","Critico","Alerta","Astuto","Firme"];
  const animal = animales[Math.floor(Math.random() * animales.length)];
  const adjetivo = adjetivos[Math.floor(Math.random() * adjetivos.length)];
  const numero = Math.floor(100 + Math.random() * 900);
  return `${animal}${adjetivo}${numero}`;
}

function obtenerAlias() {
  let aliasGuardado = localStorage.getItem("aliasJugador");
  if (!aliasGuardado) { aliasGuardado = generarAlias(); localStorage.setItem("aliasJugador", aliasGuardado); }
  return aliasGuardado;
}

function regenerarAlias() { aliasJugador = generarAlias(); localStorage.setItem("aliasJugador", aliasJugador); mostrarPantallaInicial(); }

function mezclarArray(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function mezclarOpciones(publicacion) { return { ...publicacion, opciones: mezclarArray(publicacion.opciones) }; }
function obtenerTiempoLimite() { return modoJuego === "practica" ? TIEMPO_PRACTICA : TIEMPO_OFICIAL; }

function mostrarEfectoCombo(texto) {
  const comboEfecto = document.getElementById("combo-efecto");
  if (!comboEfecto) return;
  comboEfecto.textContent = texto;
  comboEfecto.classList.remove("oculto", "combo-pop");
  void comboEfecto.offsetWidth;
  comboEfecto.classList.add("combo-pop");
}

function iniciarTemporizador() {
  clearInterval(temporizador);
  cancelAnimationFrame(temporizadorAnimacion);
  tiempoRestante = obtenerTiempoLimite();
  tiempoInicioPregunta = performance.now();
  actualizarTemporizador();

  function animarBarra() {
    const transcurridoSeg = (performance.now() - tiempoInicioPregunta) / 1000;
    const restanteExacto = Math.max(0, obtenerTiempoLimite() - transcurridoSeg);
    const barraTiempo = document.getElementById("barra-tiempo");

    if (barraTiempo) {
      const porcentaje = (restanteExacto / obtenerTiempoLimite()) * 100;
      barraTiempo.style.width = `${porcentaje}%`;
      barraTiempo.classList.toggle("peligro", porcentaje <= 30);
    }

    if (restanteExacto > 0 && !respuestaBloqueada) {
      temporizadorAnimacion = requestAnimationFrame(animarBarra);
    }
  }

  temporizadorAnimacion = requestAnimationFrame(animarBarra);

  temporizador = setInterval(() => {
    tiempoRestante--;
    actualizarTemporizador();
    if (tiempoRestante <= 0) { clearInterval(temporizador); tiempoAgotado(); }
  }, 1000);
}

function actualizarTemporizador() {
  const textoTiempo = document.getElementById("tiempo-restante");
  const barraTiempo = document.getElementById("barra-tiempo");
  if (textoTiempo) textoTiempo.textContent = tiempoRestante;
  if (barraTiempo) {
    const porcentaje = (tiempoRestante / obtenerTiempoLimite()) * 100;
    barraTiempo.style.width = `${porcentaje}%`;
    barraTiempo.classList.toggle("peligro", porcentaje <= 30);
  }
}

function mostrarPublicacion() {
  respuestaBloqueada = false;
  const publicacion = publicacionesPartida[indiceActual];
  const respondidas = aciertos + errores;
  const precision = respondidas === 0 ? 100 : Math.round((aciertos / respondidas) * 100);

  feedContainer.innerHTML = `
    <div class="estado">
      <span>👤 ${aliasJugador}</span>
      <span>${modoJuego === "practica" ? "🧪 Práctica" : "🏆 Oficial"}</span>
      <span>⭐ ${puntaje}</span>
      <span>🎯 ${precision}%</span>
      <span>🔥 x${combo}</span>
      <span>📌 ${indiceActual + 1}/${publicacionesPartida.length}</span>
    </div>

    <div class="temporizador-box">
      <div class="temporizador-info">⏱️ Tiempo restante: <strong id="tiempo-restante"></strong>s</div>
      <div class="barra-tiempo-contenedor"><div id="barra-tiempo"></div></div>
    </div>

    <div class="publicacion tarjeta-entrada" id="tarjeta-publicacion">
      <div class="header-publicacion">
        <div class="avatar">${publicacion.avatar}</div>
        <div><div class="autor">${publicacion.autor}</div><div class="categoria">${publicacion.categoria}</div></div>
      </div>
      <div class="contenido">${publicacion.contenido}</div>
      <div class="opciones">
        ${publicacion.opciones.map((opcion, index) => `<button onclick="seleccionarOpcion(${index})">${opcion.texto}</button>`).join("")}
      </div>
      <div id="combo-efecto" class="combo-efecto oculto"></div>
      <div id="feedback" class="feedback oculto"></div>
    </div>`;

  iniciarTemporizador();
}

function seleccionarOpcion(indiceOpcion) {
  if (respuestaBloqueada) return;
  respuestaBloqueada = true;
  clearInterval(temporizador);
  cancelAnimationFrame(temporizadorAnimacion);
  const tiempoRespuesta = performance.now() - tiempoInicioPregunta;
  tiempoTotalRespuestaMs += tiempoRespuesta;
  const publicacion = publicacionesPartida[indiceActual];
  const opcion = publicacion.opciones[indiceOpcion];
  const feedback = document.getElementById("feedback");
  const tarjeta = document.getElementById("tarjeta-publicacion");

  if (opcion.correcta) {
    combo++; comboMaximo = Math.max(comboMaximo, combo);
    const bonusCombo = combo >= 3 ? combo * 10 : 0;
    const puntosGanados = 100 + bonusCombo;
    puntaje += puntosGanados; aciertos++;
    if (tarjeta) tarjeta.classList.add("respuesta-correcta");
    if (combo >= 3) mostrarEfectoCombo(`🔥 Combo x${combo}`);
    feedback.className = "feedback correcto";
    feedback.innerHTML = modoJuego === "practica"
      ? `✅ ${opcion.feedback}<br>+${puntosGanados} puntos — 🔥 Combo x${combo}`
      : `✅ Correcto<br>+${puntosGanados} puntos — 🔥 x${combo}`;
  } else {
    errores++; combo = 0;
    if (tarjeta) tarjeta.classList.add("respuesta-incorrecta");
    const opcionCorrecta = publicacion.opciones.find(op => op.correcta);
    feedback.className = "feedback incorrecto";
    feedback.innerHTML = modoJuego === "practica"
      ? `⚠️ ${opcion.feedback}<br>Respuesta recomendada: <strong>${opcionCorrecta.texto}</strong>`
      : `⚠️ Incorrecto<br>Combo reiniciado`;
  }

  bloquearBotones();
  setTimeout(() => { siguientePublicacion(); }, modoJuego === "practica" ? 2200 : 1300);
}

function tiempoAgotado() {
  if (respuestaBloqueada) return;
  respuestaBloqueada = true;
  cancelAnimationFrame(temporizadorAnimacion);
  tiempoTotalRespuestaMs += obtenerTiempoLimite() * 1000;
  errores++; combo = 0;
  const publicacion = publicacionesPartida[indiceActual];
  const opcionCorrecta = publicacion.opciones.find(op => op.correcta);
  const feedback = document.getElementById("feedback");
  const tarjeta = document.getElementById("tarjeta-publicacion");
  if (tarjeta) tarjeta.classList.add("respuesta-incorrecta");
  feedback.className = "feedback incorrecto";
  feedback.innerHTML = modoJuego === "practica"
    ? `⏱️ Tiempo agotado.<br>Respuesta recomendada: <strong>${opcionCorrecta.texto}</strong>`
    : `⏱️ Tiempo agotado.<br>Combo reiniciado.`;
  bloquearBotones();
  setTimeout(() => { siguientePublicacion(); }, modoJuego === "practica" ? 2200 : 1300);
}

function bloquearBotones() { document.querySelectorAll(".opciones button").forEach((boton) => { boton.disabled = true; }); }
function siguientePublicacion() { indiceActual++; if (indiceActual >= publicacionesPartida.length) mostrarFinal(); else mostrarPublicacion(); }
function calcularPrecisionFinal() { const total = aciertos + errores; return total === 0 ? 0 : Math.round((aciertos / total) * 100); }
function obtenerRanking() { return JSON.parse(localStorage.getItem(CLAVE_RANKING) || "[]"); }

function guardarResultadoRanking() {
  if (modoJuego !== "oficial") return;
  const resultado = { alias: aliasJugador, puntaje, precision: calcularPrecisionFinal(), tiempoMs: Math.round(tiempoTotalRespuestaMs), comboMaximo, fecha: new Date().toISOString() };
  const ranking = obtenerRanking();
  ranking.push(resultado);
  ranking.sort((a, b) => (b.puntaje - a.puntaje) || (b.precision - a.precision) || (a.tiempoMs - b.tiempoMs) || (b.comboMaximo - a.comboMaximo));
  localStorage.setItem(CLAVE_RANKING, JSON.stringify(ranking.slice(0, 10)));
}

function mostrarFinal() {
  guardarResultadoRanking();
  const precision = calcularPrecisionFinal();
  feedContainer.innerHTML = `
    <div class="publicacion final final-entrada">
      <div class="final-celebracion" aria-hidden="true">✨🏆✨</div>
      <h2>🏁 Partida finalizada</h2>
      <div class="final-metricas">
        <p class="final-item" style="--i:0">👤 Alias: <strong>${aliasJugador}</strong></p>
        <p class="final-item" style="--i:1">Modo: <strong>${modoJuego === "practica" ? "Práctica" : "Oficial"}</strong></p>
        <p class="final-item destacado" style="--i:2">⭐ Puntaje final: <strong>${puntaje}</strong></p>
        <p class="final-item" style="--i:3">🎯 Precisión: <strong>${precision}%</strong></p>
        <p class="final-item" style="--i:4">✅ Aciertos: <strong>${aciertos}</strong></p>
        <p class="final-item" style="--i:5">❌ Errores: <strong>${errores}</strong></p>
        <p class="final-item" style="--i:6">🔥 Combo máximo: <strong>x${comboMaximo}</strong></p>
        <p class="final-item" style="--i:7">⏱️ Tiempo efectivo: <strong>${formatearTiempo(tiempoTotalRespuestaMs)}</strong></p>
      </div>
      <button class="final-btn" onclick="reiniciarPartida()">Jugar de nuevo</button>
    </div>`;
}

function mostrarRanking() {
  clearInterval(temporizador);
  cancelAnimationFrame(temporizadorAnimacion);
  const ranking = obtenerRanking();
  if (ranking.length === 0) {
    feedContainer.innerHTML = `<div class="publicacion final"><h2>🏆 Ranking local</h2><p>Todavía no hay partidas oficiales registradas.</p><button onclick="mostrarPantallaInicial()">Volver al inicio</button></div>`;
    return;
  }
  const filas = ranking.map((jugador, index) => `<tr><td>${index + 1}</td><td>${jugador.alias}</td><td>${jugador.puntaje}</td><td>${jugador.precision}%</td><td>${formatearTiempo(jugador.tiempoMs)}</td><td>x${jugador.comboMaximo}</td></tr>`).join("");
  feedContainer.innerHTML = `<div class="publicacion ranking"><h2>🏆 Ranking local</h2><table><thead><tr><th>#</th><th>Alias</th><th>Puntos</th><th>Prec.</th><th>Tiempo</th><th>Combo</th></tr></thead><tbody>${filas}</tbody></table><button onclick="mostrarPantallaInicial()">Volver al inicio</button></div>`;
}

function reiniciarPartida() { indiceActual = 0; puntaje = 0; aciertos = 0; errores = 0; combo = 0; comboMaximo = 0; mostrarPantallaInicial(); }

function iniciarPartida(modo) {
  modoJuego = modo;
  tiempoTotalRespuestaMs = 0;
  indiceActual = 0; puntaje = 0; aciertos = 0; errores = 0; combo = 0; comboMaximo = 0;
  const limite = modoJuego === "practica" ? LIMITE_PRACTICA : LIMITE_OFICIAL;
  publicacionesPartida = mezclarArray(publicaciones).slice(0, limite).map(mezclarOpciones);
  mostrarPublicacion();
}

function mostrarPantallaInicial() {
  aliasJugador = obtenerAlias();
  clearInterval(temporizador);
  cancelAnimationFrame(temporizadorAnimacion);
  feedContainer.innerHTML = `
    <div class="publicacion inicio">
      <h2>🛡️ Feed Seguro</h2>
      <div class="alias-box"><p>Tu alias:</p><strong>${aliasJugador}</strong><button onclick="regenerarAlias()">Cambiar alias</button></div>
      <p>Analizá publicaciones, detectá riesgos digitales y tomá buenas decisiones.</p>
      <div class="modos">
        <button onclick="iniciarPartida('practica')">🧪 Modo práctica <span>20 segundos por publicación</span></button>
        <button onclick="iniciarPartida('oficial')">🏆 Modo oficial <span>12 segundos por publicación</span></button>
        <button onclick="mostrarRanking()" class="boton-secundario">🏆 Ver ranking local</button>
      </div>
    </div>`;
}

async function cargarPublicaciones() {
  try {
    const respuesta = await fetch("data/publicaciones.json");
    if (!respuesta.ok) throw new Error("No se pudo cargar el archivo de publicaciones.");
    publicaciones = await respuesta.json();
    mostrarPantallaInicial();
  } catch (error) {
    feedContainer.innerHTML = `<div class="publicacion"><h2>Error al cargar publicaciones</h2><p>${error.message}</p></div>`;
  }
}

cargarPublicaciones();
