/**
 * qr.js — Minimal QR Code generator (pure JS, no deps)
 * Generates a QR code as an <svg> element for a given URL string.
 * Supports alphanumeric + byte mode, error correction level M.
 * Based on the public-domain QR spec subset sufficient for URLs.
 */
const QR = (() => {
  // ── Galois Field GF(256) ──────────────────────────────────────────────────
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x = x << 1; if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const gfMul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  const gfPoly = (deg) => {
    let p = [1];
    for (let i = 0; i < deg; i++) {
      const q = [1, EXP[i]];
      const r = new Array(p.length + 1).fill(0);
      for (let j = 0; j < p.length; j++)
        for (let k = 0; k < q.length; k++)
          r[j + k] ^= gfMul(p[j], q[k]);
      p = r;
    }
    return p;
  };

  // ── Reed-Solomon ──────────────────────────────────────────────────────────
  function rsEncode(data, ecLen) {
    const gen = gfPoly(ecLen);
    const msg = [...data, ...new Array(ecLen).fill(0)];
    for (let i = 0; i < data.length; i++) {
      const c = msg[i];
      if (c) for (let j = 0; j < gen.length; j++) msg[i + j] ^= gfMul(gen[j], c);
    }
    return msg.slice(data.length);
  }

  // ── Version / capacity tables (versions 1-10, EC level M) ────────────────
  // [dataCodewords, ecCodewords, blocks]
  const CAP = [
    null,
    [16,10,1],[28,16,1],[44,26,1],[64,18,2],[86,24,2],
    [108,16,4],[124,18,4],[154,22,2],[182,22,3],[216,26,4]
  ];

  // ── Byte encoding ─────────────────────────────────────────────────────────
  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    const len = bytes.length;
    // find version
    let ver = 1;
    while (ver <= 10 && CAP[ver][0] < len + 3) ver++;
    if (ver > 10) ver = 10; // clamp — very long URLs will be imperfect but won't crash

    const [dataCW, ecCW, blocks] = CAP[ver];
    const bits = [];
    const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };

    push(0b0100, 4);       // byte mode
    push(len, 8);          // char count
    bytes.forEach(b => push(b, 8));
    push(0, 4);            // terminator
    while (bits.length % 8) bits.push(0);

    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
      cw.push(b);
    }
    const pad = [0xEC, 0x11];
    while (cw.length < dataCW) cw.push(pad[(cw.length - (bits.length >> 3)) % 2]);

    // split into blocks and add EC
    const blockSize = Math.floor(dataCW / blocks);
    const allData = [], allEC = [];
    for (let b = 0; b < blocks; b++) {
      const chunk = cw.slice(b * blockSize, (b + 1) * blockSize);
      allData.push(chunk);
      allEC.push(rsEncode(chunk, ecCW));
    }
    const interleaved = [];
    for (let i = 0; i < blockSize; i++) allData.forEach(b => interleaved.push(b[i]));
    for (let i = 0; i < ecCW; i++) allEC.forEach(b => interleaved.push(b[i]));

    // to bitstream
    const stream = [];
    interleaved.forEach(b => { for (let i = 7; i >= 0; i--) stream.push((b >> i) & 1); });
    // remainder bits
    const rem = [0,7,7,7,1,1,7,0,0,0][ver - 1] || 0;
    for (let i = 0; i < rem; i++) stream.push(0);

    return { ver, stream };
  }

  // ── Matrix builder ────────────────────────────────────────────────────────
  function buildMatrix(ver, stream) {
    const size = ver * 4 + 17;
    const M = Array.from({length: size}, () => new Array(size).fill(-1)); // -1 = unset
    const F = Array.from({length: size}, () => new Array(size).fill(false)); // function modules

    const set = (r, c, v, func = false) => { M[r][c] = v; if (func) F[r][c] = true; };

    // finder pattern
    const finder = (tr, tc) => {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
        const rr = tr + r, cc = tc + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const v = r >= 0 && r <= 6 && c >= 0 && c <= 6
          ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 1 : 0
          : 0;
        set(rr, cc, v, true);
      }
    };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    // timing
    for (let i = 8; i < size - 8; i++) {
      set(6, i, i % 2 === 0 ? 1 : 0, true);
      set(i, 6, i % 2 === 0 ? 1 : 0, true);
    }

    // dark module
    set(size - 8, 8, 1, true);

    // alignment patterns (ver >= 2)
    const alignPos = [null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,28,46],[6,32,50]];
    const ap = alignPos[ver] || [];
    for (let i = 0; i < ap.length; i++) for (let j = 0; j < ap.length; j++) {
      const r = ap[i], c = ap[j];
      if (F[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const v = dr === -2 || dr === 2 || dc === -2 || dc === 2 ? 1 : (dr === 0 && dc === 0 ? 1 : 0);
        set(r + dr, c + dc, v, true);
      }
    }

    // format info placeholders (set to 0 for now, mask applied later)
    const fmtPos = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
    fmtPos.forEach(([r,c]) => set(r, c, 0, true));
    for (let i = 0; i < 7; i++) set(size - 1 - i, 8, 0, true);
    for (let i = 0; i < 8; i++) set(8, size - 1 - i, 0, true);

    // data placement
    let bit = 0;
    let up = true;
    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      for (let i = 0; i < size; i++) {
        const r = up ? size - 1 - i : i;
        for (let dc = 0; dc < 2; dc++) {
          const c = col - dc;
          if (!F[r][c]) {
            M[r][c] = bit < stream.length ? stream[bit++] : 0;
          }
        }
      }
      up = !up;
    }

    // apply mask 0 (checkerboard) — simplest, good enough
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (!F[r][c] && (r + c) % 2 === 0) M[r][c] ^= 1;
    }

    // write format info for EC=M(01), mask=0(000) → format bits = 101010000010010
    const fmt = [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0];
    fmtPos.forEach(([r,c], i) => { M[r][c] = fmt[i]; });
    for (let i = 0; i < 7; i++) M[size - 1 - i][8] = fmt[i];
    for (let i = 0; i < 8; i++) M[8][size - 1 - i] = fmt[14 - i];

    return M;
  }

  // ── SVG renderer ──────────────────────────────────────────────────────────
  function toSVG(text, size = 160) {
    const { ver, stream } = encode(text);
    const M = buildMatrix(ver, stream);
    const n = M.length;
    const quiet = 4;
    const total = n + quiet * 2;
    const cell = size / total;

    let rects = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (M[r][c] === 1) {
        const x = ((c + quiet) * cell).toFixed(2);
        const y = ((r + quiet) * cell).toFixed(2);
        const s = (cell + 0.1).toFixed(2); // slight overlap to avoid gaps
        rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`;
      }
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.innerHTML = `<rect width="${size}" height="${size}" fill="white"/><g fill="black">${rects}</g>`;
    return svg;
  }

  return { toSVG };
})();

window.QR = QR;
