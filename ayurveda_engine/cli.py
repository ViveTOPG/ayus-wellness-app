"""A zero-dependency CLI to explore the engine. Runs with just Python.

    python -m ayurveda_engine.cli stats
    python -m ayurveda_engine.cli search "digestion"
    python -m ayurveda_engine.cli condition agnimandya
    python -m ayurveda_engine.cli explain ashwagandha stress
    python -m ayurveda_engine.cli herb turmeric
"""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
from dataclasses import asdict

from .reasoning import DISCLAIMER, Engine

# Sanskrit terms carry diacritics (e.g. "ā"). Windows consoles default to cp1252
# and would crash on them, so force UTF-8 output where the platform allows it.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, ValueError):
        pass

TIER_MARK = {"clinical": "[clinical]", "preliminary": "[preliminary]", "traditional": "[traditional]", "classical": "[classical]"}


def _wrap(text: str, indent: str = "    ") -> str:
    return textwrap.fill(text, width=88, initial_indent=indent, subsequent_indent=indent)


def cmd_stats(engine: Engine, _args) -> int:
    for k, v in engine.kb.stats().items():
        print(f"{k:14} {v}")
    return 0


def cmd_search(engine: Engine, args) -> int:
    res = engine.search(args.query)
    print(f"Results for '{args.query}':\n")
    print("Concerns:")
    for c in res["conditions"] or [{"id": "-", "name": "(none)"}]:
        print(f"  {c['id']:18} {c['name']}")
    print("\nHerbs:")
    for h in res["herbs"] or [{"id": "-", "name": "(none)"}]:
        print(f"  {h['id']:18} {h['name']}")
    return 0


def cmd_condition(engine: Engine, args) -> int:
    report = engine.report_for_condition(args.condition_id)
    if report is None:
        print(f"Unknown condition '{args.condition_id}'. Try: python -m ayurveda_engine.cli stats")
        return 1
    c = report.condition
    print(f"\n=== {c['name']} ===")
    print(_wrap(c["description"], indent=""))
    print(f"\nAyurvedic view ({', '.join(c['primary_dosha'])}):")
    print(_wrap(c["ayurvedic_view"]))

    print("\nRecommendations (strongest evidence first):")
    for r in report.recommendations:
        mark = TIER_MARK.get(r.evidence_tier, "")
        print(f"\n  • {r.name}  {mark}  ({r.kind})")
        print(_wrap(r.rationale, indent="      "))
        srcs = "; ".join(
            f"{cit.source_title}" + (f" — {cit.locator}" if cit.locator else "")
            + (" (verify)" if cit.requires_verification else "")
            for cit in r.citations
        )
        print(_wrap(f"Sources: {srcs}", indent="      "))
        if r.typical_dosage:
            print(_wrap(f"Typical use: {r.typical_dosage}", indent="      "))

    print("\n  When to see a professional:")
    for rf in report.red_flags:
        print(f"    ! {rf}")

    print()
    print(_wrap(DISCLAIMER, indent="  "))
    return 0


def cmd_explain(engine: Engine, args) -> int:
    res = engine.explain(args.herb_id, args.condition_id)
    if res is None:
        print(f"No link found between herb '{args.herb_id}' and condition '{args.condition_id}'.")
        return 1
    print(json.dumps(res, indent=2, ensure_ascii=False))
    return 0


def cmd_herb(engine: Engine, args) -> int:
    herb = engine.kb.herbs.get(args.herb_id)
    if herb is None:
        print(f"Unknown herb '{args.herb_id}'.")
        return 1
    print(json.dumps(asdict(herb), indent=2, ensure_ascii=False, default=str))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ayurveda", description="Explore the Ayurveda knowledge engine.")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("stats", help="Show knowledge base counts")

    sp = sub.add_parser("search", help="Search concerns and herbs")
    sp.add_argument("query")

    cp = sub.add_parser("condition", help="Full report for a concern")
    cp.add_argument("condition_id")

    ep = sub.add_parser("explain", help="Show the trust chain for a herb against a concern")
    ep.add_argument("herb_id")
    ep.add_argument("condition_id")

    hp = sub.add_parser("herb", help="Dump a herb's full record")
    hp.add_argument("herb_id")

    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    engine = Engine.load()
    return {
        "stats": cmd_stats,
        "search": cmd_search,
        "condition": cmd_condition,
        "explain": cmd_explain,
        "herb": cmd_herb,
    }[args.command](engine, args)


if __name__ == "__main__":
    raise SystemExit(main())
