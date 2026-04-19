#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import re
import subprocess
from html import unescape
from pathlib import Path
from typing import Iterable, List, Optional


ROOT = Path(__file__).resolve().parents[1]
PDF_EXTRACTOR = ROOT / "scripts" / "extract_pdf_text.swift"
OUTPUTS = [
    ROOT / "docs" / "maxwell-qa-index.json",
    ROOT / "site" / "maxwell-qa-index.json",
]

TEXT_PATTERNS = [
    "README.md",
    "repo-mindmap.md",
    "Formula Sheet/**/*.tex",
    "Formula Sheet/**/*.md",
    "notes/**/*.tex",
    "notes/**/*.md",
    "notes-diego/**/*.tex",
    "notes-diego/**/*.md",
    "problems/**/*.tex",
    "slides/**/*.tex",
    "Griffiths-problems/**/*.tex",
    "codes/cpp/**/README.md",
    "notebooks/*.ipynb",
    "**/*.pdf",
]

LATEX_SECTION_PATTERNS = [
    r"\\chapter\*?\{([^{}]*)\}",
    r"\\section\*?\{([^{}]*)\}",
    r"\\subsection\*?\{([^{}]*)\}",
    r"\\subsubsection\*?\{([^{}]*)\}",
]

LATEX_SECTION_COMMANDS = [
    ("chapter", 1),
    ("section", 2),
    ("subsection", 3),
    ("subsubsection", 4),
    ("paragraph", 5),
]

LATEX_SIMPLE_COMMANDS = [
    "textbf",
    "textit",
    "emph",
    "mathbf",
    "mathrm",
    "mathit",
    "operatorname",
    "underline",
    "texttt",
    "large",
    "Large",
    "LARGE",
]


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_paragraphs(text: str) -> List[str]:
    parts = re.split(r"\n\s*\n+", text)
    return [normalize_space(part) for part in parts if normalize_space(part)]


def clean_heading_text(text: str) -> str:
    text = strip_latex_wrappers(text)
    text = clean_markdown(text)
    return normalize_space(text)


