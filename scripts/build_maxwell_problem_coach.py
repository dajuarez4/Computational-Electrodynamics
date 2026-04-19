#!/usr/bin/env python3

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Griffiths-problems" / "griffiths_problem_index_aa.tex"
OUTPUTS = [
    ROOT / "docs" / "maxwell-problem-coach.json",
    ROOT / "site" / "maxwell-problem-coach.json",
]


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_latex_text(text: str) -> str:
    text = text.replace("~", " ")
    text = text.replace("\\(", " ").replace("\\)", " ")
    text = text.replace("\\[", " ").replace("\\]", " ")
    text = re.sub(r"\\[()\\[\\]]", " ", text)
    text = re.sub(r"\$\$(.*?)\$\$", r" \1 ", text, flags=re.S)
    text = re.sub(r"\$(.*?)\$", r" \1 ", text, flags=re.S)
    text = re.sub(r"\\([A-Za-z]+)\*?(?:\[[^\]]*\])?\{([^{}]*)\}", r" \2 ", text)
    text = re.sub(r"\\([A-Za-z]+)", r" \1 ", text)
    text = text.replace("{", " ").replace("}", " ")
    return normalize_space(text)


def infer_topic(problem_id: str, chapter_number: int, chapter_title: str, statement: str) -> str:
    text = statement.lower()
    title = chapter_title.lower()

    keyword_map = [
        ("green-functions", ["green function", "green's function", "greens function"]),
        ("method-of-images", ["method of images", "image charge", "image solution", "grounded plane", "grounded sphere", "grounded conducting", "conducting plane"]),
        ("laplace", ["laplace"]),
        ("poisson", ["poisson"]),
        ("multipole", ["multipole", "dipole", "quadrupole", "octopole", "legendre"]),
        ("dielectrics", ["dielectric", "polarization", "bound charge", "electric fields in matter"]),
        ("magnetostatics", ["magnetic", "magnetization", "biot-savart", "ampere", "current loop", "inductance", "transformer"]),
        ("radiation", ["radiation", "wave", "poynting", "maxwell stress", "electromagnetic momentum", "relativity"]),
    ]

    for topic_id, keywords in keyword_map:
        if any(keyword in text for keyword in keywords):
            return topic_id

    if chapter_number == 1:
        return "vector-analysis"
    if chapter_number in {2, 3}:
        return "electrostatics"
    if chapter_number == 4:
        return "dielectrics"
    if chapter_number in {5, 6}:
        return "magnetostatics"
    if chapter_number >= 7:
        return "radiation"
    if "vector" in title:
        return "vector-analysis"
    return "electrostatics"


def build_manifest() -> dict:
    text = SOURCE.read_text(encoding="utf-8")
    lines = text.splitlines()
    records = []
    current_chapter_number = 0
    current_chapter_title = ""

    section_pattern = re.compile(r"\\section\{Chapter\s+(\d+):\s*([^}]*)\}")
    problem_pattern = re.compile(r"\\problemstatement\{([^}]*)\}\{(.*)\}\s*$")

    for line in lines:
        section_match = section_pattern.search(line)
        if section_match:
            current_chapter_number = int(section_match.group(1))
            current_chapter_title = normalize_space(section_match.group(2))
            continue

        problem_match = problem_pattern.search(line)
        if not problem_match:
            continue

        problem_id = normalize_space(problem_match.group(1))
        raw_statement = normalize_space(problem_match.group(2))
        plain_statement = clean_latex_text(raw_statement)
        topic_id = infer_topic(problem_id, current_chapter_number, current_chapter_title, plain_statement)

        records.append(
            {
                "id": f"griffiths-{problem_id}",
                "source": "Griffiths",
                "problem_id": problem_id,
                "chapter_number": current_chapter_number,
                "chapter_title": current_chapter_title,
                "topic_id": topic_id,
                "title": f"Griffiths {problem_id}",
                "statement": plain_statement,
                "raw_statement": raw_statement,
                "locator": f"Chapter {current_chapter_number}: {current_chapter_title} > Problem {problem_id}",
                "path": SOURCE.relative_to(ROOT).as_posix(),
            }
        )

    return {
        "generated_from": SOURCE.relative_to(ROOT).as_posix(),
        "problem_count": len(records),
        "problems": records,
    }


def main() -> None:
    payload = build_manifest()
    serialized = json.dumps(payload, indent=2, ensure_ascii=True)
    for output in OUTPUTS:
        output.write_text(serialized + "\n", encoding="utf-8")
    print("Wrote Maxwell problem coach manifest with", payload["problem_count"], "problems.")


if __name__ == "__main__":
    main()
