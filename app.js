/* ================================================================
   SmartRoad 2D — app.js (Refined v2)
   Grafika Komputer INF11114 · UMRAH
   ================================================================ */

const canvas = document.getElementById('mc');
const ctx    = canvas.getContext('2d');
const wrap   = document.getElementById('canvaswrap');

// ── WORLD CONSTANTS ───────────────────────────────────────────────
const COLS      = 8;
const ROWS      = 8;
const CELL      = 200;
const ROAD_W    = 38;
const SIDEWALK  = 8;
const MARGIN    = 110;
const WORLD     = MARGIN * 2 + (COLS - 1) * CELL;
const RB_R      = 44;

// ── STATE ─────────────────────────────────────────────────────────
let zoom = 1, panX = 0, panY = 0;
let isDrag = false, lastMX = 0, lastMY = 0;
let nodes = [], edges = [], edgeSet = new Set();
let roundaboutSet = new Set();
let buildings = [], streetTrees = [];
let startNode = 0, endNode = 0;
let pathNodes = [];
let vehicle = null;
let running = false;
let algoMode = 'bfs';

// ── UTILS ─────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const nid = (r, c) => r * COLS + c;
const lerp = (a, b, t) => a + (b - a) * t;
const ekey = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
const hasEdge = (a, b) => edgeSet.has(ekey(a, b));
function neighborIn(id, dr, dc) {
  const n = nodes[id];
  const nr = n.r + dr, nc = n.c + dc;
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return -1;
  const nb = nid(nr, nc);
  return hasEdge(id, nb) ? nb : -1;
}

function toast(msg, dur = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), dur);
}

function rrect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ── MAP GENERATION ────────────────────────────────────────────────
function generateMap() {
  nodes = []; edges = []; edgeSet = new Set();
  roundaboutSet = new Set();
  buildings = []; streetTrees = [];
  pathNodes = []; vehicle = null; running = false;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      nodes.push({ id: nid(r, c), x: MARGIN + c * CELL, y: MARGIN + r * CELL, r, c });

  const candidates = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 1; c++) candidates.push([nid(r, c), nid(r, c + 1)]);
  for (let r = 0; r < ROWS - 1; r++)
    for (let c = 0; c < COLS; c++) candidates.push([nid(r, c), nid(r + 1, c)]);

  const addEdge = (a, b) => {
    const k = ekey(a, b);
    if (edgeSet.has(k)) return false;
    edgeSet.add(k); edges.push([a, b]); return true;
  };

  const parent = nodes.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra === rb) return false; parent[ra] = rb; return true; };

  const shuffled = shuffle([...candidates]);
  for (const [a, b] of shuffled) if (union(a, b)) addEdge(a, b);

  const remaining = candidates.filter(([a, b]) => !hasEdge(a, b));
  shuffle(remaining);
  const extra = Math.floor(remaining.length * 0.35);
  for (let i = 0; i < extra; i++) addEdge(remaining[i][0], remaining[i][1]);

  const degree = new Array(nodes.length).fill(0);
  for (const [a, b] of edges) { degree[a]++; degree[b]++; }
  for (const n of nodes) {
    if (degree[n.id] >= 2) continue;
    const dirs = shuffle([[-1, 0], [1, 0], [0, -1], [0, 1]]);
    for (const [dr, dc] of dirs) {
      const nr = n.r + dr, nc = n.c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const nb = nid(nr, nc);
      if (addEdge(n.id, nb)) { degree[n.id]++; degree[nb]++; break; }
    }
  }

  const inter = [];
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++) {
      const id = nid(r, c);
      if (degree[id] >= 3) inter.push({ id, r, c });
    }
  shuffle(inter);
  const picked = [];
  for (const cand of inter) {
    if (picked.length >= 6) break;
    const tooClose = picked.some(p => Math.abs(p.r - cand.r) + Math.abs(p.c - cand.c) < 3);
    if (!tooClose) picked.push(cand);
  }
  roundaboutSet = new Set(picked.map(p => p.id));

  placeCityBlocks();
  placeStreetTrees();
  randomizePositions();

  document.getElementById('lbl-nodes').textContent = nodes.length;
  document.getElementById('lbl-edges').textContent = edges.length;
  document.getElementById('lbl-bldg').textContent  = buildings.length;
  toast('🗺️ Peta baru: ' + buildings.length + ' gedung · ' + roundaboutSet.size + ' bundaran');
}

