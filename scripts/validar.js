#!/usr/bin/env node
// Valida data/tesela.json: las cinco pruebas obligatorias y algunos avisos de estilo.
'use strict';

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', 'data', 'tesela.json');

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

function contar(letras) {
  const cuenta = new Map();
  for (const l of letras) cuenta.set(l, (cuenta.get(l) || 0) + 1);
  return cuenta;
}

function siguienteDia(fecha) {
  const d = new Date(fecha + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function validarPartida(p) {
  const errores = [];
  const avisos = [];
  const rejilla = letrasDe(p.frase);
  const N = rejilla.length;

  if (N !== p.letras) errores.push(`la frase tiene ${N} letras, pero "letras" dice ${p.letras}`);

  // 1. Las letras de las respuestas suman exactamente las de la frase.
  const deRespuestas = contar(p.definiciones.flatMap((d) => letrasDe(d.respuesta)));
  const deFrase = contar(rejilla);
  const todas = new Set([...deRespuestas.keys(), ...deFrase.keys()]);
  const diferencias = [];
  for (const l of [...todas].sort()) {
    const r = deRespuestas.get(l) || 0;
    const f = deFrase.get(l) || 0;
    if (r !== f) diferencias.push(`${l}: respuestas ${r}, frase ${f}`);
  }
  if (diferencias.length) errores.push(`[1] las letras no cuadran (${diferencias.join('; ')})`);

  // 2. Las casillas cubren de 1 a N sin repetirse.
  const vistas = new Map();
  for (const d of p.definiciones) {
    for (const c of d.casillas) {
      if (!Number.isInteger(c) || c < 1 || c > N) errores.push(`[2] ${d.respuesta}: casilla ${c} fuera de 1..${N}`);
      else if (vistas.has(c)) errores.push(`[2] casilla ${c} repetida en ${vistas.get(c)} y ${d.respuesta}`);
      else vistas.set(c, d.respuesta);
    }
  }
  for (let c = 1; c <= N; c++) {
    if (!vistas.has(c)) errores.push(`[2] la casilla ${c} no pertenece a ninguna definición`);
  }

  // 3. Cada letra de la respuesta coincide con la de la frase en su casilla.
  for (const d of p.definiciones) {
    const letras = letrasDe(d.respuesta);
    if (letras.length !== d.casillas.length) {
      errores.push(`[3] ${d.respuesta}: ${letras.length} letras y ${d.casillas.length} casillas`);
      continue;
    }
    letras.forEach((l, i) => {
      const c = d.casillas[i];
      if (rejilla[c - 1] !== undefined && rejilla[c - 1] !== l) {
        errores.push(`[3] ${d.respuesta}: la letra ${i + 1} (${l}) va a la casilla ${c}, que es ${rejilla[c - 1]}`);
      }
    });
  }

  // 4. Las iniciales forman la palabra oculta.
  const iniciales = p.definiciones.map((d) => letrasDe(d.respuesta)[0]).join('');
  if (iniciales !== normalizar(p.oculta.palabra)) {
    errores.push(`[4] las iniciales forman ${iniciales}, no ${p.oculta.palabra}`);
  }

  // Avisos de las normas de creación (sección 5); no hacen fallar la prueba.
  if (N < 20 || N > 45) avisos.push(`la frase tiene ${N} letras (se recomiendan 20–45)`);
  if (p.definiciones.length < 4 || p.definiciones.length > 7) {
    avisos.push(`hay ${p.definiciones.length} definiciones (se recomiendan 4–7)`);
  }
  const palabrasFrase = new Set(normalizar(p.frase).split(/[^A-ZÑ]+/).filter(Boolean));
  for (const d of p.definiciones) {
    const r = letrasDe(d.respuesta).join('');
    if (r.length < 4) avisos.push(`${d.respuesta} tiene menos de 4 letras`);
    if (palabrasFrase.has(r)) avisos.push(`${d.respuesta} repite una palabra de la frase`);
  }

  return { errores, avisos };
}

function main() {
  let partidas;
  try {
    partidas = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
  } catch (e) {
    console.error(`No se puede leer ${RUTA}: ${e.message}`);
    process.exit(1);
  }

  let fallos = 0;

  // 5. Fechas consecutivas y sin repetir (y números correlativos).
  partidas.forEach((p, i) => {
    if (i === 0) return;
    const anterior = partidas[i - 1];
    if (p.fecha !== siguienteDia(anterior.fecha)) {
      console.log(`✗ [5] nº ${p.numero}: la fecha ${p.fecha} no sigue a ${anterior.fecha}`);
      fallos++;
    }
    if (p.numero !== anterior.numero + 1) {
      console.log(`✗ nº ${p.numero}: el número no sigue a ${anterior.numero}`);
      fallos++;
    }
  });
  const fechas = partidas.map((p) => p.fecha);
  if (new Set(fechas).size !== fechas.length) {
    console.log('✗ [5] hay fechas repetidas');
    fallos++;
  }

  for (const p of partidas) {
    const { errores, avisos } = validarPartida(p);
    const marca = errores.length ? '✗' : '✓';
    console.log(`${marca} nº ${p.numero} · ${p.fecha} · ${p.oculta.palabra}`);
    for (const e of errores) console.log(`    error: ${e}`);
    for (const a of avisos) console.log(`    aviso: ${a}`);
    fallos += errores.length;
  }

  if (fallos) {
    console.log(`\n${fallos} error(es).`);
    process.exit(1);
  }
  console.log(`\nLas ${partidas.length} partidas pasan las cinco pruebas.`);
}

if (require.main === module) main();

module.exports = { normalizar, letrasDe, validarPartida };
