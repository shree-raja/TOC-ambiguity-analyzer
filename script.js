// ─── UTILITIES ────────────────────────────────────────────────────────────────
function isNonTerminal(sym, grammar) {
    return sym in grammar;
}

const EPSILON = '__eps__';
function normaliseEpsilon(tok) {
    return (tok === 'eps' || tok === 'epsilon') ? EPSILON : tok;
}

// ─── GRAMMAR VALIDATION ───────────────────────────────────────────────────────
function validateGrammar(text) {
    const errors = [];
    if (!text.trim()) { errors.push('Grammar is empty.'); return errors; }
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach((line, i) => {
        const hasSep = line.includes('->') || line.includes('→');
        if (!hasSep) { errors.push(`Line ${i+1}: missing "->" separator → "${line.trim()}"`); return; }
        const sep = line.includes('->') ? '->' : '→';
        const parts = line.split(sep);
        if (parts.length < 2 || !parts[0].trim()) {
            errors.push(`Line ${i+1}: missing left-hand side.`);
        }
        if (parts.length > 2) {
            errors.push(`Line ${i+1}: multiple "->" found. Did you mean "|"?`);
        }
    });
    return errors;
}

// ─── GRAMMAR PARSER ───────────────────────────────────────────────────────────
function parseGrammar(text) {
    const g = {};
    text.split('\n').forEach(line => {
        const sep = line.includes('->') ? '->' : (line.includes('→') ? '→' : null);
        if (!sep) return;
        const idx = line.indexOf(sep);
        const key = line.slice(0, idx).trim();
        const rhs = line.slice(idx + sep.length);
        if (!key) return;
        if (!g[key]) g[key] = [];
        rhs.split('|').forEach(p => {
            const tokens = p.trim().split(/\s+/).filter(Boolean).map(normaliseEpsilon);
            if (tokens.length === 1 && tokens[0] === EPSILON) {
                g[key].push([]);
            } else {
                g[key].push(tokens.filter(t => t !== EPSILON));
            }
        });
    });
    return g;
}

// ─── EARLEY PARSER ────────────────────────────────────────────────────────────
function getStartSymbol(text) {
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
        const sep = line.includes('->') ? '->' : (line.includes('→') ? '→' : null);
        if (sep) return line.slice(0, line.indexOf(sep)).trim();
    }
    return null;
}

function earley(g, tokens, start) {
    if (!start || !g[start]) return [];
    const chart = Array.from({length: tokens.length + 1}, () => []);
    const seen  = Array.from({length: tokens.length + 1}, () => new Set());

    function stateKey(s) { return `${s.lhs}::${s.rhs.join(' ')}@${s.dot}@${s.origin}`; }
    function add(col, state) {
        const k = stateKey(state);
        if (!seen[col].has(k)) { seen[col].add(k); chart[col].push(state); return true; }
        return false;
    }

    (g[start] || []).forEach(p => add(0, {lhs: start, rhs: p, dot: 0, origin: 0, children: []}));

    for (let i = 0; i <= tokens.length; i++) {
        let j = 0;
        while (j < chart[i].length) {
            const s = chart[i][j++];
            const next = s.rhs[s.dot];

            if (s.dot < s.rhs.length) {
                if (isNonTerminal(next, g)) {
                    (g[next] || []).forEach(p => add(i, {lhs: next, rhs: p, dot: 0, origin: i, children: []}));
                } else if (i < tokens.length && next === tokens[i]) {
                    add(i + 1, {...s, dot: s.dot + 1, children: [...s.children, {lhs: next, terminal: true}]});
                }
            } else {
                chart[s.origin].forEach(p => {
                    if (p.rhs[p.dot] === s.lhs) {
                        add(i, {...p, dot: p.dot + 1, children: [...p.children, s]});
                    }
                });
            }
        }
    }
    return chart[tokens.length].filter(s => s.lhs === start && s.dot === s.rhs.length && s.origin === 0);
}

// ─── TREE UTILITIES ───────────────────────────────────────────────────────────
function buildNodeTree(item) {
    return item.terminal
        ? {sym: item.lhs, terminal: true}
        : {sym: item.lhs, children: item.children.map(buildNodeTree)};
}
function treeStr(n) {
    return n.terminal ? n.sym : n.sym + '(' + (n.children||[]).map(treeStr).join(',') + ')';
}
function countLeaves(node) {
    if (!node.children || node.children.length === 0) return 1;
    return node.children.reduce((a, c) => a + countLeaves(c), 0);
}

