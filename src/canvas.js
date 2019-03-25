// =============================================================================
// Boost.js | Canvas Drawing
// (c) Mathigon
// =============================================================================



export function drawCanvas(ctx, obj, options={}) {
  const type = obj.constructor.name;

  if (options.fill) ctx.fillStyle = options.fill;
  if (options.opacity) ctx.globalAlpha = options.opacity;

  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth || 1;
    if (options.lineCap) ctx.lineCap = options.lineCap;
    if (options.lineJoin) ctx.lineJoin = options.lineJoin;
  }

  ctx.beginPath();

  if (type ===  'Segment') {
    ctx.moveTo(obj.p1.x, obj.p1.y);
    ctx.lineTo(obj.p2.x, obj.p2.y);

  } else if (type ===  'Circle') {
    ctx.arc(obj.c.x, obj.c.y, obj.r, 0, 2 * Math.PI);

  } else if (type ===  'Polygon' || type ===  'Triangle') {
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (let p of obj.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();

  } else if (type ===  'Polyline') {
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (let p of obj.points.slice(1)) ctx.lineTo(p.x, p.y);
  }

  // TODO Support for Line, Ray, Arc, Sector, Angle and Rectangle objects

  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
}
