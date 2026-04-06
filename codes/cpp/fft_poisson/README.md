# 3D FFT Poisson Solver

This solver computes the electrostatic potential in a periodic 3D box by solving

$$
\nabla^2 \phi = -\rho / \varepsilon_0
$$

with a self-contained radix-2 FFT.

## What This Solver Does

- solves Poisson's equation on a periodic 3D domain
- writes ParaView-readable output as `.vti`
- supports two cases:
  - `gaussians` for a physical positive/negative Gaussian charge distribution
  - `benchmark` for an exact manufactured solution

## Quick Start

From the repository root:

```bash
cd codes/cpp/fft_poisson
make
./fft_poisson_3d
```

That generates:

- `codes/cpp/fft_poisson/output_3d/solution.vti`
- `codes/cpp/fft_poisson/output_3d/run_summary.txt`

## Build

If you are already inside `codes/cpp/fft_poisson`, run:

```bash
make
```

This builds:

- `fft_poisson_3d`

## Run

### Default Physical Case

From `codes/cpp/fft_poisson`:

```bash
./fft_poisson_3d
```

This uses the `gaussians` case and writes output to `output_3d`.

### Exact Benchmark Case

```bash
./fft_poisson_3d --case benchmark
```

Use this case if you want to verify that the numerical solution matches a known analytic solution.

## Useful Options

Example:

```bash
./fft_poisson_3d --case gaussians --nx 64 --ny 64 --nz 64 --lx 1.0 --ly 1.0 --lz 1.0 --eps0 1.0 --output output_3d
```

Available options:

- `--nx 64 --ny 64 --nz 64`
- `--lx 1.0 --ly 1.0 --lz 1.0`
- `--eps0 1.0`
- `--case gaussians`
- `--case benchmark`
- `--output output_3d`

Important:

- `nx`, `ny`, and `nz` must each be powers of two because the built-in FFT is radix-2

## Output Files

The solver writes:

- `output_3d/solution.vti`
- `output_3d/run_summary.txt`

`solution.vti` contains:

- `phi`
- `rho`
- vector field `E`
- `E_magnitude`

If you run the benchmark case, the file also contains:

- `phi_exact`
- `error`

`run_summary.txt` contains:

- grid size
- domain lengths
- residual
- field magnitudes
- benchmark error metrics when applicable

## Open in ParaView

After running the solver:

1. Open ParaView.
2. Click `File -> Open`.
3. Select `codes/cpp/fft_poisson/output_3d/solution.vti`.
4. Click `Apply`.
5. In the coloring dropdown, choose one of:
   - `phi`
   - `rho`
   - `E_magnitude`

Recommended first views:

- `phi` to see the electrostatic potential
- `rho` to see the source distribution
- `E_magnitude` to see field intensity

Good ParaView filters for this file:

- `Slice`
- `Contour`
- `Volume`

## Clean Build Artifacts

From `codes/cpp/fft_poisson`:

```bash
make clean
```

## Python Reader

You can also read the generated `.vti` file in Python using:

- `codes/yee_fdtd_vti.py`