// ── CITY BLOCKS ───────────────────────────────────────────────────
function placeCityBlocks() {
  buildings = [];
  const TYPES = ['office', 'shop', 'apartment', 'house', 'warehouse'];
  const ROAD_HALF = ROAD_W / 2 + SIDEWALK;

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      let bx0 = MARGIN + c * CELL + ROAD_HALF + 4;
      let by0 = MARGIN + r * CELL + ROAD_HALF + 4;
      let bx1 = MARGIN + (c + 1) * CELL - ROAD_HALF - 4;
      let by1 = MARGIN + (r + 1) * CELL - ROAD_HALF - 4;

      const corners = [
        { id: nid(r, c),     cx: MARGIN + c * CELL,       cy: MARGIN + r * CELL },
        { id: nid(r, c+1),   cx: MARGIN + (c+1) * CELL,   cy: MARGIN + r * CELL },
        { id: nid(r+1, c),   cx: MARGIN + c * CELL,       cy: MARGIN + (r+1) * CELL },
        { id: nid(r+1, c+1), cx: MARGIN + (c+1) * CELL,   cy: MARGIN + (r+1) * CELL },
      ];
      const blocksNearRB = corners.filter(k => roundaboutSet.has(k.id));

      const bw = bx1 - bx0, bh = by1 - by0;
      if (bw < 30 || bh < 30) continue;

      const blockType = TYPES[Math.floor(Math.random() * TYPES.length)];
      placeBlockBuildings(bx0, by0, bw, bh, blockType, blocksNearRB);
    }
  }
}

function placeBlockBuildings(bx0, by0, bw, bh, blockType, rbCorners) {
  const TYPES = ['office', 'shop', 'apartment', 'house', 'warehouse'];
  const GAP = 5;
  const cols = Math.max(1, Math.floor(bw / 54));
  const rows = Math.max(1, Math.floor(bh / 48));
  const cw = (bw - (cols - 1) * GAP) / cols;
  const rh = (bh - (rows - 1) * GAP) / rows;

  for (let ri = 0; ri < rows; ri++) {
    for (let ci = 0; ci < cols; ci++) {
      const shrink = 2 + Math.random() * 6;
      const gx = bx0 + ci * (cw + GAP) + shrink / 2;
      const gy = by0 + ri * (rh + GAP) + shrink / 2;
      const gw = cw - shrink;
      const gh = rh - shrink;
      if (gw < 14 || gh < 14) continue;

      let collides = false;
      for (const k of rbCorners) {
        const closestX = Math.max(gx, Math.min(k.cx, gx + gw));
        const closestY = Math.max(gy, Math.min(k.cy, gy + gh));
        const ddx = closestX - k.cx, ddy = closestY - k.cy;
        if (ddx * ddx + ddy * ddy < (RB_R + 6) * (RB_R + 6)) { collides = true; break; }
      }
      if (collides) continue;

      const t = Math.random() < 0.7 ? blockType : TYPES[Math.floor(Math.random() * TYPES.length)];
      buildings.push({ x: gx, y: gy, w: gw, h: gh, type: t, seed: Math.random() });
    }
  }
}

// ── TREES ─────────────────────────────────────────────────────────
function placeStreetTrees() {
  streetTrees = [];
  const D = ROAD_W / 2 + SIDEWALK / 2 + 2;
  const skipNearRB = (x, y) => {
    for (const id of roundaboutSet) {
      const n = nodes[id];
      if (Math.hypot(x - n.x, y - n.y) < RB_R + 14) return true;
    }
    return false;
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      if (!hasEdge(nid(r, c), nid(r, c + 1))) continue;
      const x1 = MARGIN + c * CELL + 32, x2 = MARGIN + (c + 1) * CELL - 32;
      const y  = MARGIN + r * CELL;
      const n = Math.max(2, Math.floor((x2 - x1) / 55));
      for (let i = 0; i <= n; i++) {
        const tx = lerp(x1, x2, i / n);
        for (const side of [-1, 1]) {
          const ty = y + side * D;
          if (skipNearRB(tx, ty)) continue;
          streetTrees.push({ x: tx, y: ty, r: 5 + Math.random() * 2.5, g: Math.random() });
        }
      }
    }
  }
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!hasEdge(nid(r, c), nid(r + 1, c))) continue;
      const y1 = MARGIN + r * CELL + 32, y2 = MARGIN + (r + 1) * CELL - 32;
      const x  = MARGIN + c * CELL;
      const n = Math.max(2, Math.floor((y2 - y1) / 55));
      for (let i = 0; i <= n; i++) {
        const ty = lerp(y1, y2, i / n);
        for (const side of [-1, 1]) {
          const tx = x + side * D;
          if (skipNearRB(tx, ty)) continue;
          streetTrees.push({ x: tx, y: ty, r: 5 + Math.random() * 2.5, g: Math.random() });
        }
      }
    }
  }
}

