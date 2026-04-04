from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Plot the final Ez field from the C++ 2D TMz Yee FDTD solver."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("codes/cpp/yee_fdtd/output"),
        help="Directory containing Ez_final.csv and eps_r.csv",
    )
    parser.add_argument(
        "--save",
        type=Path,
        default=None,
        help="Optional path to save the figure instead of only showing it",
    )
    return parser.parse_args()


def read_summary(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    with path.open() as handle:
        for line in handle:
            line = line.strip()
            if not line or "=" not in line:
                continue
            key, value = line.split("=", maxsplit=1)
            values[key] = value
    return values


def main() -> None:
    args = parse_args()
    ez = np.loadtxt(args.output_dir / "Ez_final.csv", delimiter=",")
    eps_r = np.loadtxt(args.output_dir / "eps_r.csv", delimiter=",")
    summary = read_summary(args.output_dir / "run_summary.txt")

    dx = float(summary["dx"])
    dy = float(summary["dy"])
    x = np.arange(ez.shape[0], dtype=float) * dx
    y = np.arange(ez.shape[1], dtype=float) * dy
    x_max = x[-1] if x.size else 0.0
    y_max = y[-1] if y.size else 0.0
    x_grid, y_grid = np.meshgrid(x, y, indexing="ij")

    fig, ax = plt.subplots(figsize=(7.5, 6.0))
    scale = max(float(np.max(np.abs(ez))), 1.0e-12)
    image = ax.imshow(
        ez.T,
        origin="lower",
        cmap="RdBu_r",
        extent=(0.0, x_max, 0.0, y_max),
        vmin=-scale,
        vmax=scale,
    )
    ax.contour(
        x_grid,
        y_grid,
        eps_r,
        levels=[2.0],
        colors="gold",
        linewidths=1.2,
    )
    ax.set_title("C++ 2D TMz Yee FDTD: final Ez")
    ax.set_xlabel("x [m]")
    ax.set_ylabel("y [m]")
    fig.colorbar(image, ax=ax, shrink=0.88, label="Ez")

    if args.save is not None:
        fig.savefig(args.save, dpi=180, bbox_inches="tight")
        backend = plt.get_backend().lower()
        if "agg" in backend:
            plt.close(fig)
            return

    plt.show()


if __name__ == "__main__":
    main()
