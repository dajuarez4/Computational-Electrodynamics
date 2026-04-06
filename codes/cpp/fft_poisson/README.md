# 3D FFT Poisson Solver

This solver computes the electrostatic potential in a periodic 3D box by solving

$$
\nabla^2 \phi = -\rho / \varepsilon_0
$$

with a self-contained radix-2 FFT.

## Build

From `codes/cpp/fft_poisson` run:

```bash
make
```

## Run

Default physical case:

```bash
./fft_poisson_3d
```

Manufactured benchmark:

```bash
./fft_poisson_3d --case benchmark
```

Useful options:

- `--nx 64 --ny 64 --nz 64`
- `--lx 1.0 --ly 1.0 --lz 1.0`
- `--eps0 1.0`
- `--output output_3d`

Note: `nx`, `ny`, and `nz` must each be powers of two because the built-in FFT is radix-2.

## Output

The solver writes:

- `output_3d/solution.vti`
- `output_3d/run_summary.txt`

The `.vti` file contains:

- `phi`
- `rho`
- vector field `E`
- `E_magnitude`

If you run the benchmark case, the file also contains:

- `phi_exact`
- `error`

## Visualization

Open `output_3d/solution.vti` in ParaView and color by:

- `phi` for the potential
- `rho` for the charge density
- `E_magnitude` for field strength

You can also read the file in Python using `codes/yee_fdtd_vti.py`.