def clean_markdown(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"`([^`]*)`", r" \1 ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r" \1 ", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.M)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.M)
    text = re.sub(r"^\s*>\s?", "", text, flags=re.M)
    text = re.sub(r"\|", " ", text)
    return text


def clean_html(text: str) -> str:
    text = re.sub(r"<script.*?>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style.*?>.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return unescape(text)


def strip_latex_wrappers(text: str) -> str:
    document_match = re.search(r"\\begin\{document\}(.*)\\end\{document\}", text, flags=re.S)
    if document_match:
        text = document_match.group(1)

    for command in LATEX_SIMPLE_COMMANDS:
        pattern = re.compile(rf"\\{command}\{{([^{{}}]*)\}}")
        while pattern.search(text):
            text = pattern.sub(r" \1 ", text)

    for pattern in LATEX_SECTION_PATTERNS:
        text = re.sub(pattern, r"\n\n\1\n\n", text)

    text = re.sub(r"(?<!\\)%.*", "", text)
    text = re.sub(r"\\newcommand\s*\{[^}]+\}\s*(\[[^\]]+\])?\s*\{.*?\}", " ", text, flags=re.S)
    text = re.sub(r"\\(?:documentclass|usepackage|usetikzlibrary|title|subtitle|author|institute|date|keywords)\b(?:\[[^\]]*\])?\{.*?\}", " ", text, flags=re.S)
    text = re.sub(r"\\(?:maketitle|tableofcontents|clearpage|newpage|FloatBarrier|onecolumn|twocolumn)\b", " ", text)
    text = re.sub(r"\\(?:coordinate|draw|fill)\b[^;]*;", " ", text, flags=re.S)
    text = re.sub(r"\\node\b(?!\s*\{)[^;]*;", " ", text, flags=re.S)
    text = re.sub(r"\\item", "\n", text)
    text = re.sub(r"\\begin\{[^}]+\}", "\n", text)
    text = re.sub(r"\\end\{[^}]+\}", "\n", text)
    text = re.sub(r"\\\[", " ", text)
    text = re.sub(r"\\\]", " ", text)
    text = re.sub(r"\$\$(.*?)\$\$", r" \1 ", text, flags=re.S)
    text = re.sub(r"\$(.*?)\$", r" \1 ", text, flags=re.S)
    text = re.sub(r"\\([A-Za-z]+)\*?(?:\[[^\]]*\])?\{([^{}]*)\}", r" \2 ", text)
    text = re.sub(r"\\([A-Za-z]+)", r" \1 ", text)
    text = text.replace("{", " ").replace("}", " ")
    text = text.replace("\\", " ")
    return text


def extract_document_body(text: str) -> str:
    document_match = re.search(r"\\begin\{document\}(.*)\\end\{document\}", text, flags=re.S)
    if document_match:
        return document_match.group(1)
    return text


def locator_from_stack(stack: List[dict]) -> str:
    titles = [item["title"] for item in stack if item.get("title")]
    return " > ".join(titles) if titles else "front matter"


def latex_sectioned_records(path: Path) -> List[dict]:
    raw_text = path.read_text(encoding="utf-8", errors="ignore")
    body = extract_document_body(raw_text)
    section_pattern = re.compile(
        r"\\(chapter|section|subsection|subsubsection|paragraph)\*?(?:\[[^\]]*\])?\{([^{}]*)\}",
        flags=re.S,
    )
    matches = list(section_pattern.finditer(body))
    records: List[dict] = []

    def append_segment(content: str, locator: str) -> None:
        cleaned = strip_latex_wrappers(content)
        paragraphs = split_paragraphs(cleaned)
        if not paragraphs:
            return
        records.extend(chunk_records_from_paragraphs(paragraphs, locator))

    if not matches:
        paragraphs = split_paragraphs(strip_latex_wrappers(body))
        return chunk_records_from_paragraphs(paragraphs, "front matter") if paragraphs else []

    if matches[0].start() > 0:
        append_segment(body[: matches[0].start()], "front matter")

    stack: List[dict] = []
    for index, match in enumerate(matches):
        command = match.group(1)
        title = clean_heading_text(match.group(2))
        level = next((level for name, level in LATEX_SECTION_COMMANDS if name == command), 99)
        while stack and stack[-1]["level"] >= level:
            stack.pop()
        stack.append({"level": level, "title": title})

        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        append_segment(body[start:end], locator_from_stack(stack))

    return records


def markdown_sectioned_records(path: Path) -> List[dict]:
    raw_text = path.read_text(encoding="utf-8", errors="ignore")
    heading_pattern = re.compile(r"^(#{1,6})\s+(.+?)\s*$", flags=re.M)
    matches = list(heading_pattern.finditer(raw_text))
    records: List[dict] = []

    def append_segment(content: str, locator: str) -> None:
        cleaned = clean_markdown(content)
        paragraphs = split_paragraphs(cleaned)
        if not paragraphs:
            return
        records.extend(chunk_records_from_paragraphs(paragraphs, locator))

    if not matches:
        paragraphs = split_paragraphs(clean_markdown(raw_text))
        return chunk_records_from_paragraphs(paragraphs, "document") if paragraphs else []

    if matches[0].start() > 0:
        append_segment(raw_text[: matches[0].start()], "document")

    stack: List[dict] = []
    for index, match in enumerate(matches):
        level = len(match.group(1))
        title = clean_heading_text(match.group(2))
        while stack and stack[-1]["level"] >= level:
            stack.pop()
        stack.append({"level": level, "title": title})

        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw_text)
        append_segment(raw_text[start:end], locator_from_stack(stack))

    return records


def humanize_title(path: Path) -> str:
    stem = path.stem.replace("_", " ").replace("-", " ")
    return normalize_space(stem)


def notebook_paragraphs(path: Path) -> List[str]:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    paragraphs: List[str] = []
    for cell in notebook.get("cells", []):
        if cell.get("cell_type") not in {"markdown", "raw"}:
            continue
        source = "".join(cell.get("source", []))
        cleaned = clean_markdown(source)
        paragraphs.extend(split_paragraphs(cleaned))
    return paragraphs


def has_source_sibling(path: Path) -> bool:
    return any(path.with_suffix(ext).exists() for ext in [".tex", ".md", ".ipynb", ".html"])


def should_index_pdf(path: Path) -> bool:
    if path.name.startswith("."):
        return False
    if has_source_sibling(path):
        return False
    return True


def extract_pdf_text(path: Path) -> str:
    module_cache = Path("/tmp/swift-module-cache")
    module_cache.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        ["swift", "-module-cache-path", str(module_cache), str(PDF_EXTRACTOR), str(path)],
        check=True,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    return result.stdout


def extract_pdf_pages(path: Path) -> List[dict]:
    payload = extract_pdf_text(path)
    pages = json.loads(payload)
    if not isinstance(pages, list):
        return []
    return pages


def chunk_records_from_paragraphs(paragraphs: List[str], locator_prefix: str, extra: Optional[dict] = None) -> List[dict]:
    records: List[dict] = []
    for index, text in enumerate(chunk_paragraphs(paragraphs), start=1):
        if is_noise_chunk(text):
            continue
        locator = locator_prefix if index == 1 else f"{locator_prefix}, part {index}"
        record = {
            "text": text,
            "locator": locator,
        }
        if extra:
            record.update(extra)
        records.append(record)
    return records


def notebook_chunk_records(path: Path) -> List[dict]:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    records: List[dict] = []

    for cell_index, cell in enumerate(notebook.get("cells", []), start=1):
        if cell.get("cell_type") not in {"markdown", "raw"}:
            continue
        source = "".join(cell.get("source", []))
        cleaned = clean_markdown(source)
        paragraphs = split_paragraphs(cleaned)
        if not paragraphs:
            continue
        records.extend(
            chunk_records_from_paragraphs(
                paragraphs,
                f"cell {cell_index}",
                {"cell_start": cell_index, "cell_end": cell_index},
            )
        )

    return records


def pdf_chunk_records(path: Path) -> List[dict]:
    try:
        pages = extract_pdf_pages(path)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return []

    records: List[dict] = []
    for page in pages:
        text = page.get("text", "")
        page_number = int(page.get("page", 0) or 0)
        paragraphs = split_paragraphs(text)
        if not paragraphs or page_number <= 0:
            continue
        records.extend(
            chunk_records_from_paragraphs(
                paragraphs,
                f"p. {page_number}",
                {"page_start": page_number, "page_end": page_number},
            )
        )

    return records


def text_file_paragraphs(path: Path) -> List[str]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    suffix = path.suffix.lower()

    if suffix == ".md":
        text = clean_markdown(text)
    elif suffix == ".tex":
        text = strip_latex_wrappers(text)
    elif suffix == ".html":
        text = clean_html(text)

    return split_paragraphs(text)


def split_long_paragraph(paragraph: str, target: int = 950) -> List[str]:
    if len(paragraph) <= target * 1.35:
        return [paragraph]

    sentences = re.findall(r"[^.!?]+[.!?]?", paragraph)
    chunks: List[str] = []
    current = ""

    for sentence in sentences:
        sentence = normalize_space(sentence)
        if not sentence:
            continue
        if current and len(current) + len(sentence) + 1 > target:
            chunks.append(current)
            current = sentence
        else:
            current = (current + " " + sentence).strip()

    if current:
        chunks.append(current)

    return chunks or [paragraph]


def chunk_paragraphs(paragraphs: Iterable[str], target: int = 1100) -> List[str]:
    expanded: List[str] = []
    for paragraph in paragraphs:
        expanded.extend(split_long_paragraph(paragraph, target=950))

    chunks: List[str] = []
    current = ""

    for paragraph in expanded:
        if len(paragraph) < 40:
            continue
        if current and len(current) + len(paragraph) + 2 > target:
            chunks.append(current.strip())
            current = paragraph
        else:
            current = (current + "\n\n" + paragraph).strip() if current else paragraph

    if current:
        chunks.append(current.strip())

    return chunks


def is_noise_chunk(text: str) -> bool:
    normalized = normalize_space(text).lower()
    markers = [
        "remember picture",
        "current page",
        "anchor north west",
        "rounded corners",
        "minimum width",
        "minimum height",
        "line width",
        "xshift",
        "yshift",
    ]
    score = sum(1 for marker in markers if marker in normalized)
    return score >= 3


def gather_source_files() -> List[Path]:
    files = set()
    for pattern in TEXT_PATTERNS:
        files.update(ROOT.glob(pattern))
    return sorted(
        path
        for path in files
        if path.is_file() and (path.suffix.lower() != ".pdf" or should_index_pdf(path))
    )


def source_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".ipynb":
        return "notebook"
    if suffix == ".pdf":
        return "pdf"
    if suffix == ".md":
        return "markdown"
    if suffix == ".tex":
        return "latex"
    if suffix == ".html":
        return "page"
    return "text"


def build_index() -> dict:
    files = gather_source_files()
    chunks = []
    chunk_id = 1

    for path in files:
        relative_path = path.relative_to(ROOT).as_posix()
        suffix = path.suffix.lower()
        if suffix == ".ipynb":
            chunk_records = notebook_chunk_records(path)
        elif suffix == ".pdf":
            chunk_records = pdf_chunk_records(path)
        elif suffix == ".tex":
            chunk_records = latex_sectioned_records(path)
        elif suffix == ".md":
            chunk_records = markdown_sectioned_records(path)
        else:
            paragraphs = text_file_paragraphs(path)
            if not paragraphs:
                continue
            chunk_records = chunk_records_from_paragraphs(paragraphs, "chunk 1")
            for index, record in enumerate(chunk_records, start=1):
                record["locator"] = f"chunk {index}"

        if not chunk_records:
            continue

        title = humanize_title(path)

        for index, record in enumerate(chunk_records, start=1):
            text = record["text"]
            chunks.append(
                {
                    "id": chunk_id,
                    "path": relative_path,
                    "title": title,
                    "source_type": source_type(path),
                    "chunk_index": index,
                    "locator": record.get("locator"),
                    "page_start": record.get("page_start"),
                    "page_end": record.get("page_end"),
                    "cell_start": record.get("cell_start"),
                    "cell_end": record.get("cell_end"),
                    "text": text,
                }
            )
            chunk_id += 1

    return {
        "generated_from": "local repository files",
        "chunk_count": len(chunks),
        "source_count": len(files),
        "chunks": chunks,
    }


def main() -> None:
    payload = build_index()
    serialized = json.dumps(payload, indent=2, ensure_ascii=True)
    for output in OUTPUTS:
        output.write_text(serialized + "\n", encoding="utf-8")
    print(
        "Wrote local QA index with",
        payload["chunk_count"],
        "chunks from",
        payload["source_count"],
        "sources.",
    )


if __name__ == "__main__":
    main()
