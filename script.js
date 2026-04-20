// ─── UI HANDLERS ─────────────────────────────────────────────────────────────
function launch() {
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('main-ui').classList.remove('hidden');
}

function exit() {
    document.getElementById('main-ui').classList.add('hidden');
    document.getElementById('landing').classList.remove('hidden');
}

function openModal() { document.getElementById('info-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('info-modal').style.display = 'none'; }

// ─── PARSER LOGIC ────────────────────────────────────────────────────────────
const EPSILON = '__eps__';
function isNonTerminal(sym, grammar) { return sym in grammar; }

function parseGrammar(text) {
    const g = {};
    text.split('\n').forEach(line => {
        const sep = line.includes('->') ? '->' : '→';
        if (!line.includes(sep)) return;
        const [lhs, rhs] = line.split(sep).map(s => s.trim());
        if (!g[lhs]) g[lhs] = [];
        rhs.split('|').forEach(p => {
            const tokens = p.trim().split(/\s+/).filter(Boolean);
            g[lhs].push(tokens.map(t => (t === 'eps' || t === 'epsilon') ? EPSILON : t));
        });
    });
    return g;
}

function earley(g, tokens, start) {
    const chart = Array.from({length: tokens.length + 1}, () => []);
    const seen = Array.from({length: tokens.length + 1}, () => new Set());

    function add(col, state) {
        const key = `${state.lhs}->${state.rhs.join(',')}:${state.dot}@${state.origin}`;
        if (!seen[col].has(key)) {
            seen[col].add(key);
            chart[col].push(state);
            return true;
        }
        return false;
    }

    (g[start] || []).forEach(p => add(0, {lhs: start, rhs: p, dot: 0, origin: 0, children: []}));

    for (let i = 0; i <= tokens.length; i++) {
        let j = 0;
        while (j < chart[i].length) {
            const s = chart[i][j++];
            if (s.dot < s.rhs.length) {
                const next = s.rhs[s.dot];
                if (isNonTerminal(next, g)) {
                    g[next].forEach(p => add(i, {lhs: next, rhs: p, dot: 0, origin: i, children: []}));
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

// ─── TREE RENDERING ──────────────────────────────────────────────────────────
function buildNodeTree(item) {
    return item.terminal ? {sym: item.lhs, terminal: true} : {sym: item.lhs, children: item.children.map(buildNodeTree)};
}

function renderTree(id, node) {
    const wrap = document.getElementById(id);
    let svg = `<svg width="400" height="400">`; // Simplified for now
    svg += `<text x="200" y="50" fill="white">${node.sym}</text>`;
    // This is a placeholder - keep your existing heavy renderTree logic here!
    wrap.innerHTML = svg + `</svg>`;
}

// ─── MAIN RUNNER ─────────────────────────────────────────────────────────────
function run() {
    const rulesText = document.getElementById('rules').value;
    const target = document.getElementById('target').value.trim();
    const g = parseGrammar(rulesText);
    const start = Object.keys(g)[0];
    const tokens = target.split(/\s+/).filter(Boolean);

    const derivations = earley(g, tokens, start);
    const matrix = document.getElementById('matrix');
    matrix.innerHTML = '';
    
    derivations.forEach((d, i) => {
        const pane = document.createElement('div');
        pane.className = 'pane';
        pane.innerHTML = `<div class="pane-header">TREE ${i+1}</div><div class="pane-svg-wrap" id="t${i}"></div>`;
        matrix.appendChild(pane);
        renderTree(`t${i}`, buildNodeTree(d));
    });

    const vTitle = document.getElementById('verdict-title');
    vTitle.innerText = derivations.length > 1 ? "AMBIGUOUS" : (derivations.length === 1 ? "UNAMBIGUOUS" : "INVALID");
}
