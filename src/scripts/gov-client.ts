/* Governance tab client: renders the 9 governing bodies as SVG org diagrams
   (no dependencies) plus a detail card per entity. Port of docs/js/govapp.js.
   Runs on astro:page-load; idempotent via the groups host's dataset.wired. */
import { el, div, showTip, hideTip, tipRow } from '../lib/chart-util';
import { GOV_GROUPS, type GovGroup, type GovMember } from '../lib/gov';

/* ---- org diagram: head box on top, members in rows, elbow connectors -- */
function renderOrgChart(container: HTMLElement, group: GovGroup): void {
  const members = group.members.filter(function (m) { return m.code !== group.head; });
  const headM = group.members.filter(function (m) { return m.code === group.head; })[0];

  const perRow = 4, BW = 216, BH = 46, GX = 14, GY = 34;
  const rows = Math.ceil(members.length / perRow);
  const W = perRow * BW + (perRow - 1) * GX + 16;
  const H = 8 + BH + GY + rows * (BH + GY) - GY + 14;
  const cx = W / 2;

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg org-chart',
    role: 'img', 'aria-label': 'Organization diagram: ' + group.name }, container);

  function box(x: number, y: number, m: GovMember, isHead?: boolean): SVGElement {
    const g = el('g', { class: 'org-box' + (isHead ? ' head' : ''), tabindex: 0 }, svg);
    el('rect', { x: x, y: y, width: BW, height: BH, rx: 8,
      fill: isHead ? group.color : 'var(--surface-1)',
      'fill-opacity': isHead ? 0.18 : 1,
      stroke: group.color, 'stroke-width': isHead ? 2 : 1.2 }, g);
    const t1 = el('text', { x: x + BW / 2, y: y + 19, class: 'org-code',
      'text-anchor': 'middle' }, g);
    t1.textContent = m.code;
    const t2 = el('text', { x: x + BW / 2, y: y + 35, class: 'org-name',
      'text-anchor': 'middle' }, g);
    t2.textContent = m.short.length > 30 ? m.short.slice(0, 29) + '…' : m.short;

    function tipIt(evt: PointerEvent): void {
      const boxEl = document.createElement('div');
      div('tip-head', boxEl).textContent = m.name;
      tipRow(boxEl, group.color, '', m.role, false);
      tipRow(boxEl, '', 'Led by', m.leader.split(';')[0], false);
      showTip(boxEl, evt.clientX, evt.clientY);
    }
    g.addEventListener('pointermove', tipIt as EventListener);
    g.addEventListener('pointerleave', hideTip);
    g.addEventListener('click', function () {
      const card = document.getElementById('gov-' + m.code);
      if (!card) return;
      const det = card.closest('details') as HTMLDetailsElement | null;
      if (det) det.open = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
      setTimeout(function () { card.classList.remove('flash'); }, 1600);
    });
    return g;
  }

  /* head */
  const headY = 8;
  if (headM) box(cx - BW / 2, headY, headM, true);

  /* trunk from head down to the last row's bus */
  const lastBusY = headY + BH + GY / 2 + (rows - 1) * (BH + GY);
  el('line', { x1: cx, y1: headY + BH, x2: cx, y2: lastBusY, class: 'org-line' }, svg);

  members.forEach(function (m, i) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = Math.min(perRow, members.length - row * perRow);
    const rowW = inRow * BW + (inRow - 1) * GX;
    const x = (W - rowW) / 2 + col * (BW + GX);
    const y = headY + BH + GY + row * (BH + GY);
    const busY = y - GY / 2;
    /* bus from trunk to this box's center, then drop */
    const bx = x + BW / 2;
    el('line', { x1: cx, y1: busY, x2: bx, y2: busY, class: 'org-line' }, svg);
    el('line', { x1: bx, y1: busY, x2: bx, y2: y, class: 'org-line' }, svg);
    box(x, y, m);
  });
}

/* ---- entity detail cards ---- */
function renderCards(container: HTMLElement, group: GovGroup): void {
  group.members.forEach(function (m) {
    const card = div('gov-card', container);
    card.id = 'gov-' + m.code;

    const head = div('gov-card-head', card);
    const sw = document.createElement('span');
    sw.className = 'legend-swatch'; sw.style.background = group.color;
    head.appendChild(sw);
    const nm = document.createElement('span');
    nm.className = 'gov-card-name';
    nm.textContent = m.name;
    head.appendChild(nm);
    const code = document.createElement('span');
    code.className = 'gov-card-code';
    code.textContent = m.code;
    head.appendChild(code);

    function line(label: string, text: string, cls?: string): void {
      const row = div('gov-line' + (cls ? ' ' + cls : ''), card);
      const b = document.createElement('b');
      b.textContent = label + ': ';
      row.appendChild(b);
      row.appendChild(document.createTextNode(text));
    }
    line('What it does', m.role);
    line('Why it exists', m.why);
    line('Replaces', m.replaces, /^New/.test(m.replaces) ? 'gov-new' : 'gov-replaces');
    line('Who runs it', m.leader);
  });
}

/* ---- summary tiles ---- */
function renderSummary(): void {
  const host = document.getElementById('gov-summary');
  if (!host) return;
  let total = 0, novel = 0, replacing = 0;
  GOV_GROUPS.forEach(function (g) {
    g.members.forEach(function (m) {
      total++;
      if (/^New/.test(m.replaces)) novel++; else replacing++;
    });
  });
  [
    { label: 'Governing bodies', value: '9',
      range: 'fiscal foundations, the operating department and its five administrations, independent oversight, transition, innovation' },
    { label: 'Entities in total', value: String(total),
      range: 'each with statutory duties, a named leadership position, and published metrics' },
    { label: 'Replace existing functions', value: String(replacing),
      range: 'absorbing work now done by insurers, PBMs, state offices, and federal agencies' },
    { label: 'Wholly new capabilities', value: String(novel),
      range: 'mostly transition protection, cyber-defense, AI accountability, and adaptation machinery' }
  ].forEach(function (it) {
    const tl = div('tile', host);
    div('label', tl).textContent = it.label;
    div('value', tl).textContent = it.value;
    div('range', tl).textContent = it.range;
  });
}

/* ---- build the whole view ---- */
function build(): void {
  renderSummary();
  const host = document.getElementById('gov-groups');
  if (!host) return;
  GOV_GROUPS.forEach(function (g) {
    const section = document.createElement('section');
    section.className = 'card';
    const h = document.createElement('h2');
    h.textContent = g.name;
    section.appendChild(h);
    const d = div('desc', section);
    d.textContent = g.desc;

    const diagram = div('org-wrap', section);
    renderOrgChart(diagram, g);

    const details = document.createElement('details');
    details.className = 'tableview';
    const sum = document.createElement('summary');
    sum.textContent = 'Entity detail: what each does, why, what it replaces, who runs it (' +
      g.members.length + ' entities)';
    details.appendChild(sum);
    const cardsHost = div('gov-cards', details);
    renderCards(cardsHost, g);
    section.appendChild(details);

    host.appendChild(section);
  });
}

function initGov(): void {
  const host = document.getElementById('gov-groups');
  if (!host) return; // not on the governance page
  if (host.dataset.wired === '1') return;
  host.dataset.wired = '1';
  build();
}

document.addEventListener('astro:page-load', initGov);