// ─── SVG TREE RENDER ─────────────────────────────────────────────────────────
function renderTree(id, node) {
    const wrap = document.getElementById(id);
    const pos = []; let counter = 0;
    const hSp = 70, vSp = 80;
    function layout(n, offsetX, y) {
        const cid = counter++;
        const x = offsetX + (countLeaves(n) * hSp) / 2;
        const entry = {id: cid, x, y, sym: n.sym, kids: []};
        pos.push(entry);
        if (n.children && n.children.length > 0) {
            let cx = offsetX;
            n.children.forEach(c => {
                const childId = layout(c, cx, y + vSp);
                entry.kids.push(childId);
                cx += countLeaves(c) * hSp;
            });
        }
        return cid;
    }
    layout(node, 0, 40);
    const maxX = Math.max(...pos.map(p => p.x)) + 60;
    const maxY = Math.max(...pos.map(p => p.y)) + 50;
    let svg = `<svg width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">`;
    pos.forEach(p => {
        p.kids.forEach(k => {
            const c = pos.find(o => o.id === k);
            svg += `<line x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}" class="edge"/>`;
        });
    });
    pos.forEach(p => {
        const boxW = Math.max(44, p.sym.length * 9 + 16);
        svg += `<rect x="${p.x - boxW/2}" y="${p.y-13}" width="${boxW}" height="26" rx="4" class="node-rect"/>`;
        svg += `<text x="${p.x}" y="${p.y+5}" class="node-text">${p.sym}</text>`;
    });
    wrap.innerHTML = svg + `</svg>`;
}

// ─── MAIN RUN ─────────────────────────────────────────────────────────────────
function run() {
    const rulesText = document.getElementById('rules').value;
    const targetRaw = document.getElementById('target').value.trim();
    const gErrEl = document.getElementById('grammar-error');
    const tErrEl = document.getElementById('target-error');
    gErrEl.style.display = 'none';
    tErrEl.style.display = 'none';

    const gErrors = validateGrammar(rulesText);
    if (gErrors.length) {
        gErrEl.innerHTML = gErrors.join('<br>');
        gErrEl.style.display = 'block';
        document.getElementById('log-line').innerText = '> GRAMMAR_ERROR: CHECK RULES';
        return;
    }

    const g = parseGrammar(rulesText);
    const start = getStartSymbol(rulesText);
    const tokens = targetRaw ? targetRaw.split(/\s+/).filter(Boolean) : [];

    const allTerminals = new Set();
    Object.values(g).flat().flat().forEach(t => { if (!isNonTerminal(t, g) && t !== EPSILON) allTerminals.add(t); });
    const unknownTokens = tokens.filter(t => !allTerminals.has(t) && !isNonTerminal(t, g));
    if (unknownTokens.length > 0) {
        tErrEl.innerHTML = `Unknown token(s): ${unknownTokens.map(t=>`"${t}"`).join(', ')} — not defined in any production.`;
        tErrEl.style.display = 'block';
    }

    const items = earley(g, tokens, start);
    const unique = [];
    items.forEach(it => {
        const t = buildNodeTree(it);
        if (!unique.some(u => treeStr(u) === treeStr(t))) unique.push(t);
    });

    const matrix = document.getElementById('matrix');
    matrix.innerHTML = '';

    const vTitle = document.getElementById('verdict-title');
    const vBody  = document.getElementById('verdict-body');
    const why    = document.getElementById('why-text');
    const how    = document.getElementById('how-text');

    if (unique.length === 0) {
        vTitle.innerText = "INVALID STRING"; vTitle.style.color = "var(--danger)";
        vBody.innerText = "No valid derivation found.";
        matrix.innerHTML = `<div class="pane"><div class="pane-svg-wrap" style="color:var(--danger); font-family:'JetBrains Mono';">✕ NO VALID DERIVATION</div></div>`;
        why.innerHTML = `This string is not part of the language generated by the CFG. No sequence of <span class="hl">production rules</span> can derive this exact sequence of terminals.`;
        how.innerHTML = `Verify that all tokens in the target string appear as terminals in the grammar. Check for missing operators or mismatched symbols.`;
        document.getElementById('log-line').innerText = '> SCAN_COMPLETE: NO DERIVATION FOUND';
        return;
    }

    unique.forEach((tree, i) => {
        const pane = document.createElement('div');
        pane.className = 'pane';
        pane.innerHTML = `<div class="pane-header"><span class="pane-label-text">TREE_BUFFER_${String(i+1).padStart(2,'0')}</span></div><div class="pane-svg-wrap" id="t${i}"></div>`;
        matrix.appendChild(pane);
        renderTree(`t${i}`, tree);
    });

    if (unique.length > 1) {
        vTitle.innerText = "AMBIGUOUS"; vTitle.style.color = "var(--danger)";
        vBody.innerText = `${unique.length} distinct parse trees found.`;
        why.innerHTML = `A CFG is <span class="hl">ambiguous</span> if a string yields two or more distinct <b>parse trees</b>. The production rules lack defined <b>precedence</b> or <b>associativity</b>, allowing multiple valid syntactic structures.`;
        how.innerHTML = `Rewrite using <span class="hl">Stratification</span> — introduce new non-terminals (e.g., Expr, Term, Factor) to enforce a strict structural hierarchy. Use <b>⚡ AUTO-RESOLVE</b> to attempt automatic stratification.`;
    } else {
        vTitle.innerText = "UNAMBIGUOUS"; vTitle.style.color = "var(--success)";
        vBody.innerText = "Unique parse tree detected.";
        why.innerHTML = `This CFG is <span class="hl">unambiguous</span> for the given string — exactly one parse tree exists. The structural hierarchy is fully deterministic.`;
        how.innerHTML = `No modifications required. The grammar reliably defines the syntax without logical overlaps.`;
    }
    document.getElementById('log-line').innerText = `> SCAN_COMPLETE: ${unique.length} TREE(S) FOUND`;
}

