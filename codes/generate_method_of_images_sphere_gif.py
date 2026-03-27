from __future__ import annotations

import os
import tempfile
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", tempfile.mkdtemp(prefix="matplotlib-"))

import imageio.v2 as imageio
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


OUTPUT_DIR = Path("plots")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

GIF_PATH = OUTPUT_DIR / "method_of_images_grounded_sphere.gif"
PREVIEW_PATH = OUTPUT_DIR / "method_of_images_grounded_sphere_preview.png"

RADIUS = 1.0
Q = 1.0
XMIN, XMAX = -3.4, 3.4
ZMIN, ZMAX = -3.0, 3.0
GRID = 500
FRAMES = 44
DPI = 150


def sphere_potential(x: np.ndarray, z: np.ndarray, a: float) -> np.ndarray:
    """Grounded conducting sphere with an external point charge on the z-axis."""
    b = RADIUS**2 / a
    q_image = -Q * RADIUS / a

    r_real = np.sqrt(x**2 + (z - a) ** 2)
    r_image = np.sqrt(x**2 + (z - b) ** 2)
    phi = Q / r_real + q_image / r_image

    sphere_mask = x**2 + z**2 <= RADIUS**2
    phi = np.where(sphere_mask, np.nan, phi)
    return phi


def make_frame(a: float, index: int) -> np.ndarray:
    x = np.linspace(XMIN, XMAX, GRID)
    z = np.linspace(ZMIN, ZMAX, GRID)
    X, Z = np.meshgrid(x, z)
    phi = sphere_potential(X, Z, a)

    b = RADIUS**2 / a
    q_image = -Q * RADIUS / a

    fig, ax = plt.subplots(figsize=(7.4, 6.4), facecolor="#0A1220")
    ax.set_facecolor("#0A1220")

    finite_phi = phi[np.isfinite(phi)]
    vmax = np.percentile(finite_phi, 99.2)
    vmin = np.percentile(finite_phi, 8.0)

    im = ax.imshow(
        phi,
        extent=[XMIN, XMAX, ZMIN, ZMAX],
        origin="lower",
        cmap="magma",
        vmin=vmin,
        vmax=vmax,
        interpolation="bilinear",
    )

    contour_levels = np.linspace(max(vmin, 0.04), vmax * 0.95, 11)
    ax.contour(X, Z, np.nan_to_num(phi, nan=np.nanmin(finite_phi)), levels=contour_levels, colors="white", linewidths=0.55, alpha=0.38)

    sphere = plt.Circle((0, 0), RADIUS, facecolor="#081018", edgecolor="#DDE7F2", linewidth=2.2, zorder=8)
    ax.add_patch(sphere)
    ax.text(0, 0, "grounded\nsphere", color="#EAF2FA", fontsize=12, ha="center", va="center", zorder=9)

    ax.scatter([0], [a], s=150, color="#7CFFB2", edgecolor="white", linewidth=1.0, zorder=10)
    ax.scatter([0], [b], s=110, color="#FF8D7A", edgecolor="white", linewidth=0.8, zorder=10)

    ax.plot([0, 0], [b, a], color="#A8B9CC", linestyle="--", linewidth=1.0, alpha=0.65, zorder=6)
    ax.text(0.12, a + 0.12, "real charge  +q", color="#7CFFB2", fontsize=11, weight="bold")
    ax.text(0.12, b - 0.18, fr"                 q' = {q_image:+.2f}q", color="#FF8D7A", fontsize=10, weight="bold")

    ax.set_title("Method of Images: Grounded Sphere with a Moving External Charge", color="white", fontsize=10, pad=12)
    ax.text(
        0.02,
        0.04,
        fr"$a={a:.2f}R,\quad b=R^2/a={b:.2f}R,\quad q'=-qR/a={q_image:.2f}q$",
        transform=ax.transAxes,
        color="#D9E6F2",
        fontsize=11,
        va="bottom",
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#111A29", edgecolor="#2E435F", alpha=0.9),
    )

    ax.set_xlabel("x", color="white")
    ax.set_ylabel("z", color="white")
    ax.set_xlim(XMIN, XMAX)
    ax.set_ylim(ZMIN, ZMAX)
    ax.tick_params(colors="#D1DAE6")
    for spine in ax.spines.values():
        spine.set_color("#70859F")

    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.03)
    cbar.set_label(r"Potential $\phi(x,z)$", color="white")
    cbar.ax.yaxis.set_tick_params(color="#D1DAE6")
    plt.setp(cbar.ax.get_yticklabels(), color="#D1DAE6")

    fig.tight_layout()

    if index == 0:
        fig.savefig(PREVIEW_PATH, dpi=DPI, bbox_inches="tight", facecolor=fig.get_facecolor())

    fig.canvas.draw()
    w, h = fig.canvas.get_width_height()
    frame = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8).reshape(h, w, 4)[..., :3].copy()
    plt.close(fig)
    return frame


def main() -> None:
    # External source stays outside the sphere and oscillates along the symmetry axis.
    t = np.linspace(0.0, 2.0 * np.pi, FRAMES, endpoint=False)
    distances = 1.28 + 1.45 * (0.5 * (1.0 + np.sin(t)))

    frames = [make_frame(a, i) for i, a in enumerate(distances)]
    imageio.mimsave(GIF_PATH, frames, duration=0.085, loop=0)

    print(f"Saved GIF: {GIF_PATH.resolve()}")
    print(f"Saved preview: {PREVIEW_PATH.resolve()}")


if __name__ == "__main__":
    main()
