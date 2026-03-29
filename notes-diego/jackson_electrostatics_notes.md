# Electrostatics Notes I Would Actually Use

**Computational Electrodynamics**  
**Diego Juarez**  
**March 28, 2026**

A compact Jackson-centered roadmap for the electrostatics part of the course: what matters, what connects, and what I should be checking when a solution starts to feel slippery.

## Why I made this note

The point here is not to rewrite the whole book. The point is to keep the structure of electrostatics visible in one place, in a way that is usable while studying or solving problems.

What I want this note to do:

- keep the big picture visible across topics
- collect the equations that keep reappearing
- give short sanity checks that catch bad solutions early
- sound more like actual study notes than a polished textbook chapter

## 1. Electrostatics is really a boundary-value theory

The most useful Jackson mindset is this: the differential equation alone is not the full problem. The source tells me what is happening locally, but the boundary conditions decide which solution is physically allowed.

In electrostatics,

\[
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0},
\qquad
\nabla \times \mathbf{E} = 0,
\qquad
\mathbf{E} = -\nabla \phi.
\]

So the potential satisfies

\[
\nabla^2 \phi = -\frac{\rho}{\varepsilon_0}.
\]

This is **Poisson's equation**.

In any region where there is no volume charge,

\[
\rho = 0,
\]

so the equation becomes

\[
\nabla^2 \phi = 0.
\]

This is **Laplace's equation**.

That source-free limit is where a lot of the real structure shows up: uniqueness theorems, harmonic functions, separation of variables, Green's functions, and the method of images.

### What I should ask first in almost any problem

- where is the actual charge?
- what is the physical region?
- am I solving Poisson or Laplace in that region?
- what boundary data are fixed?
- what happens at infinity?
- what symmetry is really there?

## 2. What Laplace's equation is really saying

If \(\nabla^2 \phi = 0\), then the region is source-free, but that does **not** mean the potential has to vanish.

It means the potential is being shaped by boundaries or by charges located somewhere else.

That is why conductor problems are global. The value at one point is tied to the entire geometry, not just to whatever is nearby.

This is also why harmonic functions are so rigid:

- they are determined by boundary data
- they do not have arbitrary interior spikes
- they satisfy strong uniqueness properties

## 3. Uniqueness is the thing that makes clever methods legal

This is one of the biggest practical ideas in Jackson.

If I construct a candidate potential that:

- satisfies Poisson or Laplace in the physical region
- matches the boundary conditions
- has the right behavior at infinity when needed

then that candidate is the physical solution.

That is the logic behind the method of images. The image charges do not need to be physically real. They only need to help produce the correct potential in the allowed region.

## 4. Coulomb's law is really the free-space Green-function answer

The free-space potential of a charge distribution is

