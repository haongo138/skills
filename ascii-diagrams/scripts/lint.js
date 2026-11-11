#!/usr/bin/env node
// Heuristic linter for ASCII / Unicode box diagrams. No dependencies.
//
// Usage:
//   node lint.js [--width N] [--unicode] [--all-fences] [file ...]   (stdin if no files)
//
// Input may be a plain diagram or Markdown; in Markdown only ```text / ```ascii / ```txt
// fences are checked (all fences with --all-fences). Exit code 1 when any ERROR is found.
//
// Checks: tabs, trailing spaces, width, non-ASCII (unless --unicode), wide glyphs,
// unclosed or misaligned boxes, dangling corners, floating arrowheads, isolated pipes.

'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
let width = 80, unicode = false, allFences = false;
const files = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--width') width = parseInt(args[++i], 10);
  else if (a === '--unicode') unicode = true;
  else if (a === '--all-fences') allFences = true;
  else if (a === '-h' || a === '--help') {
    console.log('usage: node lint.js [--width N] [--unicode] [--all-fences] [file ...]');
    process.exit(0);
  } else files.push(a);
}

// Box-drawing glyphs mapped to ASCII so one set of geometry checks covers both charsets.
const UNI = {
  '┌': '+', '┐': '+', '└': '+', '┘': '+', '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
  '╭': '+', '╮': '+', '╰': '+', '╯': '+', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
  '╠': '+', '╣': '+', '╦': '+', '╩': '+', '╬': '+',
  '─': '-', '━': '-', '═': '=', '│': '|', '┃': '|', '║': '|', '┆': ':', '┊': ':',
  '▶': '>', '►': '>', '→': '>', '◀': '<', '◄': '<', '←': '<',
  '▼': 'v', '↓': 'v', '▲': '^', '↑': '^',
};
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦\u{1F300}-\u{1FAFF}]/u;

const H = '-=';                  // horizontal line glyphs
const V = '|:';                  // vertical line glyphs
const BORDER = '-=+|v^.:';       // glyphs allowed inside a box's top/bottom border
const SIDE = '|+';               // glyphs allowed on a box's left/right side

let errors = 0, warnings = 0;
function report(level, where, line, col, msg) {
  if (level === 'ERROR') errors++; else warnings++;
  console.log(`${where}:${line}:${col}: ${level} ${msg}`);
}

