#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Any

import yaml


def load_org(yaml_path: Path) -> Dict[str, Any]:
	with yaml_path.open("r", encoding="utf-8") as f:
		return yaml.safe_load(f)


def ensure_reports_to_structure(org_data: Dict[str, Any]) -> Dict[str, Any]:
	"""Fill in missing reports_to using group-level defaults and return flattened lists of roles and groups."""
	groups: List[Dict[str, Any]] = org_data["org"]["groups"]
	role_id_to_group: Dict[str, Dict[str, Any]] = {}
	all_roles: List[Dict[str, Any]] = []

	for group in groups:
		for role in group.get("roles", []):
			role.setdefault("reports_to", group.get("default_reports_to"))
			role_id_to_group[role["id"]] = group
			all_roles.append(role)

	return {
		"groups": groups,
		"roles": all_roles,
		"role_to_group": role_id_to_group,
	}


def build_tree_data(org_data: Dict[str, Any]) -> Dict[str, Any]:
	meta = ensure_reports_to_structure(org_data)
	roles = meta["roles"]
	role_to_group = meta["role_to_group"]

	# Build adjacency: parent -> [children]
	children_by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
	role_index: Dict[str, Dict[str, Any]] = {r["id"]: r for r in roles}

	for role in roles:
		parent_id = role.get("reports_to")
		children_by_parent.setdefault(parent_id, []).append(role)

	# Identify roots (no reports_to)
	roots = children_by_parent.get(None, []) + children_by_parent.get("", []) + children_by_parent.get("null", [])

	def node_payload(role: Dict[str, Any]) -> Dict[str, Any]:
		group = role_to_group.get(role["id"], {})
		return {
			"id": role["id"],
			"name": role.get("title", role["id"]).strip(),
			"description": role.get("description", ""),
			"groupName": group.get("name", ""),
			"color": group.get("color", "#999999"),
		}

	def build_subtree(role: Dict[str, Any]) -> Dict[str, Any]:
		node = node_payload(role)
		children = [build_subtree(child) for child in children_by_parent.get(role["id"], [])]
		if children:
			node["children"] = children
		return node

	children = [build_subtree(r) for r in roots]

	return {
		"name": org_data["org"].get("name", "Organization"),
		"orientation": org_data["org"].get("orientation", "horizontal"),
		"logo_url": org_data["org"].get("logo_url"),
		"children": children,
		"legend": [
			{"name": g.get("name"), "color": g.get("color", "#999999")} for g in org_data["org"].get("groups", [])
		],
	}


