# Repo Mindmap

This file gives a high-level map of how the repository is organized.

## Visual Map

```mermaid
flowchart LR
    A["Computational-Electrodynamics-"]

    A --> B["Theory + Notebooks"]
    A --> C["Problem Sets + Homework"]
    A --> D["Notes + Formula Sheets"]
    A --> E["Code + Solvers"]
    A --> F["Website + Interactive Pages"]
    A --> G["Publishing + Exports"]
    A --> H["Reference Texts"]

    B --> B1["notebooks/"]
    B1 --> B11["Core electrostatics
Dirac delta, Poisson, Laplace,
Green functions, images,
multipoles, dielectrics"]
    B1 --> B12["Jackson notebook studies
2.3, 2.11, 2.12, 2.20,
2.23, 2.28"]
    B1 --> B13["Computational notebooks
FFT Poisson, FDTD,
3D visualization, waveguides"]

    C --> C1["problems/"]
    C --> C2["Jackson-problems/"]
    C --> C3["Griffiths-problems/"]
    C1 --> C11["Topic problem sets
.tex sources + compiled PDFs"]
    C2 --> C21["Jackson chapter problem PDFs"]
    C3 --> C31["A&A-style Griffiths problem index
with paraphrased statements"]

    D --> D1["Formula Sheet/"]
    D --> D2["notes/"]
    D --> D3["notes-diego/"]
    D --> D4["slides/"]
    D1 --> D11["One-page formula sheets
LaTeX + PDFs"]
    D2 --> D21["Focused topic notes
Dirac delta, Poisson"]
    D3 --> D31["Personal chapter notes,
chapter PDFs, calculus references,
vector formulas"]
    D4 --> D41["Presentation PDFs"]

    E --> E1["codes/"]
    E1 --> E11["Python utilities
games, GIF generators,
plotting, VTK export"]
    E1 --> E12["codes/cpp/"]
    E12 --> E121["yee_fdtd/
2D + 3D Yee-grid solvers"]
    E12 --> E122["fft_poisson/
3D FFT Poisson solver"]
    E1 --> E13["codes/plots/
generated figures + animations"]

    F --> F1["docs/"]
    F --> F2["site/"]
    F1 --> F11["Published GitHub Pages site"]
    F11 --> F111["Main pages
index, topics, notes, visuals"]
    F11 --> F112["Interactive pages
lab, charge-hunt, flux-box,
fft-poisson viewers"]
    F11 --> F113["docs/assets/
GIFs, previews, screenshots"]
    F2 --> F21["Site mirror / alternate static pages
HTML, CSS, JS, repo index"]

    G --> G1["overleaf_uploads/"]
    G1 --> G11["formula_sheets_project/"]
    G1 --> G12["problems_project/"]
    G --> G2["Reusable export-ready copies
for external editing/publishing"]

    H --> H1["griffiths_4ed.pdf"]
    H --> H2["Classical_Electrodynamics_Jackson_3rd_.pdf"]
```

## Text Outline

- `notebooks/`
  Theory notebooks, derivations, computational experiments, Jackson-focused worked studies, and visualization notebooks.
- `problems/`
  Topic-centered problem sets in LaTeX and PDF.
- `Jackson-problems/`
  Chapter-based Jackson problem material.
- `Griffiths-problems/`
  Griffiths exercise index and solution-related material.
- `Formula Sheet/`
  Compact formula sheets in both `.tex` and `.pdf`.
- `notes/` and `notes-diego/`
  Structured notes, chapter summaries, calculus support material, and personal study references.
- `slides/`
  Presentation PDFs and lecture-style material.
- `codes/`
  Python scripts for animations, games, numerical workflows, plotting, and exports.
- `codes/cpp/`
  Standalone C++ solvers, especially `yee_fdtd/` and `fft_poisson/`.
- `docs/`
  The main static website deployment target, including interactive pages and media assets.
- `site/`
  A parallel static-site layer with overlapping pages and supporting assets.
- `overleaf_uploads/`
  Exportable copies of formula-sheet and problem-set projects for external editing workflows.
- Root PDFs
  Primary textbook references and a few top-level artifacts used to support the study workflow.

## How To Read This Repo

- `Theory -> problems -> notes -> code -> visualization` is the main academic workflow.
- `docs/` is the public-facing layer.
- `codes/` and `codes/cpp/` are the implementation layer.
- `notebooks/`, `problems/`, `Formula Sheet/`, and `notes-diego/` are the learning-content core.
