#!/usr/bin/env python3

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
REPO_SLUG = "dajuarez4/Computational-Electrodynamics"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO_SLUG}/main/"
BLOB_BASE = f"https://github.com/{REPO_SLUG}/blob/main/"
TEXT_LIKE_EXTENSIONS = {
    "",
    ".css",
    ".html",
    ".ipynb",
    ".js",
    ".json",
    ".md",
    ".py",
    ".tex",
    ".txt",
}
RAW_EXTENSIONS = {
    ".gif",
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
    ".svg",
    ".webp",
}
EXCLUDED_PATHS = {
    "docs/repo-index.json",
    "site/repo-index.json",
}
GROUP_LABELS = {
    "docs": "Website",
    "site": "Website",
    "notebooks": "Notebooks",
    "notes": "Repo Notes",
    "notes-diego": "Diego Notes",
    "problems": "Problem Sets",
    "Formula Sheet": "Formula Sheets",
    "codes": "Code",
    "overleaf_uploads": "Overleaf Uploads",
    "Jackson-problems": "Jackson Problems",
}
GROUP_PRIORITIES = {
    "docs": 24,
    "site": 24,
    "notebooks": 86,
    "notes": 84,
    "notes-diego": 88,
    "problems": 80,
    "Formula Sheet": 78,
    "codes": 58,
    "overleaf_uploads": 28,
    "Jackson-problems": 20,
}
PAGE_META = {
    "index.html": {
        "title": "Home",
        "description": "Main landing page for the course website.",
        "aliases": ["home", "landing page", "main page"],
        "priority": 130,
    },
    "topics.html": {
        "title": "Topics",
        "description": "Topic directory for notebooks, notes, formula sheets, and problems.",
        "aliases": ["topic page", "topic directory", "course topics"],
        "priority": 126,
    },
    "notes.html": {
        "title": "Notes",
        "description": "Study notes, chapter PDFs, and reference material.",
        "aliases": ["study notes", "revision notes", "pdf notes"],
        "priority": 126,
    },
    "visuals.html": {
        "title": "Visuals",
        "description": "Animations, plots, and visual intuition for the project.",
        "aliases": ["visuals", "animations", "figures"],
        "priority": 122,
    },
    "charge-hunt.html": {
        "title": "Charge Hunt",
        "description": "Interactive Dirac-delta game.",
        "aliases": ["game", "dirac delta game", "charge hunt game"],
        "priority": 122,
    },
    "lab.html": {
        "title": "Mini Electrodynamics Lab",
        "description": "Interactive electrostatics playground with charges and fields.",
        "aliases": ["lab", "mini lab", "electrodynamics lab", "playground"],
        "priority": 124,
    },
}
FILE_META = {
    "README.md": {
        "title": "Repository README",
        "description": "Project overview and topic map.",
        "aliases": ["readme", "overview", "repository guide"],
        "priority": 92,
    },
    "notes-diego/chapter-1/chapter-1.pdf": {
        "title": "Jackson Chapter 1 PDF",
        "aliases": ["chapter 1 pdf", "jackson chapter 1", "electrostatics chapter"],
        "priority": 86,
    },
    "notes-diego/chapter-1/chapter_1_notes.pdf": {
        "title": "Electrostatics Notes (Chapter 1)",
        "description": "Focused Chapter 1 notes used as the main electrostatics note link on the site.",
        "aliases": ["electrostatics notes", "jackson electrostatics", "chapter 1 notes", "survival notes"],
        "priority": 96,
    },
    "notes-diego/chapter-1/chapter-1.md": {
        "title": "Chapter 1 Markdown Notes",
        "aliases": ["chapter 1 markdown", "chapter 1 source"],
        "priority": 78,
    },
    "notes-diego/chapter-2/chapter-2.pdf": {
        "title": "Jackson Chapter 2 PDF",
        "aliases": ["chapter 2 pdf", "jackson chapter 2"],
        "priority": 84,
    },
    "notes-diego/chapter-2/chapter_2_notes.pdf": {
        "title": "Method of Images Notes (Chapter 2)",
        "description": "Focused Chapter 2 notes used as the method-of-images note link on the site.",
        "aliases": ["method of images", "method of images notes", "chapter 2 notes", "boundary methods"],
        "priority": 100,
    },
    "notes-diego/chapter-3/chapter_3_notes.pdf": {
        "title": "Chapter 3 Notes",
        "aliases": ["chapter 3 notes"],
        "priority": 80,
    },
    "notes-diego/chapter-4/chapter_4_notes.pdf": {
        "title": "Chapter 4 Notes",
        "aliases": ["chapter 4 notes"],
        "priority": 80,
    },
    "notes-diego/chapter-5/chapter-5_notes.pdf": {
        "title": "Chapter 5 Notes",
        "aliases": ["chapter 5 notes"],
        "priority": 80,
    },
    "notes/Poisson_equation_notes.pdf": {
        "title": "Poisson Equation Notes",
        "priority": 90,
    },
    "notes/Dirac_Delta_notes.pdf": {
        "title": "Dirac Delta Notes",
        "priority": 90,
    },
    "codes/plots/method_of_images_grounded_sphere.gif": {
        "title": "Grounded Sphere Animation",
        "aliases": ["method of images gif", "grounded sphere gif", "animation"],
        "priority": 88,
    },
    "codes/generate_method_of_images_sphere_gif.py": {
        "title": "Grounded Sphere Animation Script",
        "aliases": ["method of images script", "sphere gif script"],
        "priority": 72,
    },
}


