#!/usr/bin/env python3
"""Audit Acumatica modern UI screen bindings against backend graph views/actions.

Checks, for screens under FrontendSources/screen/src/development/screens:
- TS createSingle/createCollection members exist as public graph views.
- TS PXActionState members exist as public PXAction declarations.
- HTML view.bind targets exist in the TS screen.
- HTML state.bind targets exist as TS views or actions.

This is intentionally static and conservative. It catches the common publish/runtime
error where a public graph view/action is renamed or added without matching TS/HTML.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

VIEW_RE = re.compile(
    r"public\s+(?:PXSelect(?:Readonly)?|PXFilter|PXSetup|PXProcessing)<[^;]+>\s+(\w+)\s*;",
    re.S,
)
ACTION_RE = re.compile(r"public\s+PXAction<[^>]+>\s+(\w+)\s*;")
GRAPH_TYPE_RE = re.compile(r"graphType:\s*\"([^\"]+)\"")
TS_VIEW_RE = re.compile(r"\b(\w+)\s*=\s*create(?:Single|Collection)\(")
TS_ACTION_RE = re.compile(r"\b(\w+):\s*PXActionState\s*;")
HTML_VIEW_BIND_RE = re.compile(r"view\.bind=\"([^\"]+)\"")
HTML_STATE_BIND_RE = re.compile(r"state\.bind=\"([^\"]+)\"")


def graph_short(graph_type: str) -> str:
    return graph_type.split(".")[-1]


def collect_graph_members(root: pathlib.Path) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    graph_views: dict[str, set[str]] = {}
    graph_actions: dict[str, set[str]] = {}

    for graph_file in sorted((root / "Graph").glob("*.cs")):
        text = graph_file.read_text(encoding="utf-8")
        graph_name = graph_file.stem
        graph_views[graph_name] = set(VIEW_RE.findall(text))
        graph_actions[graph_name] = set(ACTION_RE.findall(text))

    return graph_views, graph_actions


def audit(root: pathlib.Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    graph_views, graph_actions = collect_graph_members(root)

    screen_root = root / "FrontendSources" / "screen" / "src" / "development" / "screens"
    for ts_file in sorted(screen_root.glob("**/*.ts")):
        text = ts_file.read_text(encoding="utf-8")
        graph_match = GRAPH_TYPE_RE.search(text)
        if not graph_match:
            continue

        graph = graph_short(graph_match.group(1))
        ts_views = set(TS_VIEW_RE.findall(text))
        ts_actions = set(TS_ACTION_RE.findall(text))
        known_views = graph_views.get(graph, set())
        known_actions = graph_actions.get(graph, set())

        if graph not in graph_views:
            errors.append(f"{ts_file}: graph {graph} not found under Graph/")
            continue

        for view in sorted(ts_views - known_views):
            errors.append(f"{ts_file}: TS view {view} is not a public graph view on {graph}")

        for action in sorted(ts_actions - known_actions):
            errors.append(f"{ts_file}: TS action {action} is not a public PXAction on {graph}")

        # Public setup views are often backend-only for PXSetup. Warn, do not fail,
        # only when the screen itself is not the setup screen.
        for view in sorted(known_views - ts_views):
            if view == "Setup" and not graph.endswith("SetupMaint"):
                continue
            warnings.append(f"{ts_file}: graph view {graph}.{view} is not exposed in TS")

        for action in sorted(known_actions - ts_actions):
            warnings.append(f"{ts_file}: graph action {graph}.{action} is not exposed in TS")

        html_file = ts_file.with_suffix(".html")
        if not html_file.exists():
            continue

        html = html_file.read_text(encoding="utf-8")
        for bind in HTML_VIEW_BIND_RE.findall(html):
            member = bind.split(".")[0]
            if member not in ts_views:
                errors.append(f"{html_file}: view.bind=\"{bind}\" has no TS view member")

        for bind in HTML_STATE_BIND_RE.findall(html):
            member = bind.split(".")[0]
            if member not in ts_views and member not in ts_actions:
                errors.append(f"{html_file}: state.bind=\"{bind}\" has no TS view/action member")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit Acumatica modern UI graph/TS/HTML bindings.")
    parser.add_argument(
        "root",
        nargs="?",
        default=pathlib.Path(__file__).resolve().parents[1],
        type=pathlib.Path,
        help="Extension root containing Graph/ and FrontendSources/ (default: repo root)",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    errors, warnings = audit(root)

    print("ERRORS")
    print("\n".join(errors) if errors else "none")
    print("WARNINGS")
    print("\n".join(warnings) if warnings else "none")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
