from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


OUTPUT_DIR = Path("codes/plots")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def delta_gaussian(x: np.ndarray, epsilon: float, center: float) -> np.ndarray:
    return np.exp(-((x - center) / epsilon) ** 2) / (np.sqrt(np.pi) * epsilon)


def charge_density_profile(x: np.ndarray, charges: list[tuple[float, float]], sigma: float = 0.12) -> np.ndarray:
    rho = np.zeros_like(x)
    for location, strength in charges:
        rho += strength * np.exp(-((x - location) / sigma) ** 2) / (np.sqrt(np.pi) * sigma)
    return rho


def sampler_plot() -> None:
    x = np.linspace(-4.0, 4.0, 1800)
    f = np.cos(2 * x) + 0.15 * x**3
    center = 1.1
    epsilons = [0.7, 0.32, 0.12]

    fig, axes = plt.subplots(2, 1, figsize=(10, 7), sharex=True)
    axes[0].plot(x, f, lw=2.5, color="#33B5E5", label=r"$f(x)$")
    for eps, color in zip(epsilons, ["#FDB813", "#FF7A59", "#7ED957"]):
        kernel = delta_gaussian(x, eps, center)
        overlap = np.trapz(f * kernel, x)
        axes[0].plot(x, kernel, lw=2, color=color, label=fr"$\delta_{{\varepsilon}}(x-a), \ \varepsilon={eps}$")
        axes[0].scatter([center], [np.cos(2 * center) + 0.15 * center**3], color=color, s=35)
        axes[1].plot([eps], [abs(overlap - (np.cos(2 * center) + 0.15 * center**3))], "o", color=color, ms=9)

    eps_grid = np.linspace(0.08, 0.8, 40)
    errors = []
    exact = np.cos(2 * center) + 0.15 * center**3
    for eps in eps_grid:
        kernel = delta_gaussian(x, eps, center)
        errors.append(abs(np.trapz(f * kernel, x) - exact))
    axes[1].plot(eps_grid, errors, color="#8A6DFF", lw=2.5)

    axes[0].set_title("Dirac Delta v2: Sampling by a Delta-Sequence")
    axes[0].set_ylabel("Amplitude")
    axes[0].legend(frameon=False, fontsize=9, ncol=2)
    axes[0].grid(alpha=0.25)
    axes[1].set_title(r"Convergence of $\int f(x)\delta_\varepsilon(x-a)\,dx \to f(a)$")
    axes[1].set_xlabel(r"$\varepsilon$")
    axes[1].set_ylabel("Absolute error")
    axes[1].set_yscale("log")
    axes[1].grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "dirac_delta_v2_sampling.png", dpi=220, bbox_inches="tight")
    plt.close(fig)


def hunt_plot() -> None:
    x = np.linspace(-4.0, 4.0, 1800)
    charges = [(-2.35, 0.9), (-0.5, -0.65), (1.5, 1.15), (2.7, -0.55)]
    rho = charge_density_profile(x, charges)

    centers = np.linspace(-4.0, 4.0, 260)
    eps_grid = np.linspace(0.06, 0.8, 180)
    score = np.zeros((len(eps_grid), len(centers)))

    for i, eps in enumerate(eps_grid):
        for j, center in enumerate(centers):
            kernel = delta_gaussian(x, eps, center)
            overlap = np.trapz(rho * kernel, x)
            score[i, j] = abs(overlap)

    fig, axes = plt.subplots(2, 1, figsize=(10, 7), sharex=False)
    axes[0].plot(x, rho, color="#33B5E5", lw=2.5, label=r"line-charge density $\rho(x)$")
    for loc, strength in charges:
        axes[0].axvline(loc, color="#FF7A59" if strength > 0 else "#8A6DFF", ls="--", alpha=0.55)
    axes[0].set_title("Dirac Delta v2: Charge Hunt")
    axes[0].set_ylabel(r"$\rho(x)$")
    axes[0].legend(frameon=False)
    axes[0].grid(alpha=0.25)

    im = axes[1].imshow(
        score,
        extent=[centers.min(), centers.max(), eps_grid.max(), eps_grid.min()],
        aspect="auto",
        cmap="inferno",
    )
    axes[1].set_title(r"Detector response $|\int \rho(x)\delta_\varepsilon(x-a)\,dx|$")
    axes[1].set_xlabel("Sampling point a")
    axes[1].set_ylabel(r"$\varepsilon$")
    fig.colorbar(im, ax=axes[1], label="response")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "dirac_delta_v2_charge_hunt.png", dpi=220, bbox_inches="tight")
    plt.close(fig)

    fig_density, ax_density = plt.subplots(figsize=(10, 3.8))
    ax_density.plot(x, rho, color="#33B5E5", lw=2.5, label=r"line-charge density $\rho(x)$")
    for loc, strength in charges:
        ax_density.axvline(loc, color="#FF7A59" if strength > 0 else "#8A6DFF", ls="--", alpha=0.55)
    ax_density.set_title("Dirac Delta v2: Charge Density Profile")
    ax_density.set_xlabel("Position x")
    ax_density.set_ylabel(r"$\rho(x)$")
    ax_density.legend(frameon=False)
    ax_density.grid(alpha=0.25)
    fig_density.tight_layout()
    fig_density.savefig(OUTPUT_DIR / "dirac_delta_v2_charge_density.png", dpi=220, bbox_inches="tight")
    plt.close(fig_density)

    fig_heat, ax_heat = plt.subplots(figsize=(9.6, 5.8))
    im = ax_heat.imshow(
        score,
        extent=[centers.min(), centers.max(), eps_grid.max(), eps_grid.min()],
        aspect="auto",
        cmap="inferno",
    )
    ax_heat.set_title(r"Dirac Delta v2 Heatmap: $|\int \rho(x)\delta_\varepsilon(x-a)\,dx|$")
    ax_heat.set_xlabel("Sampling point a")
    ax_heat.set_ylabel(r"$\varepsilon$")
    cbar = fig_heat.colorbar(im, ax=ax_heat)
    cbar.set_label("response")
    fig_heat.tight_layout()
    fig_heat.savefig(OUTPUT_DIR / "dirac_delta_v2_charge_hunt_heatmap.png", dpi=220, bbox_inches="tight")
    plt.close(fig_heat)


if __name__ == "__main__":
    sampler_plot()
    hunt_plot()
    print(f"Saved plots to {OUTPUT_DIR.resolve()}")