\[
\phi(\mathbf r)=\frac{1}{4\pi\varepsilon_0}\int \frac{\rho(\mathbf r')}{|\mathbf r-\mathbf r'|}\,d^3r'.
\]

This is not just a formula to memorize. It is the Green-function solution of Poisson's equation in free space.

The kernel

\[
\frac{1}{|\mathbf r-\mathbf r'|}
\]

is the central object.

Once boundaries appear, I need a Green's function adapted to the geometry.

## 5. Delta functions are what make point sources clean

For a point charge at \(\mathbf r_0\),

\[
\rho(\mathbf r) = q\,\delta^{(3)}(\mathbf r-\mathbf r_0).
\]

The key identity is

\[
\nabla^2\left(\frac{1}{r}\right) = -4\pi \delta^{(3)}(\mathbf r).
\]

This is the bridge between a singular Coulomb potential and Poisson's equation.

I also need to remember that in curvilinear coordinates the delta function picks up Jacobian factors. If I forget those, the normalization is wrong and the source no longer behaves correctly under integration.

## 6. Canonical image problems

### Grounded conducting plane

A point charge \(q\) sits at \((0,0,a)\) above the plane \(z=0\). Put an image charge \(-q\) at \((0,0,-a)\).

Then in the half-space \(z>0\),

\[
\phi(\mathbf r)=\frac{q}{4\pi\varepsilon_0}
\left[
\frac{1}{|\mathbf r-\mathbf r_0|}
-\frac{1}{|\mathbf r-\mathbf r_0^*|}
\right].
\]

On the plane, the two distances match, so the potential vanishes there.

That is enough, together with uniqueness, to say the solution is correct.

### Grounded conducting sphere

This is the more Jackson-style problem because the geometry is less obvious and the algebra is more interesting.

For a real charge \(q\) at distance \(a>R\) from the center of a grounded sphere of radius \(R\),

\[
q'=-q\frac{R}{a},
\qquad
b=\frac{R^2}{a}.
\]

The image charge lives inside the sphere, outside the physical region of interest. That is exactly what should happen in the method of images.

### My image-method checklist

- image charges must stay outside the physical region
- the boundary condition has to be exact
- the physical region should contain only the real singularities
- I should mention uniqueness explicitly

## 7. Multipole expansion is the far-field language

When I am far from a localized source, the full exact potential is usually more detail than I need. The field can be expanded in powers of distance:

\[
\phi(\mathbf r)=\frac{1}{4\pi\varepsilon_0}
\left[
\frac{Q}{r}
+ \frac{\mathbf p\cdot \hat{\mathbf r}}{r^2}
+ \text{higher terms}
\right].
\]

The interpretation is clean:

- monopole term: total charge
- dipole term: first-order charge separation
- quadrupole and higher: finer angular structure

This is one of the places where electrostatics starts to feel organized instead of case-by-case.

## 8. Dielectrics change the bookkeeping

A conductor kills the internal electrostatic field in equilibrium. A dielectric does not. Instead it polarizes.

The useful macroscopic relation is

\[
\mathbf D = \varepsilon_0 \mathbf E + \mathbf P,
\qquad
\nabla \cdot \mathbf D = \rho_{\text{free}}.
\]

That split is the important one:

- **free charge** is what I put in by hand
- **bound charge** comes from the polarization response of the material

One common mistake is mixing up total charge, free charge, and bound charge, and then applying the wrong boundary condition.

## 9. What I would want to remember under pressure

- electrostatics starts with \(\mathbf E = -\nabla \phi\) but becomes a boundary-value problem almost immediately
- Poisson handles source regions
- Laplace handles source-free regions
- uniqueness is what makes elegant tricks valid
- Green's functions package geometry and boundary conditions into one kernel
- the method of images is rigorous because of uniqueness, not because the images are “real”
- multipoles organize the far field
- dielectrics force me to separate free and bound charge carefully

## 10. Personal problem-solving workflow

Before doing algebra:

1. draw the physical region
2. mark where the actual charge is
3. write the PDE separately from the boundary conditions
4. decide whether the region is source-free
5. check what happens at infinity
6. only then choose symmetry, images, separation of variables, or Green's functions

## References used for this note

### Primary text

- J. D. Jackson, *Classical Electrodynamics*, 3rd edition  
  Local file: `Classical_Electrodynamics_Jackson_3rd_.pdf`

### Repo notebooks

- `notebooks/Poisson's equation.ipynb`
- `notebooks/Laplace's equation.ipynb`
- `notebooks/Green's functions in electrostatics.ipynb`
- `notebooks/Method of images in electrostatics.ipynb`
- `notebooks/Multipole expansion in electrostatics.ipynb`
- `notebooks/Dielectrics in electrostatics.ipynb`

### Repo notes and quick sheets

- `notes/poisson_equation_notes.tex`
- `notes/dirac_delta_function_notes.tex`
- files in `Formula Sheet/`

### Repo problem sets and supporting code

- files in `problems/`
- `codes/generate_method_of_images_sphere_gif.py`

This one is intentionally written like a study note set instead of a formal chapter. The goal is clarity and recall.