function blocksOf(text) {
  const lines = text.split(/\r?\n/);
  const fenceRe = /^\s*(```+|~~~+)\s*([\w-]*)/;
  if (!lines.some(l => fenceRe.test(l))) return [{ start: 1, lines }];
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(fenceRe);
    if (!m) continue;
    const fence = m[1], info = m[2].toLowerCase();
    let j = i + 1;
    while (j < lines.length && !lines[j].trim().startsWith(fence)) j++;
    if (allFences || ['text', 'ascii', 'txt', 'diagram'].includes(info)) {
      out.push({ start: i + 2, lines: lines.slice(i + 1, j) });
    }
    i = j;
  }
  return out;
}

function lintBlock(where, block) {
  const raw = block.lines;
  // grid of single code points, Unicode box glyphs normalized
  const grid = raw.map(l => [...l].map(ch => UNI[ch] || ch));
  const at = (r, c) => (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length ? grid[r][c] : ' ');
  const L = r => block.start + r;

  raw.forEach((line, r) => {
    const cps = [...line];
    if (line.includes('\t')) report('ERROR', where, L(r), line.indexOf('\t') + 1, 'tab character (use spaces)');
    if (/[  ]+$/.test(line)) report('WARN', where, L(r), cps.length, 'trailing whitespace');
    if (cps.length > width) report('ERROR', where, L(r), width + 1, `line is ${cps.length} columns (> ${width})`);
    cps.forEach((ch, c) => {
      if (ch.charCodeAt(0) > 126 || ch.length > 1) {
        if (!unicode) report('ERROR', where, L(r), c + 1, `non-ASCII character '${ch}' (pass --unicode if intended)`);
        else if (WIDE.test(ch)) report('WARN', where, L(r), c + 1, `wide glyph '${ch}' breaks monospace alignment`);
      }
    });
  });

  // --- boxes: find top-left corners, walk the top edge, then both sides, then the bottom
  const seen = new Set();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (at(r, c) !== '+' || !H.includes(at(r, c + 1)) || !SIDE.includes(at(r + 1, c))) continue;
      if (H.includes(at(r, c - 1))) continue; // '+' in the middle of a line: junction, not a corner
      // walk right along the top edge; allow one embedded label like "-- Region a --" or "-[ alt ]-"
      let b = -1, k = c + 1;
      for (; k < grid[r].length; k++) {
        const ch = at(r, k);
        if (ch === '+' && SIDE.includes(at(r + 1, k))) { b = k; break; }
        if (BORDER.includes(ch)) continue;
        if (ch === '<' || ch === '>') break;       // an arrow, not a border
        if (H.includes(at(r, k - 1)) || at(r, k - 1) === ' ' || /[\[\]\w]/.test(at(r, k - 1))) continue; // label text
        break;
      }
      if (b < 0) {
        // top edge ends in a corner with no side under it while the row below holds a label: misaligned side
        const end = k - 1;
        if (end > c && at(r, end) === '+' && !BORDER.includes(at(r, end + 1)) &&
            /[A-Za-z0-9]/.test(grid[r + 1].slice(c + 1, end).join(''))) {
          report('ERROR', where, L(r + 1), end + 1, `box from line ${L(r)} cols ${c + 1}-${end + 1}: no right side under the top-right corner (found '${at(r + 1, end)}')`);
        }
        continue;
      }
      const key = `${r},${c},${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // walk down both sides until a row where both are '+' and the span is a border
      let closed = false, hasText = false;
      for (let k = r + 1; k < grid.length; k++) {
        const lc = at(k, c), rc = at(k, b);
        if (lc === '+' && rc === '+') {
          const span = grid[k].slice(c + 1, b).join('');
          if (/^[-=+|v^.: \[\]\w]*$/.test(span) && /[-=]/.test(span)) { closed = true; break; }
        }
        if (!SIDE.includes(lc) || !SIDE.includes(rc)) {
          // an empty "box" whose sides break is a fork/merge connector (e.g. +----+----+ over | | |)
          if (hasText) {
            const bad = !SIDE.includes(lc) ? c : b;
            report('ERROR', where, L(k), bad + 1,
              `box from line ${L(r)} cols ${c + 1}-${b + 1}: ${bad === c ? 'left' : 'right'} side broken (found '${at(k, bad)}')`);
          }
          closed = true;
          break;
        }
        if (/[A-Za-z0-9]/.test(grid[k].slice(c + 1, b).join(''))) hasText = true;
      }
      if (!closed && hasText) report('ERROR', where, L(r), c + 1, `box cols ${c + 1}-${b + 1} never closes`);
    }
  }

  // --- connectors
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = at(r, c);
      if (ch === '+') {
        // a '+' above/below counts only if it is itself part of a line (not "+ field" text)
        const linePlus = (rr, cc) => at(rr, cc) === '+' && ('-=<'.includes(at(rr, cc - 1)) || '-=>'.includes(at(rr, cc + 1)));
        let n = 0;
        if ('-=<'.includes(at(r, c - 1))) n++;
        if ('-=>'.includes(at(r, c + 1))) n++;
        if ('|:^v'.includes(at(r - 1, c)) || linePlus(r - 1, c)) n++;
        if ('|:v^'.includes(at(r + 1, c)) || linePlus(r + 1, c)) n++;
        if (n === 1) report('WARN', where, L(r), c + 1, "dangling '+' (corner/junction connects in only one direction - misaligned?)");
      } else if ((ch === 'v' || ch === '^') && at(r, c - 1) === ' ' && at(r, c + 1) === ' ') {
        const tail = ch === 'v' ? at(r - 1, c) : at(r + 1, c);
        if (tail === ' ') report('WARN', where, L(r), c + 1, `arrowhead '${ch}' has no line ${ch === 'v' ? 'above' : 'below'} it - misaligned connector?`);
      } else if (ch === '|') {
        // a connector with blank cells both above and below is floating (labels/text count as anchors)
        if (at(r - 1, c) === ' ' && at(r + 1, c) === ' ' && !H.includes(at(r, c - 1)) && !H.includes(at(r, c + 1)) &&
            at(r, c - 1) !== '<' && at(r, c + 1) !== '>') {
          report('WARN', where, L(r), c + 1, "isolated '|' (no line above or below) - misaligned connector?");
        }
      }
    }
  }
}

function lintText(where, text) {
  const blocks = blocksOf(text);
  if (blocks.length === 0) console.log(`${where}: no diagram blocks found (use a \`\`\`text fence or --all-fences)`);
  blocks.forEach(b => lintBlock(where, b));
}

if (files.length === 0) {
  lintText('<stdin>', fs.readFileSync(0, 'utf8'));
} else {
  for (const f of files) lintText(f, fs.readFileSync(f, 'utf8'));
}
console.log(`${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
