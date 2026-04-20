# CFG Ambiguity Detector & Resolver
A web-based tool to analyze Context-Free Grammars for ambiguity and automatically resolve hierarchy issues.

## Features
* **Ambiguity Detection:** Identifies if a string has multiple parse trees.
* **Auto-Resolve:** Automatically stratifies recursive grammars to fix ambiguity.
* **Visualization:** Generates a matrix and visual tree structure for student learning.

## How to Use
1. Enter your Context-Free Grammar (e.g., `S -> SS | a`).
2. Type a target string.
3. Click **Generate Matrix** to see the results.
4. Use **Auto-Resolve** if the grammar is reported as ambiguous.
