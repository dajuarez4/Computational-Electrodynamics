# Computational-Electrodynamics-

This repository is a graduate-level study of electrodynamics based on *Classical Electrodynamics by J. D. Jackson*, combining rigorous theoretical derivations with computational implementations and visualizations.

![Python](https://img.shields.io/badge/Python-3.x-blue)
![Jupyter](https://img.shields.io/badge/Jupyter-Notebook-orange)
![Physics](https://img.shields.io/badge/Physics-Electrodynamics-purple)
![Status](https://img.shields.io/badge/Status-In%20Progress-green)
---

## Approach

Each topic follows a structured workflow:

> **Theory → Code → Visualization**

- Derivations written in LaTeX within Jupyter notebooks  
- Numerical implementations using Python  
- Visualizations to develop physical intuition  

---

## Repository Structure

- `notebooks/` — Theory, derivations, and computational explorations  
- `problems/` — Topic-based problem sets in LaTeX and PDF  
- `Formula Sheet/` — One-page quad-chart formula sheets in LaTeX and PDF  

---

## Topics Covered

- Dirac delta functions  
- Poisson and Laplace equations  
- Green’s functions  
- Method of images  
- Multipole expansion  
- Dielectrics  
- Electromagnetic radiation  

---

## Tools & Technologies

- Python (NumPy, SciPy, Matplotlib)
- Jupyter Notebook
- LaTeX (for mathematical derivations)

---
## Notebooks

- [Dirac delta functions](./notebooks/Dirac%20delta%20functions.ipynb)
- [Poisson's equation](./notebooks/Poisson%27s%20equation.ipynb)
- [Laplace's equation](./notebooks/Laplace%27s%20equation.ipynb)
- [Green's functions in electrostatics](./notebooks/Green%27s%20functions%20in%20electrostatics.ipynb)
- [Method of images in electrostatics](./notebooks/Method%20of%20images%20in%20electrostatics.ipynb)
- [Multipole expansion in electrostatics](./notebooks/Multipole%20expansion%20in%20electrostatics.ipynb)
- [Dielectrics in electrostatics](./notebooks/Dielectrics%20in%20electrostatics.ipynb)
- [Electromagnetic Radiation](./notebooks/Electromagnetic%20Radiation.ipynb)

---

## Problem Sets

- [Dirac delta problems (PDF)](./problems/Dirac_Delta_problems.pdf)
- [Poisson's equation problems (PDF)](./problems/Poisson_equation.pdf)
- [Laplace's equation problems (PDF)](./problems/Laplace_equation.pdf)
- [Green's functions problems (PDF)](./problems/Green_functions.pdf)
- [Method of images problems (PDF)](./problems/method_of_images.pdf)
- [Multipole expansion problems (PDF)](./problems/multipole_expansion.pdf)
- [Dielectrics problems (PDF)](./problems/dielectrics_problems.pdf)
- [Electromagnetic radiation problems (PDF)](./problems/electro_magnetic_radiation.pdf)

---

## Formula Sheets

- [Dirac delta formula sheet (PDF)](./Formula%20Sheet/dirac_delta_formula_sheet.pdf)
- [Poisson's equation formula sheet (PDF)](./Formula%20Sheet/poisson_formula_sheet.pdf)
- [Laplace's equation formula sheet (PDF)](./Formula%20Sheet/laplace_formula_sheet.pdf)
- [Green's functions formula sheet (PDF)](./Formula%20Sheet/greens_functions_formula_sheet.pdf)
- [Method of images formula sheet (PDF)](./Formula%20Sheet/method_of_images_formula_sheet.pdf)
- [Multipole expansion formula sheet (PDF)](./Formula%20Sheet/multipole_formula_sheet.pdf)
- [Dielectrics formula sheet (PDF)](./Formula%20Sheet/dielectrics_formula_sheet.pdf)
- [Electromagnetic radiation formula sheet (PDF)](./Formula%20Sheet/electromagnetic_radiation_formula_sheet.pdf)

---

## Visualizations

The repository also includes interactive and static visualizations that build intuition for how the Dirac delta function behaves as a sampling device rather than as an ordinary spike.

### Dirac Delta v2: Charge Hunt

The charge-density plot shows a one-dimensional localized source profile with positive and negative contributions. The heatmap shows the detector response `|∫ ρ(x) δ_ε(x-a) dx|`, which becomes strongest when the sampling point is centered on a source and the kernel is sufficiently narrow.

![Dirac Delta v2 Charge Density](./codes/plots/dirac_delta_v2_charge_density.png)

![Dirac Delta v2 Heatmap](./codes/plots/dirac_delta_v2_charge_hunt_heatmap.png)

The animation below shows the grounded-sphere method of images: as the external source moves, the image charge changes position and magnitude so that the sphere remains at zero potential.

![Method of Images Grounded Sphere](./codes/plots/method_of_images_grounded_sphere.gif)

---

## Goal

The goal of this project is to bridge **analytical electrodynamics** and **computational physics**, enabling a deeper understanding of physical phenomena through both theory and simulation.

---

## Future Work

- Advanced numerical solvers for boundary value problems  
- Interactive visualizations  
- Time-dependent electromagnetic simulations  
- Extensions to relativistic electrodynamics  

---

## Contributions

This is a personal academic project, but suggestions, ideas, and collaborations are always welcome.

---

## Reference

Jackson, J. D. *Classical Electrodynamics*, 3rd Edition.

## Problem solved by Dr Baird
* [Good notes, problem-solving and lectures by Dr Baird](https://www.wtamu.edu/~cbaird/courses.html)