// ── GRAPH ─────────────────────────────────────────────────────────
function buildAdj() {
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return adj;
}
function bfs(start, end) {
  const adj = buildAdj();
  const q = [[start]]; const vis = new Set([start]);
  while (q.length) {
    const path = q.shift(); const cur = path[path.length - 1];
    if (cur === end) return path;
    for (const nb of adj[cur] || []) if (!vis.has(nb)) { vis.add(nb); q.push([...path, nb]); }
  }
  return [start, end];
}
function dfs(start, end) {
  const adj = buildAdj(); const vis = new Set(); let res = null;
  (function go(cur, path) {
    if (res) return;
    vis.add(cur);
    if (cur === end) { res = [...path]; return; }
    for (const nb of shuffle([...(adj[cur] || [])]))
      if (!vis.has(nb)) go(nb, [...path, nb]);
  })(start, [start]);
  return res || [start, end];
}

// ── POSITIONS ─────────────────────────────────────────────────────
function randomizePositions() {
  const ids = nodes.map(n => n.id).filter(id => !roundaboutSet.has(id));
  shuffle(ids);
  startNode = ids[0];
  const adj = buildAdj();
  const dist = new Map(); dist.set(startNode, 0);
  const q = [startNode];
  while (q.length) {
    const cur = q.shift();
    for (const nb of adj[cur] || []) {
      if (!dist.has(nb)) { dist.set(nb, dist.get(cur) + 1); q.push(nb); }
    }
  }
  let best = ids[ids.length - 1], bestD = -1;
  for (const id of ids) {
    if (id === startNode) continue;
    const d = dist.get(id) ?? -1;
    if (d > bestD) { bestD = d; best = id; }
  }
  endNode = best;
  pathNodes = []; vehicle = null; running = false;
  document.getElementById('lbl-status').textContent = 'Posisi diacak';
  document.getElementById('lbl-path').textContent   = '—';
  toast('📍 Start & Tujuan diacak');
}

