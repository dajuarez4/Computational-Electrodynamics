#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np


OPTIONAL_ARRAYS = ["phi", "rho", "phi_exact", "error", "ex", "ey", "ez", "x", "y", "z"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Package AMReX benchmark .npy outputs into the .npz format expected by the notebook."
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        required=True,
        help="Directory containing phi.npy and optional companion arrays.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Path to the output .npz file.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_dir = args.input_dir.resolve()
    output_path = args.output.resolve()

    phi_path = input_dir / "phi.npy"
    if not phi_path.exists():
        raise FileNotFoundError(f"Missing required array: {phi_path}")

    payload: dict[str, np.ndarray] = {}
    for name in OPTIONAL_ARRAYS:
        path = input_dir / f"{name}.npy"
        if path.exists():
            payload[name] = np.load(path)

    label_path = input_dir / "label.txt"
    if label_path.exists():
        payload["label"] = np.array(label_path.read_text(encoding="utf-8").strip())

    output_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(output_path, **payload)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
