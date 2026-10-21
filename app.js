'use strict';

(() => {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const FILAS_TECLADO = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
  const CLAVE_AYUDA_VISTA = 'tesela-ayuda-vista';
  const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Utilidades ----------

  // Mayúsculas sin tildes ni diéresis, conservando la Ñ.
  function normalizar(texto) {
    return texto
      .toUpperCase()
      .replace(/Ñ/g, '\u0000')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\u0000/g, 'Ñ');
  }

  function letrasDe(texto) {
    return [...normalizar(texto)].filter((c) => /[A-ZÑ]/.test(c));
  }

  const dosCifras = (n) => String(n).padStart(2, '0');

  function fechaLocal(d = new Date()) {
    return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
  }

  function sumarDias(fecha, n) {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
  }

  function fechaCorta(fecha) {
    const [, m, d] = fecha.split('-').map(Number);
    return `${d} ${MESES[m - 1]}`;
  }

  function diaSemana(fecha) {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long' });
  }

  const etiquetaDef = (i) => String.fromCharCode(65 + i);

  function plural(n, singular, varios) {
    return `${n} ${n === 1 ? singular : varios}`;
  }

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }

  // ---------- Almacenamiento ----------

  const almacen = {
    leer(clave) {
      try {
        const crudo = localStorage.getItem(clave);
        return crudo ? JSON.parse(crudo) : null;
      } catch {
        return null;
      }
    },
    guardar(clave, valor) {
      try {
        localStorage.setItem(clave, JSON.stringify(valor));
      } catch {
        // Sin almacenamiento (modo privado, cuota llena): se juega igual, sin guardar.
      }
    },
  };

  const claveProgreso = (fecha) => `tesela:${fecha}`;

  function progresoVacio() {
    return { letras: {}, reveladas: [], comprobaciones: 0, terminada: false, resueltaEl: null };
  }

  function leerProgreso(fecha) {
    const p = almacen.leer(claveProgreso(fecha));
    if (!p || typeof p !== 'object') return progresoVacio();
    return {
      letras: p.letras && typeof p.letras === 'object' ? p.letras : {},
      reveladas: Array.isArray(p.reveladas) ? p.reveladas : [],
      comprobaciones: Number(p.comprobaciones) || 0,
      terminada: Boolean(p.terminada),
      resueltaEl: p.resueltaEl || null,
    };
  }

  // ---------- Estado ----------

  const $ = (id) => document.getElementById(id);
  const els = {
    principal: $('principal'),
    titulo: $('titulo-partida'),
    aviso: $('aviso'),
    rejilla: $('rejilla'),
    oculta: $('oculta'),
    definiciones: $('definiciones'),
    verResultado: $('btn-ver-resultado'),
    comprobar: $('btn-comprobar'),
    revelar: $('btn-revelar'),
    pista: $('pista-texto'),
    panel: $('panel'),
    teclado: $('teclado'),
    tostada: $('tostada'),
  };

  let hoy = fechaLocal();
  let partidas = []; // solo las que no son futuras, ordenadas por fecha
  let juego = null;

  // ---------- Elección de la partida ----------

  function partidaDelDia() {
    return partidas.find((p) => p.fecha === hoy) || partidas[partidas.length - 1] || null;
  }

  function partidaPedida() {
    const fecha = decodeURIComponent(location.hash.slice(1));
    if (!fecha) return null;
    return partidas.find((p) => p.fecha === fecha) || null;
  }

  function abrirSegunDireccion() {
    const pedida = partidaPedida();
    if (location.hash && !pedida) history.replaceState(null, '', location.pathname + location.search);
    const partida = pedida || partidaDelDia();
    if (!partida) {
      mostrarVacio('Todavía no hay ninguna partida. ¡Vuelve pronto!');
      return;
    }
    montar(partida);
  }

  // ---------- Montaje de una partida ----------

  function montar(p) {
    const solucion = [null, ...letrasDe(p.frase)];
    const N = solucion.length - 1;
    const defDe = new Array(N + 1);
    p.definiciones.forEach((d, i) => d.casillas.forEach((c) => { defDe[c] = i; }));

    const progreso = leerProgreso(p.fecha);
    juego = {
      p,
      N,
      solucion,
      defDe,
      progreso,
      reveladas: new Set(progreso.reveladas),
      marcadas: new Set(),
      cursor: { modo: 'rejilla', casilla: 1 },
      celdasRejilla: [],
      celdasDef: [],
      celdasOculta: [],
      itemsDef: [],
    };

    const primeraVacia = siguienteVacia(ordenRejilla(), 0, true);
    juego.cursor.casilla = primeraVacia || 1;

    construirRejilla();
    construirDefiniciones();
    els.titulo.textContent = `Tesela nº ${p.numero} · ${fechaCorta(p.fecha)}`;
    document.title = `Tesela nº ${p.numero}`;
    mostrarAviso();
    actualizar();
    window.scrollTo(0, 0);
  }

  function mostrarAviso() {
    const { p } = juego;
    const delDia = partidas.find((x) => x.fecha === hoy);
    els.aviso.textContent = '';
    if (p.fecha === hoy) {
      els.aviso.hidden = true;
      return;
    }
    if (!delDia && p === partidas[partidas.length - 1]) {
      els.aviso.textContent = `Hoy no hay partida nueva. Aquí tienes la más reciente, del ${fechaCorta(p.fecha)}; no cuenta para la racha.`;
    } else {
      els.aviso.append(`Partida del archivo (${diaSemana(p.fecha)} ${fechaCorta(p.fecha)}). No cuenta para la racha. `);
      const enlace = crear('a', '', delDia ? 'Ir a la de hoy' : 'Ir a la más reciente');
      enlace.href = '#';
      enlace.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState(null, '', location.pathname + location.search);
        abrirSegunDireccion();
      });
      els.aviso.append(enlace);
    }
    els.aviso.hidden = false;
  }

  function crearCelda(c, contexto) {
    const celda = crear('button', 'celda');
    celda.type = 'button';
    celda.tabIndex = -1;
    celda.dataset.c = c;
    celda.dataset.contexto = contexto;
    celda.append(crear('span', 'num', c), crear('span', 'letra'));
    return celda;
  }

  function construirRejilla() {
    const { p } = juego;
    els.rejilla.textContent = '';
    let c = 0;
    for (const palabra of normalizar(p.frase).split(/[^A-ZÑ]+/).filter(Boolean)) {
      const caja = crear('div', 'palabra');
      for (let i = 0; i < palabra.length; i++) {
        c++;
        const celda = crearCelda(c, 'rejilla');
        celda.style.setProperty('--i', c);
        juego.celdasRejilla[c] = celda;
        caja.append(celda);
      }
      els.rejilla.append(caja);
    }
  }

  function cabecera(etiqueta, texto, largo, comoBoton) {
    const cab = crear(comoBoton ? 'button' : 'div', 'def-cab');
    if (comoBoton) cab.type = 'button';
    const cuerpo = crear('span', 'def-texto');
    cuerpo.append(`${texto} `, crear('span', 'def-largo', `(${largo})`));
    cab.append(crear('span', 'def-letra', etiqueta), cuerpo);
    return cab;
  }

  function construirDefiniciones() {
    const { p } = juego;

    els.oculta.textContent = '';
    els.oculta.append(cabecera('✦', `Palabra oculta: ${p.oculta.definicion}`, p.definiciones.length, false));
    const filaOculta = crear('div', 'def-celdas');
    p.definiciones.forEach((d, i) => {
      const celda = crear('span', 'celda fija');
      celda.append(crear('span', 'num', d.casillas[0]), crear('span', 'letra'));
      juego.celdasOculta[i] = celda;
      filaOculta.append(celda);
    });
    els.oculta.append(filaOculta);

    els.definiciones.textContent = '';
    p.definiciones.forEach((d, i) => {
      const item = crear('li', 'def');
      const cab = cabecera(etiquetaDef(i), d.definicion, d.casillas.length, true);
      cab.dataset.def = i;
      const fila = crear('div', 'def-celdas');
      for (const c of d.casillas) {
        const celda = crearCelda(c, 'def');
        juego.celdasDef[c] = celda;
        fila.append(celda);
      }
      item.append(cab, fila);
      juego.itemsDef[i] = item;
      els.definiciones.append(item);
    });
  }

  // ---------- Pintado ----------

  function defActiva() {
    return juego.defDe[juego.cursor.casilla];
  }

  function actualizar() {
    const { p, N, progreso, reveladas, marcadas, cursor } = juego;
    const terminada = progreso.terminada;
    const activa = defActiva();
    els.principal.classList.toggle('terminada', terminada);

    for (let c = 1; c <= N; c++) {
      const letra = progreso.letras[c] || '';
      const enDef = !terminada && juego.defDe[c] === activa;
      const etiqueta = `Casilla ${c}, ${letra || 'vacía'}${reveladas.has(c) ? ', revelada' : ''}${marcadas.has(c) ? ', incorrecta' : ''}`;
      for (const [celda, contexto] of [[juego.celdasRejilla[c], 'rejilla'], [juego.celdasDef[c], 'def']]) {
        celda.lastChild.textContent = letra;
        const esCursor = !terminada && c === cursor.casilla;
        celda.classList.toggle('activa', esCursor && cursor.modo === contexto);
        celda.classList.toggle('eco', esCursor && cursor.modo !== contexto);
        celda.classList.toggle('en-def', enDef);
        celda.classList.toggle('revelada', reveladas.has(c));
        celda.classList.toggle('error', marcadas.has(c));
        celda.setAttribute('aria-label', etiqueta);
      }
    }

    p.definiciones.forEach((d, i) => {
      const c = d.casillas[0];
      const celda = juego.celdasOculta[i];
      celda.lastChild.textContent = progreso.letras[c] || '';
      celda.classList.toggle('revelada', reveladas.has(c));
      const item = juego.itemsDef[i];
      item.classList.toggle('activa', !terminada && i === activa);
      item.classList.toggle('completa', d.casillas.every((x) => progreso.letras[x]));
    });

    const d = p.definiciones[activa];
    els.pista.textContent = '';
    if (terminada) {
      els.pista.textContent = '¡Resuelta! Vuelve mañana a por otra Tesela.';
    } else {
      els.pista.append(crear('b', '', etiquetaDef(activa)), ` · ${d.definicion} (${d.casillas.length})`);
    }

    els.comprobar.disabled = terminada;
    els.revelar.disabled = terminada;
    els.verResultado.hidden = !terminada;
    for (const tecla of els.teclado.querySelectorAll('button')) tecla.disabled = terminada;
  }

  function enfocarCursor() {
    const { cursor } = juego;
    const celda = cursor.modo === 'rejilla' ? juego.celdasRejilla[cursor.casilla] : juego.celdasDef[cursor.casilla];
    celda?.scrollIntoView({ block: 'nearest', behavior: reducirMovimiento.matches ? 'auto' : 'smooth' });
  }

  function guardar() {
    juego.progreso.reveladas = [...juego.reveladas];
    almacen.guardar(claveProgreso(juego.p.fecha), juego.progreso);
  }

  // ---------- Cursor y escritura ----------

  function ordenRejilla() {
    return Array.from({ length: juego.N }, (_, i) => i + 1);
  }

  function ordenActual() {
    const { cursor, p } = juego;
    return cursor.modo === 'rejilla' ? ordenRejilla() : p.definiciones[defActiva()].casillas;
  }

  const editable = (c) => !juego.reveladas.has(c);
  const vacia = (c) => !juego.progreso.letras[c];

  // Primer hueco del orden a partir de la posición `desde`; con `circular`, da la vuelta.
  function siguienteVacia(orden, desde, circular) {
    const tramo = circular ? [...orden.slice(desde), ...orden.slice(0, desde)] : orden.slice(desde);
    return tramo.find((c) => vacia(c) && editable(c)) || null;
  }

  function avanzar() {
    const orden = ordenActual();
    const i = orden.indexOf(juego.cursor.casilla);
    const hueco = siguienteVacia(orden, i + 1, true);
    if (hueco) juego.cursor.casilla = hueco;
    else if (i + 1 < orden.length) juego.cursor.casilla = orden[i + 1];
  }

  function escribir(letra) {
    if (!juego || juego.progreso.terminada) return;
    const c = juego.cursor.casilla;
    if (editable(c)) {
      juego.progreso.letras[c] = letra;
      juego.marcadas.delete(c);
    }
    avanzar();
    guardar();
    actualizar();
    enfocarCursor();
    comprobarFin();
  }

  function borrar() {
    if (!juego || juego.progreso.terminada) return;
    const { progreso, marcadas } = juego;
    const c = juego.cursor.casilla;
    if (!vacia(c) && editable(c)) {
      delete progreso.letras[c];
      marcadas.delete(c);
    } else {
      const orden = ordenActual();
      const i = orden.indexOf(c);
      const anterior = orden.slice(0, i).reverse().find(editable);
      if (anterior) {
        juego.cursor.casilla = anterior;
        delete progreso.letras[anterior];
        marcadas.delete(anterior);
      }
    }
    guardar();
    actualizar();
    enfocarCursor();
  }

  function mover(paso) {
    if (!juego || juego.progreso.terminada) return;
    const orden = ordenActual();
    const j = orden.indexOf(juego.cursor.casilla) + paso;
    if (j >= 0 && j < orden.length) juego.cursor.casilla = orden[j];
    actualizar();
    enfocarCursor();
  }

  function irADefinicion(i) {
    if (!juego || juego.progreso.terminada) return;
    const total = juego.p.definiciones.length;
    const casillas = juego.p.definiciones[(i + total) % total].casillas;
    juego.cursor = { modo: 'def', casilla: siguienteVacia(casillas, 0, false) || casillas[0] };
    actualizar();
    enfocarCursor();
  }

  function tocarCelda(evento) {
    const celda = evento.target.closest('.celda[data-c]');
    if (!celda || !juego || juego.progreso.terminada) return;
    juego.cursor = { modo: celda.dataset.contexto, casilla: Number(celda.dataset.c) };
    actualizar();
  }

  // ---------- Ayudas ----------

  function comprobar() {
    if (!juego || juego.progreso.terminada) return;
    const { progreso, solucion, marcadas } = juego;
    progreso.comprobaciones++;
    let malas = 0;
    for (const [c, letra] of Object.entries(progreso.letras)) {
      if (letra !== solucion[c]) {
        marcadas.add(Number(c));
        malas++;
      }
    }
    guardar();
    actualizar();
    tostar(malas ? `${plural(malas, 'letra incorrecta', 'letras incorrectas')}` : 'Todo correcto por ahora');
  }

  function revelar() {
    if (!juego || juego.progreso.terminada) return;
    const c = juego.cursor.casilla;
    if (!editable(c)) {
      tostar('Esa letra ya está revelada');
      return;
    }
    juego.progreso.letras[c] = juego.solucion[c];
    juego.reveladas.add(c);
    juego.marcadas.delete(c);
    avanzar();
    guardar();
    actualizar();
    enfocarCursor();
    comprobarFin();
  }

  // ---------- Fin de la partida ----------

  function comprobarFin() {
    const { N, progreso, solucion } = juego;
    let llenas = 0;
    let bien = 0;
    for (let c = 1; c <= N; c++) {
      if (progreso.letras[c]) llenas++;
      if (progreso.letras[c] === solucion[c]) bien++;
    }
    if (bien === N) {
      progreso.terminada = true;
      progreso.resueltaEl = fechaLocal();
      guardar();
      actualizar();
      setTimeout(mostrarFin, reducirMovimiento.matches ? 0 : 900);
    } else if (llenas === N) {
      tostar('La rejilla está llena, pero hay algún error');
    }
  }

  function textoResultado() {
    const { p, progreso, reveladas } = juego;
    return `Tesela nº ${p.numero} · ${fechaCorta(p.fecha)}\n✅ ${plural(progreso.comprobaciones, 'comprobación', 'comprobaciones')} · ${plural(reveladas.size, 'letra revelada', 'letras reveladas')}`;
  }

  function mostrarFin() {
    const { p } = juego;

    const cita = $('fin-cita');
    cita.textContent = '';
    p.cita_completa.split(' / ').forEach((verso, i) => {
      if (i) cita.append(document.createElement('br'));
      cita.append(verso);
    });

    const fuente = $('fin-fuente');
    fuente.textContent = '';
    fuente.append(crear('strong', '', p.autor), `, ${p.obra}`);

    const oculta = $('fin-oculta');
    oculta.textContent = '';
    oculta.append(crear('strong', '', p.oculta.palabra), ` · ${p.oculta.definicion}`);

    const lista = $('fin-respuestas');
    lista.textContent = '';
    for (const d of p.definiciones) {
      const li = crear('li');
      li.append(crear('strong', '', d.respuesta), ` · ${d.definicion}`);
      lista.append(li);
    }

    $('fin-resultado').value = textoResultado();
    const nota = $('fin-nota');
    nota.hidden = true;
    const contaba = p.fecha === hoy && juego.progreso.resueltaEl === p.fecha;
    if (!contaba) {
      nota.textContent = 'Esta partida no es la de hoy, así que no cuenta para la racha.';
      nota.hidden = false;
    }
    abrirDialogo('dlg-fin');
  }

  async function copiarResultado() {
    const area = $('fin-resultado');
    try {
      await navigator.clipboard.writeText(area.value);
      tostar('Resultado copiado');
    } catch {
      area.focus();
      area.select();
      tostar('Selecciona el texto y cópialo');
    }
  }

  // ---------- Estadísticas y archivo ----------

  function resueltaASuDia(fecha) {
    const pr = leerProgreso(fecha);
    return pr.terminada && pr.resueltaEl === fecha;
  }

  function estadisticas() {
    const resueltas = partidas.filter((p) => leerProgreso(p.fecha).terminada).length;

    // La racha sigue viva mientras no haya terminado el día de hoy.
    let dia = resueltaASuDia(hoy) ? hoy : sumarDias(hoy, -1);
    let actual = 0;
    while (resueltaASuDia(dia)) {
      actual++;
      dia = sumarDias(dia, -1);
    }

    let mejor = 0;
    let tramo = 0;
    let ultima = null;
    for (const p of partidas) {
      if (resueltaASuDia(p.fecha)) {
        tramo = ultima === sumarDias(p.fecha, -1) ? tramo + 1 : 1;
        ultima = p.fecha;
        mejor = Math.max(mejor, tramo);
      } else {
        tramo = 0;
        ultima = null;
      }
    }
    return { resueltas, actual, mejor };
  }

  function pintarEstadisticas() {
    const { resueltas, actual, mejor } = estadisticas();
    const cifras = $('cifras');
    cifras.textContent = '';
    for (const [n, texto] of [[resueltas, 'Resueltas'], [actual, 'Racha actual'], [mejor, 'Mejor racha']]) {
      const caja = crear('div');
      caja.append(crear('dt', '', texto), crear('dd', '', n));
      cifras.append(caja);
    }
  }

  function pintarArchivo() {
    const lista = $('lista-archivo');
    lista.textContent = '';
    for (const p of [...partidas].reverse()) {
      const pr = leerProgreso(p.fecha);
      const empezada = Object.keys(pr.letras).length > 0;
      const li = crear('li');
      const a = crear('a');
      a.href = `#${p.fecha}`;
      const nombre = crear('span', juego && juego.p === p ? 'actual' : '', `nº ${p.numero} · ${diaSemana(p.fecha)} ${fechaCorta(p.fecha)}`);
      const estado = crear('span', `estado${pr.terminada ? ' hecha' : ''}`, pr.terminada ? '✓ Resuelta' : empezada ? 'En curso' : 'Sin empezar');
      a.append(nombre, estado);
      a.addEventListener('click', () => $('dlg-archivo').close());
      li.append(a);
      lista.append(li);
    }
  }

  // ---------- Diálogos y avisos ----------

  function abrirDialogo(id) {
    const dlg = $(id);
    if (id === 'dlg-estadisticas') pintarEstadisticas();
    if (id === 'dlg-archivo') pintarArchivo();
    if (!dlg.open) dlg.showModal();
  }

  let temporizadorTostada;
  function tostar(texto) {
    els.tostada.textContent = texto;
    els.tostada.classList.add('visible');
    clearTimeout(temporizadorTostada);
    temporizadorTostada = setTimeout(() => els.tostada.classList.remove('visible'), 2200);
  }

  function mostrarVacio(texto) {
    juego = null;
    els.titulo.textContent = '';
    els.rejilla.textContent = '';
    els.oculta.textContent = '';
    els.definiciones.textContent = '';
    els.aviso.hidden = true;
    els.pista.textContent = '';
    els.rejilla.append(crear('p', 'vacio', texto));
    els.comprobar.disabled = true;
    els.revelar.disabled = true;
  }

  // ---------- Teclado ----------

  function construirTeclado() {
    FILAS_TECLADO.forEach((fila, n) => {
      const caja = crear('div', 'fila-teclas');
      for (const letra of fila) {
        const tecla = crear('button', 'tecla', letra);
        tecla.type = 'button';
        tecla.dataset.letra = letra;
        caja.append(tecla);
      }
      if (n === FILAS_TECLADO.length - 1) {
        const borrarTecla = crear('button', 'tecla tecla-borrar');
        borrarTecla.type = 'button';
        borrarTecla.dataset.borrar = '';
        borrarTecla.setAttribute('aria-label', 'Borrar');
        borrarTecla.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>';
        caja.append(borrarTecla);
      }
      els.teclado.append(caja);
    });

    els.teclado.addEventListener('click', (e) => {
      const tecla = e.target.closest('.tecla');
      if (!tecla) return;
      if ('borrar' in tecla.dataset) borrar();
      else escribir(tecla.dataset.letra);
    });
  }

  function teclaFisica(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest('textarea, input')) return;

    if (e.key.length === 1) {
      const letra = normalizar(e.key);
      if (/^[A-ZÑ]$/.test(letra)) {
        e.preventDefault();
        escribir(letra);
      }
      return;
    }
    const acciones = {
      Backspace: borrar,
      Delete: borrar,
      ArrowLeft: () => mover(-1),
      ArrowRight: () => mover(1),
      ArrowUp: () => irADefinicion(defActiva() - 1),
      ArrowDown: () => irADefinicion(defActiva() + 1),
    };
    if (acciones[e.key] && juego) {
      e.preventDefault();
      acciones[e.key]();
    }
  }

  // ---------- Arranque ----------

  function vigilarAlturaPanel() {
    const fijar = () => document.documentElement.style.setProperty('--panel-h', `${els.panel.offsetHeight}px`);
    fijar();
    if ('ResizeObserver' in window) new ResizeObserver(fijar).observe(els.panel);
  }

  function enlazarEventos() {
    els.rejilla.addEventListener('click', tocarCelda);
    els.definiciones.addEventListener('click', (e) => {
      const cab = e.target.closest('.def-cab[data-def]');
      if (cab) irADefinicion(Number(cab.dataset.def));
      else tocarCelda(e);
    });
    els.comprobar.addEventListener('click', comprobar);
    els.revelar.addEventListener('click', revelar);
    els.verResultado.addEventListener('click', mostrarFin);
    $('btn-def-anterior').addEventListener('click', () => juego && irADefinicion(defActiva() - 1));
    $('btn-def-siguiente').addEventListener('click', () => juego && irADefinicion(defActiva() + 1));
    $('btn-copiar').addEventListener('click', copiarResultado);
    for (const boton of document.querySelectorAll('[data-abre]')) {
      boton.addEventListener('click', () => abrirDialogo(boton.dataset.abre));
    }
    for (const dlg of document.querySelectorAll('dialog')) {
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    }
    document.addEventListener('keydown', teclaFisica);
    window.addEventListener('hashchange', abrirSegunDireccion);

    // Si la app queda abierta al cambiar de día, pasa a la partida nueva.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || fechaLocal() === hoy) return;
      hoy = fechaLocal();
      cargarPartidas().then(abrirSegunDireccion);
    });
  }

  async function cargarPartidas() {
    const respuesta = await fetch('data/tesela.json', { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const todas = await respuesta.json();
    // Nunca se ofrecen partidas de fechas futuras.
    partidas = todas.filter((p) => p.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async function iniciar() {
    construirTeclado();
    vigilarAlturaPanel();
    enlazarEventos();
    try {
      await cargarPartidas();
    } catch {
      mostrarVacio('No se han podido cargar las partidas. Comprueba la conexión y recarga la página.');
      return;
    }
    if (!partidas.length) {
      mostrarVacio('La primera Tesela llega pronto. ¡Vuelve mañana!');
      return;
    }
    abrirSegunDireccion();
    if (!almacen.leer(CLAVE_AYUDA_VISTA)) {
      almacen.guardar(CLAVE_AYUDA_VISTA, true);
      abrirDialogo('dlg-ayuda');
    }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  iniciar();
})();