// ── ANIMATION (waypoints with rounded corners) ────────────────────
function buildWaypoints(path) {
  const TURN_R = 22;
  const RB_LANE = RB_R - 10;
  const pts = path.map(id => ({ x: nodes[id].x, y: nodes[id].y, id }));
  const wpts = [];

  const pushSeg = (ax, ay, bx, by) => {
    const L = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(2, Math.floor(L / 4));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      wpts.push({ x: lerp(ax, bx, t), y: lerp(ay, by, t) });
    }
  };
  const pushArc = (cx, cy, r, a0, a1, dir) => {
    let da = a1 - a0;
    if (dir > 0) { while (da <= 0) da += Math.PI * 2; }
    else if (dir < 0) { while (da >= 0) da -= Math.PI * 2; }
    else { while (da >  Math.PI) da -= Math.PI * 2;
           while (da < -Math.PI) da += Math.PI * 2; }
    const steps = Math.max(6, Math.floor(Math.abs(da) * r / 4));
    for (let i = 1; i <= steps; i++) {
      const a = a0 + da * (i / steps);
      wpts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };

  let cursor = { x: pts[0].x, y: pts[0].y };
  wpts.push({ ...cursor });

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;

    const padA = roundaboutSet.has(a.id) ? RB_R : (i === 0 ? 0 : TURN_R);
    let padB;
    if (roundaboutSet.has(b.id)) padB = RB_R;
    else if (i === pts.length - 2) padB = 0;
    else padB = TURN_R;

    const ex = b.x - ux * padB, ey = b.y - uy * padB;
    if (L - padA - padB > 1) pushSeg(cursor.x, cursor.y, ex, ey);
    cursor = { x: ex, y: ey };

    if (i === pts.length - 2) break;

    const c = pts[i + 2];
    const outDx = c.x - b.x, outDy = c.y - b.y;
    const outL = Math.hypot(outDx, outDy);
    const ox = outDx / outL, oy = outDy / outL;

    if (roundaboutSet.has(b.id)) {
      const entry = { x: b.x - ux * RB_LANE, y: b.y - uy * RB_LANE };
      const exit  = { x: b.x + ox * RB_LANE, y: b.y + oy * RB_LANE };
      pushSeg(cursor.x, cursor.y, entry.x, entry.y);
      const a0 = Math.atan2(entry.y - b.y, entry.x - b.x);
      const a1 = Math.atan2(exit.y  - b.y, exit.x  - b.x);
      pushArc(b.x, b.y, RB_LANE, a0, a1, +1);
      cursor = { ...exit };
    } else {
      const cross = ux * oy - uy * ox;
      if (Math.abs(cross) < 1e-3) continue;
      const startArc = { x: b.x - ux * TURN_R, y: b.y - uy * TURN_R };
      const endArc   = { x: b.x + ox * TURN_R, y: b.y + oy * TURN_R };
      const dir = cross > 0 ? 1 : -1;
      const perpX = -uy * TURN_R * dir, perpY = ux * TURN_R * dir;
      const cx = startArc.x + perpX, cy = startArc.y + perpY;
      const a0 = Math.atan2(startArc.y - cy, startArc.x - cx);
      const a1 = Math.atan2(endArc.y   - cy, endArc.x   - cx);
      pushArc(cx, cy, TURN_R, a0, a1, 0);
      cursor = { ...endArc };
    }
  }
  return wpts;
}

function startAnimation() {
  const algo = document.getElementById('algo-select').value;
  algoMode = algo;
  document.getElementById('lbl-algo').textContent = algo.toUpperCase();
  pathNodes = algo === 'bfs' ? bfs(startNode, endNode) : dfs(startNode, endNode);
  document.getElementById('lbl-path').textContent = pathNodes.length + ' node';
  if (pathNodes.length < 2) { toast('⚠️ Jalur tidak ditemukan!'); return; }

  const wpts = buildWaypoints(pathNodes);
  vehicle = { wpts, idx: 0, x: wpts[0].x, y: wpts[0].y, angle: 0 };
  if (wpts.length > 1) vehicle.angle = Math.atan2(wpts[1].y - wpts[0].y, wpts[1].x - wpts[0].x);
  running = true;
  document.getElementById('lbl-status').textContent = '▶ Berjalan (' + algo.toUpperCase() + ')';
  toast('▶ Kendaraan mulai — ' + algo.toUpperCase());
}

function updateVehicle() {
  if (!vehicle || !running) return;
  const { wpts } = vehicle;
  if (vehicle.idx >= wpts.length - 1) {
    running = false;
    document.getElementById('lbl-status').textContent = '✅ Tiba di tujuan!';
    toast('🎉 Tiba di tujuan!', 3000);
    return;
  }
  const SPEED = 2.6;
  const tgt = wpts[vehicle.idx + 1];
  const dx = tgt.x - vehicle.x, dy = tgt.y - vehicle.y;
  const dist = Math.hypot(dx, dy);
  if (dist < SPEED) {
    vehicle.x = tgt.x; vehicle.y = tgt.y; vehicle.idx++;
  } else {
    const targetAngle = Math.atan2(dy, dx);
    let da = targetAngle - vehicle.angle;
    while (da >  Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    vehicle.angle += da * 0.25;
    vehicle.x += dx / dist * SPEED;
    vehicle.y += dy / dist * SPEED;
  }
}

// ── DRAWING ───────────────────────────────────────────────────────
function drawScene() {
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  drawBackground();
  drawRoads();
  drawCrosswalks();
  drawRoundabouts();
  drawStreetTrees();
  drawBuildings();
  drawPath();
  drawNodes();
  drawVehicle();

  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = '#dfe5d8';
  ctx.fillRect(0, 0, WORLD, WORLD);

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const x = MARGIN + c * CELL + ROAD_W / 2;
      const y = MARGIN + r * CELL + ROAD_W / 2;
      const w = CELL - ROAD_W;
      const h = CELL - ROAD_W;
      const tint = ((r * 7 + c * 11) % 6) - 3;
      ctx.fillStyle = `hsl(${88 + tint}, 22%, ${82 + tint}%)`;
      ctx.fillRect(x, y, w, h);
    }
  }

  ctx.strokeStyle = '#c2c8b8';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, WORLD - 4, WORLD - 4);
}