def pretty_label(text: str) -> str:
    cleaned = re.sub(r"[_-]+", " ", text.replace("%20", " "))
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return text
    words = []
    for word in cleaned.split(" "):
        if word.isupper():
            words.append(word)
        elif len(word) <= 2 and word.isalpha():
            words.append(word.upper() if word in {"md", "js"} else word)
        else:
            words.append(word[:1].upper() + word[1:])
    return " ".join(words)


def classify_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".html":
        return "page"
    if suffix == ".pdf":
        return "pdf"
    if suffix == ".ipynb":
        return "notebook"
    if suffix in {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}:
        return "image"
    if suffix in {".py", ".js"}:
        return "script"
    if suffix == ".css":
        return "style"
    if suffix == ".md":
        return "markdown"
    if suffix == ".tex":
        return "latex"
    if suffix == ".json":
        return "data"
    if suffix == ".txt":
        return "text"
    return "file"


def rel_to_internal_url(rel_path: Path, root_folder: str) -> str:
    quoted = quote(rel_path.relative_to(root_folder).as_posix(), safe="/")
    return "./" + quoted


def rel_to_site_repo_url(rel_path: Path) -> str:
    quoted = quote(rel_path.as_posix(), safe="/")
    return "../" + quoted


def rel_to_docs_repo_url(rel_path: Path) -> str:
    quoted = quote(rel_path.as_posix(), safe="/")
    if rel_path.suffix.lower() in RAW_EXTENSIONS:
        return RAW_BASE + quoted
    return BLOB_BASE + quoted


def should_include(rel_path: Path, context: str) -> bool:
    if rel_path.as_posix() in EXCLUDED_PATHS:
        return False
    if any(part.startswith(".") for part in rel_path.parts):
        return False
    top = rel_path.parts[0]
    if context == "docs" and top == "site":
        return False
    if context == "site" and top == "docs":
        return False
    return True


def collect_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel_path = path.relative_to(ROOT)
        if ".git" in rel_path.parts:
            continue
        files.append(rel_path)
    return sorted(files, key=lambda item: item.as_posix().lower())


def build_entry(rel_path: Path, context: str) -> dict[str, object]:
    posix_path = rel_path.as_posix()
    file_meta = FILE_META.get(posix_path, {})
    kind = classify_kind(rel_path)
    top = rel_path.parts[0]
    group = GROUP_LABELS.get(top, "Repository")
    priority = GROUP_PRIORITIES.get(top, 40)

    if top == context:
        internal_rel = rel_path.relative_to(context).as_posix()
        page_meta = PAGE_META.get(internal_rel, {})
        if page_meta:
            title = page_meta["title"]
            description = page_meta["description"]
            aliases = list(page_meta["aliases"])
            priority = int(page_meta["priority"])
        else:
            title = pretty_label(rel_path.stem or rel_path.name)
            description = f"Internal {kind} from the website."
            aliases = [group.lower(), kind]
        url = rel_to_internal_url(rel_path, context)
        open_in = "self" if kind == "page" else "blank"
    else:
        title = file_meta.get("title", pretty_label(rel_path.stem or rel_path.name))
        description = file_meta.get("description", f"{group} file in the repository.")
        aliases = list(file_meta.get("aliases", []))
        if context == "docs":
            url = rel_to_docs_repo_url(rel_path)
            open_in = "blank"
        else:
            url = rel_to_site_repo_url(rel_path)
            open_in = "self" if kind == "page" else "blank"

    priority = max(priority, int(file_meta.get("priority", 0)))
    aliases.extend([group.lower(), kind, rel_path.suffix.lower().lstrip(".")])

    return {
        "title": title,
        "path": posix_path,
        "url": url,
        "kind": kind,
        "group": group,
        "description": description,
        "aliases": sorted({alias for alias in aliases if alias}),
        "openIn": open_in,
        "priority": priority,
    }


def build_index(context: str) -> list[dict[str, object]]:
    entries = []
    for rel_path in collect_files():
        if not should_include(rel_path, context):
            continue
        entries.append(build_entry(rel_path, context))
    entries.sort(key=lambda entry: (-int(entry["priority"]), str(entry["title"]).lower(), str(entry["path"]).lower()))
    return entries


def write_index(context: str) -> None:
    target = ROOT / context / "repo-index.json"
    payload = {
        "context": context,
        "count": 0,
        "entries": build_index(context),
    }
    payload["count"] = len(payload["entries"])
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    write_index("docs")
    write_index("site")


if __name__ == "__main__":
    main()