def write_tree_html(tree_data: Dict[str, Any], out_path: Path) -> None:
	# Inline the JSON so no external requests are needed
	data_json = json.dumps(tree_data)
	logo_html = ""
	if tree_data.get("logo_url"):
		logo_html = f"<img class=\"logo\" src=\"{tree_data['logo_url']}\" alt=\"logo\"/>"

	html_template = """
<!DOCTYPE html>
<html lang=\"en\">
<head>
<meta charset=\"utf-8\" />
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
<title>__TITLE__ - Management Tree</title>
<style>
	body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0f1117; color: #e6e6e6; }
	header { padding: 16px 24px; border-bottom: 1px solid #222; position: sticky; top: 0; background: #0f1117; z-index: 2; }
	.header-row { display: flex; align-items: center; gap: 10px; }
	.logo { width: 24px; height: 24px; border-radius: 6px; object-fit: cover; box-shadow: 0 0 0 1px #333 inset; }
	h1 { margin: 0; font-size: 18px; font-weight: 600; }
	#legend { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
	.legend-item { display: inline-flex; gap: 8px; align-items: center; font-size: 12px; opacity: 0.9; }
	.legend-swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
	#chart { width: 100%; height: calc(100vh - 80px); }
	.node rect { rx: 8px; ry: 8px; }
	.node text.title { font-size: 12px; font-weight: 600; fill: #f0f0f0; }
	.node text.subtitle { font-size: 11px; fill: #c9c9c9; }
	.link { fill: none; stroke: #666; stroke-width: 1.25px; opacity: 0.75; }
	footer { position: fixed; right: 12px; bottom: 10px; font-size: 11px; opacity: 0.7; }
	button { background: #1f2430; color: #e6e6e6; border: 1px solid #333; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
	button:hover { border-color: #555; }
</style>
</head>
<body>
	<header>
		<div class=\"header-row\">__LOGO_HTML__<h1>__TITLE__ — Management Tree</h1></div>
		<div id=\"legend\"></div>
	</header>
	<div id=\"chart\"></div>
	<footer>
		<button id=\"fit\">Fit</button>
	</footer>
	<script src=\"https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js\"></script>
	<script>
	const treeData = __DATA__;
	const orientation = treeData.orientation || 'horizontal';

	const chartElem = document.getElementById('chart');
	const width = chartElem.clientWidth;
	const height = chartElem.clientHeight;

	const svg = d3.select('#chart').append('svg')
		.attr('width', width)
		.attr('height', height)
		.style('background', '#0f1117');

	const g = svg.append('g').attr('transform', 'translate(40,40)');

	const root = d3.hierarchy({ name: treeData.name, children: treeData.children })
		.sum(d => 1)
		.sort((a,b) => d3.ascending(a.data.name, b.data.name));

	const nodeWidth = 180;
	const nodeHeight = 56;
	const nodeGapX = 36;
	const nodeGapY = 24;

	const treeLayout = d3.tree().nodeSize(
		orientation === 'horizontal' ? [nodeHeight + nodeGapY, nodeWidth + nodeGapX] : [nodeWidth + nodeGapX, nodeHeight + nodeGapY]
	);
	treeLayout(root);

	// Centering/fit helpers
	function fitToViewBox() {
		const bbox = g.node().getBBox();
		const margin = 40;
		const vb = [bbox.x - margin, bbox.y - margin, bbox.width + 2*margin, bbox.height + 2*margin];
		svg.attr('viewBox', vb.join(' '));
	}
	fitToViewBox();
	document.getElementById('fit').onclick = fitToViewBox;

	const diagonal = d3.linkHorizontal()
		.x(d => d.y)
		.y(d => d.x);

	// Links
	g.selectAll('path.link')
		.data(root.links())
		.enter()
		.append('path')
		.attr('class', 'link')
		.attr('d', diagonal)
		.attr('stroke', '#3a3f4b');

	// Nodes
	const node = g.selectAll('g.node')
		.data(root.descendants())
		.enter()
		.append('g')
		.attr('class', 'node')
		.attr('transform', d => `translate(${d.y},${d.x})`);

	node.append('rect')
		.attr('x', -nodeWidth/2)
		.attr('y', -nodeHeight/2)
		.attr('width', nodeWidth)
		.attr('height', nodeHeight)
		.attr('fill', d => d.data.color || '#2b2f3a')
		.attr('stroke', '#1d1f27')
		.attr('stroke-width', 1.25)
		.attr('opacity', d => d.depth === 0 ? 0.15 : 0.9);

	node.append('text')
		.attr('class', 'title')
		.attr('text-anchor', 'middle')
		.attr('dy', '-0.25em')
		.text(d => d.depth === 0 ? treeData.name : (d.data.name || ''));

	node.append('text')
		.attr('class', 'subtitle')
		.attr('text-anchor', 'middle')
		.attr('dy', '1em')
		.text(d => d.depth === 0 ? '' : (d.data.groupName || ''));

	// Build legend
	const legend = d3.select('#legend')
		.selectAll('.legend-item')
		.data(treeData.legend)
		.enter()
		.append('div')
		.attr('class', 'legend-item');

	legend.append('span')
		.attr('class', 'legend-swatch')
		.style('background', d => d.color || '#666');

	legend.append('span').text(d => d.name);

	// Collapsible behavior
	node.on('click', function(event, d){
		if (!d.children && !d._children) return;
		if (d.children) { d._children = d.children; d.children = null; }
		else { d.children = d._children; d._children = null; }
		update();
	});

	function update(){
		// Re-run layout
		treeLayout(root);
		g.selectAll('path.link').data(root.links()).attr('d', diagonal);
		g.selectAll('g.node').data(root.descendants()).attr('transform', d => `translate(${d.y},${d.x})`);
		fitToViewBox();
	}
	</script>
</body>
</html>
"""
	html = html_template.replace("__TITLE__", tree_data.get("name", "Organization").replace("&", "&amp;")).replace("__DATA__", data_json).replace("__LOGO_HTML__", logo_html)
	out_path.parent.mkdir(parents=True, exist_ok=True)
	out_path.write_text(html, encoding="utf-8")


def build(org_yaml: Path, out_html: Path) -> None:
	data = load_org(org_yaml)
	if not isinstance(data, dict) or "org" not in data:
		raise SystemExit("Invalid org YAML. Expected top-level 'org' key.")

	tree_data = build_tree_data(data)
	# Enrich children nodes with color and group before HTML generation
	def enrich(node: Dict[str, Any], parent_group: Optional[str] = None, parent_color: Optional[str] = None):
		if "children" in node:
			for child in node["children"]:
				# child is a role node; ensure required props exist
				child.setdefault("groupName", parent_group)
				child.setdefault("color", parent_color or "#2b2f3a")
				enrich(child, child.get("groupName"), child.get("color"))
	# Kick off enrichment from root
	enrich(tree_data, None, None)
	write_tree_html(tree_data, out_html)


def main():
	parser = argparse.ArgumentParser(description="Build a color-coded management tree from YAML")
	parser.add_argument("--in", dest="in_yaml", default=str(Path("org") / "org.yaml"), help="Path to org YAML")
	parser.add_argument("--out", dest="out_html", default=str(Path("output") / "tree.html"), help="Output HTML path")
	args = parser.parse_args()

	in_yaml = Path(args.in_yaml)
	out_html = Path(args.out_html)
	build(in_yaml, out_html)
	print(f"Wrote {out_html} (open in a browser)")


if __name__ == "__main__":
	main()