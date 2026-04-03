import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.animation import FuncAnimation, PillowWriter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "codes" / "plots" / "yee_fdtd_tmz.gif"


def gaussian_pulse(step, t0=40, spread=12):
    return np.exp(-0.5 * ((step - t0) / spread) ** 2)


def simulate_frames():
    c0 = 299_792_458.0
    mu0 = 4.0e-7 * np.pi
    eps0 = 1.0 / (mu0 * c0**2)

    nx, ny = 200, 200
    dx = 1.0e-3
    dy = 1.0e-3
    dt_cfl = 1.0 / (c0 * np.sqrt((1.0 / dx**2) + (1.0 / dy**2)))
    dt = 0.99 * dt_cfl
    nsteps = 500

    eps_r = np.ones((nx, ny))
    cx, cy = nx // 2, ny // 2
    radius = 25
    for i in range(nx):
        for j in range(ny):
            if (i - cx) ** 2 + (j - cy) ** 2 < radius**2:
                eps_r[i, j] = 4.0

    eps = eps0 * eps_r

    ez = np.zeros((nx, ny), dtype=np.float64)
    hx = np.zeros((nx, ny - 1), dtype=np.float64)
    hy = np.zeros((nx - 1, ny), dtype=np.float64)
    frames = []

    src_i, src_j = nx // 4, ny // 2

    for n in range(nsteps):
        hx[:, :] -= (dt / mu0) * (ez[:, 1:] - ez[:, :-1]) / dy
        hy[:, :] += (dt / mu0) * (ez[1:, :] - ez[:-1, :]) / dx

        curl_h = np.zeros_like(ez)
        curl_h[1:-1, 1:-1] = (
            (hy[1:, 1:-1] - hy[:-1, 1:-1]) / dx
            - (hx[1:-1, 1:] - hx[1:-1, :-1]) / dy
        )

        ez[1:-1, 1:-1] += (dt / eps[1:-1, 1:-1]) * curl_h[1:-1, 1:-1]
        ez[src_i, src_j] += gaussian_pulse(n)

        ez[0, :] = 0.0
        ez[-1, :] = 0.0
        ez[:, 0] = 0.0
        ez[:, -1] = 0.0

        if n % 5 == 0:
            frames.append(ez.copy())

    return frames


def build_animation(frames):
    vmax = max(np.max(np.abs(frame)) for frame in frames)

    fig, ax = plt.subplots(figsize=(6, 5))
    image = ax.imshow(
        frames[0].T,
        origin="lower",
        cmap="RdBu",
        animated=True,
        aspect="auto",
        vmin=-vmax,
        vmax=vmax,
    )
    ax.set_title("2D FDTD TMz (Yee Algorithm)")
    ax.set_xlabel("x index")
    ax.set_ylabel("y index")

    def update(frame):
        image.set_array(frame.T)
        return [image]

    fig.tight_layout()
    animation = FuncAnimation(fig, update, frames=frames, interval=50, blit=True)
    return fig, animation


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    frames = simulate_frames()
    fig, animation = build_animation(frames)
    animation.save(OUTPUT_PATH, writer=PillowWriter(fps=20))
    plt.close(fig)
    print(f"Saved {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
