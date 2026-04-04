# C++ Solvers Guide

This folder contains the C++ electrodynamics solvers for the repository.

Current solver set:

- `yee_fdtd/yee_fdtd_tmz.cpp` for the 2D TMz Yee FDTD problem that matches the notebook
- `yee_fdtd/yee_fdtd_3d.cpp` for the 3D Yee FDTD version with ParaView output

The Python visualization helper for the 2D solver is:

- `codes/plot_yee_fdtd_cpp_output.py`

## Requirements

You need:

- a C++17 compiler such as `clang++` or `g++`
- `make`
- Python 3 with `numpy` and `matplotlib` for the 2D plot helper
- ParaView if you want to inspect the 3D volume output

## Folder Layout

```text
cpp/
  README.md
  yee_fdtd/
    Makefile
    yee_fdtd_tmz.cpp
    yee_fdtd_3d.cpp
```

## Quick Start

From the repository root:

```bash
cd cpp/yee_fdtd
make
```

That builds:

- `yee_fdtd_tmz`
- `yee_fdtd_3d`

## 2D Solver

The 2D solver matches the setup used in `notebooks/Yee_FTD_method.ipynb`.

### Build Only the 2D Solver

From the repository root:

```bash
cd cpp/yee_fdtd
make yee_fdtd_tmz
```

### Run the 2D Solver

From `cpp/yee_fdtd`:

```bash
./yee_fdtd_tmz
```

This writes output into:

- `cpp/yee_fdtd/output/Ez_final.csv`
- `cpp/yee_fdtd/output/eps_r.csv`
- `cpp/yee_fdtd/output/Ez_final.vtk`
- `cpp/yee_fdtd/output/eps_r.vtk`
- `cpp/yee_fdtd/output/source_history.csv`
- `cpp/yee_fdtd/output/run_summary.txt`
- `cpp/yee_fdtd/output/vtk/frame_XXXX.vtk`

### Useful 2D Options

Run from `cpp/yee_fdtd`:

```bash
./yee_fdtd_tmz --nsteps 500 --save-every 5 --output output --vtk 1
```

Meaning:

- `--nsteps 500` sets the number of time steps
- `--save-every 5` writes a VTK snapshot every 5 steps
- `--output output` chooses the output folder
- `--vtk 0` disables the snapshot series

### Visualize the 2D Result with Python

After running the solver, go back to the repository root:

```bash
cd ../..
python3 codes/plot_yee_fdtd_cpp_output.py --output-dir cpp/yee_fdtd/output
```

That script reads:

- `Ez_final.csv`
- `eps_r.csv`
- `run_summary.txt`

and shows:

- the final `Ez` field as a heatmap
- the dielectric interface as a contour

### Save the 2D Plot to an Image

From the repository root:

```bash
python3 codes/plot_yee_fdtd_cpp_output.py \
  --output-dir cpp/yee_fdtd/output \
  --save cpp/yee_fdtd/output/yee_fdtd_cpp_plot.png
```

## 3D Solver

The 3D solver is the volumetric version of the same idea:

- Gaussian source added to `Ez`
- dielectric sphere with `eps_r = 4`
- PEC boundaries
- ParaView-ready output

### Build Only the 3D Solver

From the repository root:

```bash
cd cpp/yee_fdtd
make yee_fdtd_3d
```

### Run the 3D Solver

From `cpp/yee_fdtd`:

```bash
./yee_fdtd_3d
```

Default output goes to:

- `cpp/yee_fdtd/output_3d/E_final.vti`
- `cpp/yee_fdtd/output_3d/material_map.vti`
- `cpp/yee_fdtd/output_3d/frames/frame_XXXX.vti`
- `cpp/yee_fdtd/output_3d/frames.pvd`
- `cpp/yee_fdtd/output_3d/source_history.csv`
- `cpp/yee_fdtd/output_3d/run_summary.txt`

### Useful 3D Options

Run from `cpp/yee_fdtd`:

```bash
./yee_fdtd_3d --nx 48 --ny 48 --nz 48 --nsteps 160 --save-every 20 --output output_3d
```

You can also disable the frame series:

```bash
./yee_fdtd_3d --frames 0
```

## Open the 3D Result in ParaView

After running the 3D solver:

1. Open ParaView.
2. Choose `File -> Open`.
3. Open `cpp/yee_fdtd/output_3d/frames.pvd` for the time series.
4. Click `Apply`.
5. In the coloring menu, choose `E_magnitude` to see field intensity.
6. Use `Slice`, `Contour`, or `Volume Rendering` depending on what you want to inspect.

Useful files:

- Open `frames.pvd` for the animation sequence
- Open `E_final.vti` for the final 3D field only
- Open `material_map.vti` to inspect the dielectric sphere

## Recommended Workflow

If you want the cleanest comparison workflow:

1. Run the 2D notebook version.
2. Run `cpp/yee_fdtd/yee_fdtd_tmz`.
3. Plot the C++ 2D result with `codes/plot_yee_fdtd_cpp_output.py`.
4. Run `cpp/yee_fdtd/yee_fdtd_3d`.
5. Open `frames.pvd` in ParaView.

## Notes

- Run the Python plotting script from the repository root so the relative paths stay simple.
- The current Python helper is for the 2D solver.
- The 3D workflow is intended for ParaView rather than Matplotlib.