// ─── AUTO-RESOLVE ─────────────────────────────────────────────────────────────
function autoResolve() {
    const input = document.getElementById('rules').value;
    const gErrors = validateGrammar(input);
    if (gErrors.length) {
        document.getElementById('grammar-error').innerHTML = gErrors.join('<br>');
        document.getElementById('grammar-error').style.display = 'block';
        return;
    }

    const g = parseGrammar(input);
    const ntNames = Object.keys(g);
    const start = getStartSymbol(input);
    const targetRaw = document.getElementById('target').value.trim();
    const tokens = targetRaw ? targetRaw.split(/\s+/).filter(Boolean) : [];
    const existingItems = earley(g, tokens, start);
    const existingUnique = [];
    existingItems.forEach(it => {
        const t = buildNodeTree(it);
        if (!existingUnique.some(u => treeStr(u) === treeStr(t))) existingUnique.push(t);
    });

    if (existingUnique.length <= 1) {
        document.getElementById('log-line').innerText = '> AUTO-RESOLVE SKIPPED: GRAMMAR ALREADY UNAMBIGUOUS FOR TARGET';
        run();
        return;
    }

    function freshName(base) {
        let candidate = base + '_1';
        let n = 1;
        while (ntNames.includes(candidate)) { n++; candidate = base + '_' + n; }
        ntNames.push(candidate);
        return candidate;
    }

    function altToText(tokens) {
        return tokens.length === 0 ? 'eps' : tokens.join(' ');
    }

    function replaceSelfRef(tokens, lhs, replacement) {
        return tokens.map(t => t === lhs ? replacement : t);
    }

    function dedupeAlts(alts) {
        const seen = new Set();
        return alts.filter(a => {
            const k = JSON.stringify(a);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    function buildTreeSpecificGrammar(rootTree, startSymbol) {
        const createdRules = [];
        const counts = {};

        function nextName(base) {
            counts[base] = (counts[base] || 0) + 1;
            return `${base}_R${counts[base]}`;
        }

        function walk(node) {
            if (node.terminal) return {name: node.sym, terminal: true};

            const thisName = nextName(node.sym);
            const rhs = [];
            (node.children || []).forEach(ch => {
                const child = walk(ch);
                rhs.push(child.name);
            });
            createdRules.push(`${thisName} -> ${rhs.length ? rhs.join(' ') : 'eps'}`);
            return {name: thisName, terminal: false};
        }

        const root = walk(rootTree);
        const lines = [];
        lines.push(`${startSymbol} -> ${root.name}`);
        createdRules.forEach(r => lines.push(r));
        return lines;
    }

    function tryExpressionStratification(lhs, alts) {
        const binary = [];
        const remaining = [];

        alts.forEach(a => {
            if (a.length === 3 && a[0] === lhs && a[2] === lhs && !isNonTerminal(a[1], g)) {
                binary.push({op: a[1]});
            } else {
                remaining.push(a);
            }
        });

        if (binary.length === 0 || remaining.length === 0) return null;

        const precedence = {
            '||': 1, '&&': 2,
            '==': 3, '!=': 3,
            '<': 4, '<=': 4, '>': 4, '>=': 4,
            '+': 5, '-': 5,
            '*': 6, '/': 6, '%': 6,
            '^': 7
        };

        const ops = [...new Set(binary.map(b => b.op))];
        ops.sort((a, b) => {
            const pa = (a in precedence) ? precedence[a] : 5;
            const pb = (b in precedence) ? precedence[b] : 5;
            return pa - pb || a.localeCompare(b);
        });

        const grouped = [];
        ops.forEach(op => {
            const p = (op in precedence) ? precedence[op] : 5;
            const last = grouped[grouped.length - 1];
            if (!last || last.prec !== p) grouped.push({prec: p, ops: [op]});
            else last.ops.push(op);
        });

        const top = freshName(lhs);
        const levels = grouped.map(() => freshName(lhs));
        const atom = freshName(lhs);
        const out = [];

        out.push(`${lhs} -> ${top}`);
        levels.forEach((lvl, idx) => {
            const next = idx === levels.length - 1 ? atom : levels[idx + 1];
            const opsHere = grouped[idx].ops;
            const rightAssoc = opsHere.length === 1 && opsHere[0] === '^';
            const tails = opsHere.map(op =>
                rightAssoc ? `${next} ${op} ${lvl}` : `${lvl} ${op} ${next}`
            );
            out.push(`${lvl} -> ${tails.join(' | ')} | ${next}`);
        });

        const atomAlts = dedupeAlts(remaining.map(a => replaceSelfRef(a, lhs, top)));
        out.push(`${atom} -> ${atomAlts.map(altToText).join(' | ')}`);
        out[0] = `${lhs} -> ${levels[0]}`;
        return out;
    }

    function eliminateImmediateLeftRecursion(lhs, alts) {
        const leftRec = [];
        const base = [];

        alts.forEach(a => {
            if (a[0] === lhs) leftRec.push(a.slice(1));
            else base.push(a);
        });

        if (leftRec.length === 0 || base.length === 0) return null;

        const next = freshName(lhs);
        const out = [];
        const lhsAlts = base.map(b => [...b, next]);
        const nextAlts = leftRec.map(r => [...r, next]);
        nextAlts.push([]);

        out.push(`${lhs} -> ${dedupeAlts(lhsAlts).map(altToText).join(' | ')}`);
        out.push(`${next} -> ${dedupeAlts(nextAlts).map(altToText).join(' | ')}`);
        return out;
    }

    const newLines = [];
    let changed = false;

    Object.keys(g).forEach(lhs => {
        const alts = g[lhs].map(a => [...a]);
        const expressionRewrite = tryExpressionStratification(lhs, alts);
        if (expressionRewrite) {
            changed = true;
            expressionRewrite.forEach(line => newLines.push(line));
            return;
        }

        const leftRecRewrite = eliminateImmediateLeftRecursion(lhs, alts);
        if (leftRecRewrite) {
            changed = true;
            leftRecRewrite.forEach(line => newLines.push(line));
            return;
        }

        newLines.push(`${lhs} -> ${alts.map(altToText).join(' | ')}`);
    });

    if (!changed) {
        const items = earley(g, tokens, start);
        const unique = [];
        items.forEach(it => {
            const t = buildNodeTree(it);
            if (!unique.some(u => treeStr(u) === treeStr(t))) unique.push(t);
        });

        if (unique.length > 1 && start) {
            const deterministicLines = buildTreeSpecificGrammar(unique[0], start);
            document.getElementById('rules').value = deterministicLines.join('\n');
            document.getElementById('log-line').innerText = '> AUTO-RESOLVE: DERIVATION-SPECIFIC GRAMMAR GENERATED';
            run();
            return;
        }

        document.getElementById('log-line').innerText = '> AUTO-RESOLVE: NO REWRITABLE PATTERN DETECTED';
        run();
        return;
    }

    document.getElementById('rules').value = newLines.join('\n');
    document.getElementById('log-line').innerText = '> STRATIFICATION_COMPLETE: AUTO-RESOLVE APPLIED';
    run();
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function launch() {
    const landing = document.getElementById('landing');
    const main = document.getElementById('main-ui');
    landing.classList.add('page-exit');
    setTimeout(() => {
        landing.classList.add('hidden'); landing.classList.remove('page-exit');
        main.classList.remove('hidden'); main.classList.add('page-enter');
    }, 300);
}

function exit() {
    const main = document.getElementById('main-ui');
    const landing = document.getElementById('landing');
    main.classList.add('page-exit');
    setTimeout(() => {
        main.classList.add('hidden'); main.classList.remove('page-exit','page-enter');
        landing.classList.remove('hidden','page-exit'); landing.classList.add('page-enter');
        document.getElementById('rules').value = 'S -> S + S | S * S | a';
        document.getElementById('target').value = 'a + a * a';
        document.getElementById('matrix').innerHTML = '<div class="pane"><div class="pane-svg-wrap" style="color:var(--text3); font-family:\'JetBrains Mono\';">AWAITING SCAN...</div></div>';
        document.getElementById('verdict-title').innerText = "PENDING";
        document.getElementById('verdict-title').style.color = "var(--text3)";
        document.getElementById('verdict-body').innerText = "Run a scan to detect ambiguity.";
        document.getElementById('why-text').innerText = "Awaiting scan...";
        document.getElementById('how-text').innerText = "Awaiting scan...";
        document.getElementById('log-line').innerText = "> SYSTEM_READY";
        document.getElementById('grammar-error').style.display = 'none';
        document.getElementById('target-error').style.display = 'none';
    }, 300);
}

function openModal()  { document.getElementById('info-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('info-modal').style.display = 'none'; }
