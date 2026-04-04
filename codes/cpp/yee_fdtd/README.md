# Yee FDTD Solvers

This folder contains:

- a 2D TMz solver matching [notebooks/Yee_FTD_method.ipynb](../../notebooks/Yee_FTD_method.ipynb)
- a 3D Yee solver that writes ParaView-ready volume files

## 2D TMz Solver

The 2D standalone C++ solver matches the setup used in [notebooks/Yee_FTD_method.ipynb](../../notebooks/Yee_FTD_method.ipynb):

- `Nx = Ny = 200`
- `dx = dy = 1.0e-3 m`
- `dt = 0.99 * dt_CFL`
- Gaussian source at `(Nx/4, Ny/2)`
- dielectric disk with `eps_r = 4` and radius `25`
- PEC boundaries on all four edges

## Build

From [`codes/cpp/yee_fdtd`](.) run:

```bash
make
```

or

```bash
clang++ -std=c++17 -O3 -Wall -Wextra -pedantic yee_fdtd_tmz.cpp -o yee_fdtd_tmz
clang++ -std=c++17 -O3 -Wall -Wextra -pedantic yee_fdtd_3d.cpp -o yee_fdtd_3d
```

## Run 2D

```bash
./yee_fdtd_tmz
```

Useful options:

- `--nsteps 500`
- `--save-every 5`
- `--output output`
- `--vtk 0` to disable VTK frame snapshots

## Output

The solver writes:

- `output/Ez_final.csv` for direct Python or notebook comparison
- `output/eps_r.csv` for the dielectric map
- `output/Ez_final.vtk` and `output/eps_r.vtk` for ParaView
- `output/vtk/frame_XXXX.vtk` snapshots when VTK output is enabled
- `output/source_history.csv`
- `output/run_summary.txt`

## Quick Plot

From the repository root you can preview the final field with:

```bash
python3 codes/plot_yee_fdtd_cpp_output.py --output-dir codes/cpp/yee_fdtd/output
```

If ParaView is inconvenient, you can also inspect the 3D results in:

```bash
notebooks/Visualizing 3D Yee FDTD Output.ipynb
```

## 3D Solver

The 3D solver is the direct volumetric analog of the notebook problem:

- Gaussian pulse source along `Ez`
- dielectric sphere with `eps_r = 4`
- PEC boundaries
- ParaView output as `.vti` volumes and a `.pvd` time-series manifest

Run it with:

```bash
./yee_fdtd_3d
```

Useful options:

- `--nx 48 --ny 48 --nz 48`
- `--nsteps 160`
- `--save-every 20`
- `--frames 0` to skip the time-series files
- `--output output_3d`

The 3D solver writes:

- `output_3d/E_final.vti`
- `output_3d/material_map.vti`
- `output_3d/frames/frame_XXXX.vti`
- `output_3d/frames.pvd`
- `output_3d/source_history.csv`
- `output_3d/run_summary.txt`

In ParaView, open `frames.pvd` for the time series or `E_final.vti` for the final field only.
