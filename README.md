# Agentic Boardroom — Management Tree

This repository renders a color-coded, self-refining management tree from YAML.

## Quickstart

1. Create a virtual environment and install deps:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

2. Build once:

```bash
python scripts/build_tree.py --in org/org.yaml --out output/tree.html
```

3. Auto-rebuild on changes (self-refining):

```bash
python scripts/watch.py
```

Open `output/tree.html` in a browser to view the interactive org chart. Nodes are color-coded by group and the layout adapts as you edit `org/org.yaml`.

## Customize

- Edit `org/org.yaml` to add groups, roles, colors, and reporting lines.
- Omit `reports_to` for a role to inherit the group’s `default_reports_to`.
- Change `orientation` to `vertical` or `horizontal`.