function drawRoads() {
  ctx.save();
  ctx.lineCap = 'butt';

  const drawLine = (x1, y1, x2, y2) => {
    ctx.strokeStyle = '#bcc3b5';
    ctx.lineWidth = ROAD_W + SIDEWALK * 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#3a4250';
    ctx.lineWidth = ROAD_W;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#454e5e';
    ctx.lineWidth = ROAD_W - 6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };

  for (const [a, b] of edges) {
    const na = nodes[a], nb = nodes[b];
    drawLine(na.x, na.y, nb.x, nb.y);
  }

  ctx.strokeStyle = '#f5b042';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([14, 10]);
  const PAD = ROAD_W / 2 + 8;
  for (const [a, b] of edges) {
    const na = nodes[a], nb = nodes[b];
    const dx = nb.x - na.x, dy = nb.y - na.y;
    const L = Math.hypot(dx, dy);
    const padA = roundaboutSet.has(a) ? RB_R + 4 : PAD;
    const padB = roundaboutSet.has(b) ? RB_R + 4 : PAD;
    if (L - padA - padB < 10) continue;
    const ux = dx / L, uy = dy / L;
    const sx = na.x + ux * padA, sy = na.y + uy * padA;
    const ex = nb.x - ux * padB, ey = nb.y - uy * padB;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCrosswalks() {
  ctx.save();
  ctx.fillStyle = '#e8ebe2';
  for (const n of nodes) {
    if (roundaboutSet.has(n.id)) continue;
    const off = ROAD_W / 2 + 1;
    const stripeLen = 9, stripeW = 3, gap = 3;
    const span = ROAD_W - 8;
    const stripes = Math.floor(span / (stripeW + gap));
    if (neighborIn(n.id, 0, -1) >= 0) {
      for (let s = 0; s < stripes; s++) {
        const t = -span / 2 + s * (stripeW + gap);
        ctx.fillRect(n.x - off - stripeLen, n.y + t, stripeLen, stripeW);
      }
    }
    if (neighborIn(n.id, 0, 1) >= 0) {
      for (let s = 0; s < stripes; s++) {
        const t = -span / 2 + s * (stripeW + gap);
        ctx.fillRect(n.x + off, n.y + t, stripeLen, stripeW);
      }
    }
    if (neighborIn(n.id, -1, 0) >= 0) {
      for (let s = 0; s < stripes; s++) {
        const t = -span / 2 + s * (stripeW + gap);
        ctx.fillRect(n.x + t, n.y - off - stripeLen, stripeW, stripeLen);
      }
    }
    if (neighborIn(n.id, 1, 0) >= 0) {
      for (let s = 0; s < stripes; s++) {
        const t = -span / 2 + s * (stripeW + gap);
        ctx.fillRect(n.x + t, n.y + off, stripeW, stripeLen);
      }
    }
  }
  ctx.restore();
}

function drawRoundabouts() {
  for (const id of roundaboutSet) {
    const n = nodes[id];
    ctx.fillStyle = '#bcc3b5';
    ctx.beginPath(); ctx.arc(n.x, n.y, RB_R + SIDEWALK, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a4250';
    ctx.beginPath(); ctx.arc(n.x, n.y, RB_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5b042'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(n.x, n.y, RB_R - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7cb97c';
    ctx.beginPath(); ctx.arc(n.x, n.y, RB_R - 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a7c4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(n.x, n.y, RB_R - 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f5b042';
    ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fill();
  }
}

const BLDG_PALETTES = {
  office:    { wall: '#6fa8dc', roof: '#3d6fa3', win: '#cfe3f5', door: '#284a6e' },
  shop:      { wall: '#e07b6e', roof: '#a64a3f', win: '#fbe2c4', door: '#6b2a22' },
  apartment: { wall: '#9bbf7a', roof: '#5d8a45', win: '#e2f0d2', door: '#3a5524' },
  house:     { wall: '#e0b97a', roof: '#a8742f', win: '#f6dfb1', door: '#6c4218' },
  warehouse: { wall: '#a8a8a8', roof: '#666', win: '#d8d8d8', door: '#444' },
};

function drawBuildings() {
  for (const b of buildings) {
    const p = BLDG_PALETTES[b.type];
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    rrect(b.x + 3, b.y + 4, b.w, b.h, 3); ctx.fill();
    ctx.fillStyle = p.wall;
    rrect(b.x, b.y, b.w, b.h, 3); ctx.fill();
    ctx.fillStyle = p.roof;
    rrect(b.x, b.y, b.w, Math.min(8, b.h * 0.28), 3); ctx.fill();
    ctx.fillStyle = p.win;
    const floors = Math.max(1, Math.floor(b.h / 18));
    const ww = Math.max(4, b.w * 0.18);
    const wh = Math.max(4, b.h * 0.12);
    const cols = Math.max(1, Math.floor((b.w - 8) / (ww + 4)));
    for (let ri = 0; ri < floors; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        const wx = b.x + 4 + ci * (ww + 4);
        const wy = b.y + 11 + ri * (wh + 4);
        if (wx + ww < b.x + b.w - 2 && wy + wh < b.y + b.h - 6) ctx.fillRect(wx, wy, ww, wh);
      }
    }
    if (b.w > 22 && b.h > 22) {
      const dw = Math.max(5, b.w * 0.18), dh = Math.max(6, b.h * 0.18);
      ctx.fillStyle = p.door;
      ctx.fillRect(b.x + b.w / 2 - dw / 2, b.y + b.h - dh, dw, dh);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    rrect(b.x, b.y, b.w, b.h, 3); ctx.stroke();
  }
}

function drawStreetTrees() {
  for (const t of streetTrees) {
    const g = Math.floor(t.g * 35);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(t.x + 1, t.y + 1.5, t.r, t.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgb(${52 + g}, ${110 + g}, ${60 + g})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgb(${80 + g}, ${150 + g}, ${88 + g})`;
    ctx.beginPath(); ctx.arc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPath() {
  if (pathNodes.length < 2 || !vehicle) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(245,176,66,0.35)';
  ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(vehicle.wpts[0].x, vehicle.wpts[0].y);
  for (let i = 1; i < vehicle.wpts.length; i++) ctx.lineTo(vehicle.wpts[i].x, vehicle.wpts[i].y);
  ctx.stroke();

  ctx.strokeStyle = '#f5b042';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.shadowColor = '#f5b042'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(vehicle.wpts[0].x, vehicle.wpts[0].y);
  for (let i = 1; i < vehicle.wpts.length; i++) ctx.lineTo(vehicle.wpts[i].x, vehicle.wpts[i].y);
  ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawNodes() {
  for (const n of nodes) {
    if (roundaboutSet.has(n.id)) continue;
    if (n.id === startNode) drawMarker(n.x, n.y, '#e63946', 'S');
    else if (n.id === endNode) drawMarker(n.x, n.y, '#2dc653', 'T');
  }
}
function drawMarker(x, y, color, label) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawVehicle() {
  if (!vehicle) return;
  const { x, y, angle } = vehicle;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 4, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5b042';
  rrect(-13, -7, 26, 14, 4); ctx.fill();
  ctx.fillStyle = '#d8941f';
  rrect(5, -6, 8, 12, 3); ctx.fill();
  ctx.fillStyle = '#3a5a7a';
  ctx.fillRect(-3, -5, 7, 4);
  ctx.fillRect(-3, 1, 7, 4);
  ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1.2;
  rrect(-13, -7, 26, 14, 4); ctx.stroke();
  ctx.fillStyle = '#111';
  for (const [wx, wy] of [[-8,-9],[-8,9],[6,-9],[6,9]]) {
    ctx.beginPath(); ctx.ellipse(wx, wy > 0 ? wy - 1 : wy + 1, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#fffbe0';
  ctx.shadowColor = '#fffbe0'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(13, -4.5, 2.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(13,  4.5, 2.2, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e63946';
  ctx.beginPath(); ctx.arc(-13, -4, 1.8, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-13,  4, 1.8, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── LOOP ──────────────────────────────────────────────────────────
function loop() { updateVehicle(); drawScene(); requestAnimationFrame(loop); }

// ── INPUT ─────────────────────────────────────────────────────────
wrap.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 0.9;
  const rect = wrap.getBoundingClientRect();
  const mx = (e.clientX - rect.left - panX) / zoom;
  const my = (e.clientY - rect.top  - panY) / zoom;
  zoom = Math.max(0.2, Math.min(6, zoom * factor));
  panX = e.clientX - rect.left - mx * zoom;
  panY = e.clientY - rect.top  - my * zoom;
  document.getElementById('lbl-zoom').textContent = Math.round(zoom * 100) + '%';
}, { passive: false });

wrap.addEventListener('mousedown', (e) => { isDrag = true; lastMX = e.clientX; lastMY = e.clientY; });
window.addEventListener('mousemove', (e) => {
  if (!isDrag) return;
  panX += e.clientX - lastMX; panY += e.clientY - lastMY;
  lastMX = e.clientX; lastMY = e.clientY;
});
window.addEventListener('mouseup', () => isDrag = false);

wrap.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) { isDrag = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; }
}, { passive: true });
wrap.addEventListener('touchmove', (e) => {
  if (!isDrag || e.touches.length !== 1) return;
  panX += e.touches[0].clientX - lastMX; panY += e.touches[0].clientY - lastMY;
  lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY;
}, { passive: true });
wrap.addEventListener('touchend', () => isDrag = false);

// ── BUTTONS ───────────────────────────────────────────────────────
document.getElementById('btn-start').onclick = () => {
  if (!running) startAnimation();
  else { running = true; document.getElementById('lbl-status').textContent = '▶ Berjalan...'; }
};
document.getElementById('btn-pause').onclick = () => {
  if (!vehicle) return;
  running = !running;
  document.getElementById('lbl-status').textContent = running ? '▶ Berjalan...' : '⏸ Dijeda';
  toast(running ? '▶ Dilanjutkan' : '⏸ Dijeda');
};
document.getElementById('btn-randmap').onclick = generateMap;
document.getElementById('btn-randpos').onclick = randomizePositions;
document.getElementById('btn-zm').onclick = () => {
  zoom = Math.min(6, zoom * 1.2);
  document.getElementById('lbl-zoom').textContent = Math.round(zoom * 100) + '%';
};
document.getElementById('btn-zo').onclick = () => {
  zoom = Math.max(0.2, zoom / 1.2);
  document.getElementById('lbl-zoom').textContent = Math.round(zoom * 100) + '%';
};
document.getElementById('btn-reset').onclick = () => { centerView(); toast('⌖ View direset'); };
document.getElementById('btn-up').onclick    = () => panY += 80;
document.getElementById('btn-down').onclick  = () => panY -= 80;
document.getElementById('btn-left').onclick  = () => panX += 80;
document.getElementById('btn-right').onclick = () => panX -= 80;

window.addEventListener('keydown', (e) => {
  const step = 70;
  if      (e.key === 'ArrowUp')    panY += step;
  else if (e.key === 'ArrowDown')  panY -= step;
  else if (e.key === 'ArrowLeft')  panX += step;
  else if (e.key === 'ArrowRight') panX -= step;
  else if (e.key === '+' || e.key === '=') { zoom = Math.min(6, zoom * 1.1); document.getElementById('lbl-zoom').textContent = Math.round(zoom * 100) + '%'; }
  else if (e.key === '-') { zoom = Math.max(0.2, zoom / 1.1); document.getElementById('lbl-zoom').textContent = Math.round(zoom * 100) + '%'; }
  else if (e.key === ' ') { e.preventDefault(); document.getElementById('btn-start').click(); }
});

document.getElementById('algo-select').addEventListener('change', (e) => {
  document.getElementById('lbl-algo').textContent = e.target.value.toUpperCase();
});

// ── INIT ──────────────────────────────────────────────────────────
function centerView() {
  const rect = wrap.getBoundingClientRect();
  zoom = Math.min(rect.width, rect.height) / (WORLD + 60);
  panX = (rect.width  - WORLD * zoom) / 2;
  panY = (rect.height - WORLD * zoom) / 2;
  document.getElementById('lbl-zoom').textContent = Math.round(zoom * 100) + '%';
}
generateMap();
centerView();
loop();
