/* ============================================================
   PATHUTILS.JS — Utilidades compartidas para trabajar con los
   comandos de una ruta de opentype.js (glyph.getPath(...).commands)
   punto a punto, en lugar de como una cadena SVG opaca.

   Se usa desde la Fase 7 en adelante: para poder DEFORMAR el
   contorno de cada glifo (malla de puntos de control) hace falta
   acceso a las coordenadas reales de cada comando (M/L/C/Q/Z), no
   solo a un Path2D ya "sellado". renderer.js y curveSystem.js usan
   estas funciones para mapear cada punto de cada comando a través
   de una función arbitraria (una matriz, la malla de deformación,
   o ambas encadenadas) y reconstruir después un Path2D real.
   ============================================================ */

/**
 * Aplica `fn(x,y) -> {x,y}` a todas las coordenadas de un comando de
 * ruta (el punto final, y los puntos de control si es una curva),
 * devolviendo un nuevo comando del mismo tipo.
 */
function mapCommand(cmd, fn) {
  const out = { type: cmd.type };
  if (cmd.x !== undefined && cmd.y !== undefined) {
    const p = fn(cmd.x, cmd.y);
    out.x = p.x;
    out.y = p.y;
  }
  if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
    const p1 = fn(cmd.x1, cmd.y1);
    out.x1 = p1.x;
    out.y1 = p1.y;
  }
  if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
    const p2 = fn(cmd.x2, cmd.y2);
    out.x2 = p2.x;
    out.y2 = p2.y;
  }
  return out;
}

/** Añade una lista de comandos (M/L/C/Q/Z) a un Path2D ya existente. */
function appendCommandsToPath2D(path2d, commands) {
  for (const c of commands) {
    switch (c.type) {
      case 'M': path2d.moveTo(c.x, c.y); break;
      case 'L': path2d.lineTo(c.x, c.y); break;
      case 'C': path2d.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y); break;
      case 'Q': path2d.quadraticCurveTo(c.x1, c.y1, c.x, c.y); break;
      case 'Z': path2d.closePath(); break;
      default: break;
    }
  }
  return path2d;
}

window.PathUtils = { mapCommand, appendCommandsToPath2D };
