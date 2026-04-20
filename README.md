# TOC Ambiguity Detector

A computational tool designed to detect and visualize ambiguity in Context-Free Grammars (CFG). Built with the **Earley Parsing Algorithm**, this lab environment provides real-time parse tree generation and automatic grammar stratification.


---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | **HTML5** (Semantic structure) & **CSS3** (Modern Flex/Grid) |
| **Logic Engine** | **JavaScript (ES6+)** |
| **Algorithm** | **Earley Parser** |
| **Visuals** | **SVG** (Scalable Vector Graphics) for dynamic tree rendering |
| **Typography** | **Google Fonts** (Outfit & JetBrains Mono for a terminal aesthetic) |
| **Deployment** | **Vercel** |

---

## Key Features

- **Ambiguity Detection**: Identifies if a string has multiple valid leftmost derivations.
- **Dynamic Parse Tree Matrix**: Renders distinct SVG parse trees side-by-side for visual comparison.
- **Auto-Resolve (Stratification)**: Automatically refactors ambiguous grammars into hierarchical structures by applying precedence and associativity logic.
- **Earley-Based Scanning**: Handles CFGs, including epsilon productions (`eps`) and recursive rules.


## Project Structure

- `index.html`: The core application shell and UI.
- `style.css`: Custom theme, grid layouts, and SVG styling.
- `script.js`: The engine featuring the Earley Parser, validation logic, and tree layout algorithms.

