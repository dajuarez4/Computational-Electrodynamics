# Jackson Electrostatics Survival Notes

**Computational Electrodynamics**  
**Diego Juarez**  
**March 28, 2026**

This version is meant to be actually useful while studying. The goal is not to sound polished. The goal is to keep the electrostatics machinery straight: what equation I am solving, what region I am solving it in, what the boundary is doing, and which method is justified.

---

## 1. The real shape of the subject

Electrostatics looks local at first and global five minutes later.

Locally, the equations are

\[
\nabla \cdot \mathbf E = \frac{\rho}{\varepsilon_0},
\qquad
\nabla \times \mathbf E = 0.
\]

Because the curl vanishes, I can write

\[
\mathbf E = -\nabla \phi.
\]

Substitute into Gauss's law:

\[
\nabla^2 \phi = -\frac{\rho}{\varepsilon_0}.
\]

That is Poisson's equation.

If the region contains no volume charge, then

\[
\rho = 0
\quad \Longrightarrow \quad
\nabla^2 \phi = 0,
\]

which is Laplace's equation.

The part that matters is this:

- Poisson tells me how charge creates curvature in the potential.
- Laplace tells me what happens in source-free regions.
- Neither equation alone is enough.
- The physical answer is chosen by the boundary conditions and the behavior at infinity.

That is why Jackson keeps pushing boundary-value problems. He is right to do it. Most of the interesting electrostatics is really about solving one PDE in the right region with the right constraints.

---

## 2. What I should identify before doing any algebra

Before solving anything, I want these four lines written down:

1. **Physical region:** where is the solution actually needed?
2. **Source structure:** where is \(\rho\) nonzero?
3. **Boundary data:** is \(\phi\) given, is \(\partial \phi/\partial n\) given, or is the conductor grounded?
4. **Far-field condition:** does the potential vanish at infinity, approach a constant, or grow?

If I do not separate those four things, I start mixing physical space with auxiliary constructions and the solution gets sloppy fast.

Two common mistakes:

- solving Poisson in a region that is actually charge-free
- using the right PDE but the wrong boundary condition

---

## 3. Poisson's equation is about local curvature

In one dimension,

\[
\frac{d^2 \phi}{dx^2} = -\frac{\rho(x)}{\varepsilon_0}.
\]

This is a very good sanity check because the sign becomes obvious:

- if \(\rho > 0\), then \(\phi'' < 0\), so the potential bends downward
- if \(\rho < 0\), then \(\phi'' > 0\), so the potential bends upward
- if \(\rho = 0\), then the potential is linear in 1D

That is the local story. The global story is different. Even in a charge-free region the potential can still be nonzero because the boundary can force it to be nontrivial.

Example:

- between conducting plates, \(\rho = 0\) in the region between the plates
- but \(\phi\) is not zero there
- the solution is shaped by the plate potentials

So I should never confuse “source-free” with “field-free.”

---

## 4. Laplace's equation is rigid

When

\[
\nabla^2 \phi = 0,
\]

the solution is called harmonic.

Harmonic functions matter because they have strong structure:

- they satisfy mean-value behavior
- they do not have arbitrary interior maxima or minima
- they are pinned down by boundary data
- they behave much more rigidly than generic smooth functions

That is why source-free electrostatics often feels cleaner but also more constrained. Once the boundary is fixed, I have much less freedom than I think.

For simple radial cases:

- in spherical symmetry, the source-free radial solution is
  \[
  \phi(r) = A + \frac{B}{r}
  \]
- in cylindrical radial symmetry, the source-free radial solution is
  \[
  \phi(s) = A \ln s + B
  \]

These show up constantly, and they are worth remembering.

---

## 5. Boundary conditions are not decoration

The PDE is only half the problem. The boundary conditions choose the physical member of the solution family.

The two standard cases are:

- **Dirichlet:** \(\phi\) is given on the boundary
- **Neumann:** \(\partial \phi / \partial n\) is given on the boundary

In electrostatics:

- grounded conductor means \(\phi = 0\) on the conductor
- isolated conductor means the conductor is equipotential, but the constant may not be zero
- if a surface charge density \(\sigma\) is present, the normal field jumps

The basic normal jump condition in vacuum is

\[
E_{2n} - E_{1n} = \frac{\sigma}{\varepsilon_0}.
\]

Since \(\mathbf E = -\nabla \phi\), the derivative of the potential carries the jump information.

The practical point is simple: when a solution looks almost right but fails on the boundary, it is wrong.

---

## 6. Uniqueness is what makes the whole toolkit work

This is one of the most important points in the whole chapter sequence.

Suppose I construct a candidate potential \(\phi_{\text{cand}}\) that:

- satisfies Poisson or Laplace in the physical region
- obeys the required boundary conditions
- has the correct behavior at infinity if the region is unbounded

Then I am done.

I do not need a second physical argument. I do not need to guess whether the image charge is “real enough.” If uniqueness applies, the candidate is the physical solution.

This is what makes the method of images rigorous.

It is also what makes Green's functions trustworthy. Once the kernel has the right singularity and the right boundary behavior, the representation formula is not just formal. It is the solution.

---

## 7. Coulomb's law is the free-space Green function

The free-space Green function satisfies

\[
\nabla^2 G(\mathbf r,\mathbf r') = -4\pi \delta^{(3)}(\mathbf r - \mathbf r').
\]

In ordinary unbounded space,

\[
G(\mathbf r,\mathbf r') = \frac{1}{|\mathbf r - \mathbf r'|}.
\]

That means the Coulomb kernel is not some disconnected formula from freshman physics. It is the fundamental solution of the Laplacian.

So the free-space potential is

\[
\phi(\mathbf r)
=
\frac{1}{4\pi \varepsilon_0}
\int
\frac{\rho(\mathbf r')}{|\mathbf r - \mathbf r'|}
\, d^3r'.
\]

This is already Green-function language, whether I say the phrase or not.

What changes in the presence of boundaries is not the Laplacian itself. What changes is the correct Green function.

---

## 8. Why the delta function keeps appearing

A point charge at \(\mathbf r_0\) is written as

\[
\rho(\mathbf r) = q\,\delta^{(3)}(\mathbf r - \mathbf r_0).
\]

The central identity is

\[
\nabla^2 \left(\frac{1}{r}\right) = -4\pi \delta^{(3)}(\mathbf r).
\]

Away from the source point, \(1/r\) is harmonic. At the source, it reproduces the correct singular charge in a distributional sense.

This is exactly why

\[
\phi(\mathbf r)
=
\frac{q}{4\pi \varepsilon_0 |\mathbf r - \mathbf r_0|}
\]

solves Poisson's equation for a point charge.

This also explains why delta functions are unavoidable in serious electrodynamics. Without them, I cannot talk cleanly about point charges, line charges, surface charges, or Green-function kernels.

---

## 9. The Green-function representation formula

Once the Green function is chosen to satisfy the right boundary conditions, the potential can be written as a volume term plus a boundary term.

Using the standard electrostatic convention,

\[
\phi(\mathbf r)
=
\frac{1}{4\pi \varepsilon_0}
\int_V \rho(\mathbf r') G(\mathbf r,\mathbf r')\, d^3r'
- \frac{1}{4\pi}
\oint_S
\left[
G \frac{\partial \phi}{\partial n'}
- \phi \frac{\partial G}{\partial n'}
\right] da'.
\]

I do not need to memorize every sign immediately, but I do need to understand the structure:

- one term knows about the charge in the volume
- one term knows about the boundary
- the Green function is the bridge that couples them

For Dirichlet problems, it is often smart to pick \(G_D\) such that \(G_D = 0\) on the boundary.

For Neumann problems, the derivative of \(G\) on the boundary is the object that gets controlled.

That is why Green functions are so useful: they package geometry and boundary conditions into a single kernel.

---

## 10. The method of images is a boundary trick, not magic

The method of images works when symmetry is kind enough that I can replace a conductor boundary by a small set of fictitious charges outside the physical region.

The logic is always the same:

1. choose image charges in the excluded region
2. build the candidate potential
3. verify the boundary condition exactly
4. check that the only singularities in the physical region are the real charges
5. invoke uniqueness

The image charges are not physical. They are bookkeeping devices that force the right boundary data.

That is the whole method.

---

## 11. Worked example: point charge above a grounded plane

Real charge:

\[
\mathbf r_0 = (0,0,a), \qquad a > 0
\]

Image charge:

\[
-q \text{ at } (0,0,-a).
\]

Candidate potential in the half-space \(z>0\):

\[
\phi(\mathbf r)
=
\frac{1}{4\pi \varepsilon_0}
\left[
\frac{q}{|\mathbf r - \mathbf r_0|}
- \frac{q}{|\mathbf r - \mathbf r_0^*|}
\right].
\]

Why it works:

- in the physical region, the only real singularity is the actual point charge
- on \(z=0\), the two distances match, so \(\phi = 0\)
- the potential decays correctly at infinity

So by uniqueness, that is the solution.

Two good consequences:

- the conductor boundary condition is satisfied exactly, not approximately
- the force on the real charge can be computed as if the image charge were real

Magnitude of the attraction:

\[
F
=
\frac{1}{4\pi \varepsilon_0}
\frac{q^2}{(2a)^2}.
\]

Direction: toward the plane.

This is one of those results that is easy to use but only conceptually safe if I keep the physical region separate from the auxiliary one.

---

## 12. Worked example: point charge outside a grounded sphere

This problem is more representative of the style Jackson likes.

Let a grounded conducting sphere of radius \(R\) sit at the origin, and let a real charge \(q\) be placed a distance \(a\) from the center with \(a > R\).

Then the image data are

\[
q' = -q \frac{R}{a},
\qquad
b = \frac{R^2}{a}.
\]

The image charge is placed on the same axis as the real charge, but inside the sphere at distance \(b\) from the center.

What is worth remembering here is not only the formulas, but the pattern:

- the boundary is curved, so the image charge changes both position and strength
- the image still lies outside the physical region
- the surface \(r=R\) becomes an equipotential with \(\phi=0\)

This example is important because it makes clear that image methods are really geometry-dependent Green-function constructions in disguise.

---

## 13. Multipole expansion: how the far field forgets details

For a localized source,

\[
\phi(\mathbf r)
=
\frac{1}{4\pi \varepsilon_0}
\int
\frac{\rho(\mathbf r')}{|\mathbf r - \mathbf r'|}
\, d^3r'.
\]

If I am far from the charge distribution, then the potential can be expanded in inverse powers of \(r\).

The first few terms have immediate meaning:

\[
\phi(\mathbf r)
\sim
\frac{1}{4\pi \varepsilon_0}
\left[
\frac{Q}{r}
+ \frac{\mathbf p \cdot \hat{\mathbf r}}{r^2}
+ \cdots
\right].
\]

Where:

- \(Q\) is the total charge
- \(\mathbf p\) is the dipole moment
- higher terms encode finer angular structure

The practical lesson:

- far away, the field only remembers the coarse structure first
- the more symmetric the source is, the more low-order moments can vanish

This is why multipoles are the natural language for asymptotic electrostatics.

---

## 14. Dielectrics: the vacuum story gets modified, not discarded

In a dielectric, the field polarizes the material. That produces bound charge.

The useful macroscopic relation is

\[
\mathbf D = \varepsilon_0 \mathbf E + \mathbf P,
\qquad
\nabla \cdot \mathbf D = \rho_{\text{free}}.
\]

What changes is the bookkeeping:

- \(\rho_{\text{free}}\) is the charge I supply explicitly
- bound charge is induced by polarization
- the field depends on both

This is where people often make conceptual mistakes. They use vacuum boundary conditions in a dielectric problem, or they forget that the normal component of \(\mathbf D\) tracks free charge, not total charge.

So the subject is not “new electrostatics.” It is the same electrostatics with better accounting.

---

## 15. A problem-solving workflow that actually helps

When I start a problem, I want to do this in order:

1. sketch the geometry
2. label the physical region
3. mark where charge really exists
4. decide whether each region uses Poisson or Laplace
5. write the boundary conditions separately
6. check symmetry honestly
7. choose the method only after that

Typical method choices:

- **direct integration** if the geometry is simple and free-space applies
- **Gauss's law** if symmetry is strong enough
- **separation of variables** if the boundary geometry is standard
- **method of images** if a conductor boundary can be encoded by a few auxiliary charges
- **Green's functions** if I need the systematic boundary-value framework
- **multipole expansion** if I only care about the far field

Choosing the method too early is one of the fastest ways to get lost.

---

## 16. Fast checks that catch bad answers

- If the region is source-free, my candidate should be harmonic there.
- If there is a conductor, the surface must be equipotential.
- If the problem is grounded, the boundary value must be exactly zero.
- If I claim an image solution, the images must stay outside the physical region.
- If a point charge is present, the singularity should match the Coulomb form locally.
- If the far field is wrong, the whole answer is suspect even if the local algebra looks clean.
- If the units do not work, I am done and should back up.

These checks are boring, but they save time.

---

## 17. What I would want on one sheet before an exam

- \(\mathbf E = -\nabla \phi\)
- \(\nabla^2 \phi = -\rho/\varepsilon_0\)
- source-free region means Laplace, not zero potential
- uniqueness is the reason image methods and Green functions are legitimate
- \(1/|\mathbf r - \mathbf r'|\) is the free-space Green function
- \(\nabla^2 (1/r) = -4\pi \delta^{(3)}(\mathbf r)\)
- grounded plane: image charge is \(-q\) at the mirror point
- grounded sphere: \(q' = -qR/a\), \(b = R^2/a\)
- far field starts with monopole, then dipole
- in dielectrics, keep free charge and bound charge separate

---

## References used here

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

### Repo notes and formula sheets

- `notes/poisson_equation_notes.tex`
- `notes/dirac_delta_function_notes.tex`
- `Formula Sheet/poisson_formula_sheet.tex`
- `Formula Sheet/laplace_formula_sheet.tex`
- `Formula Sheet/greens_functions_formula_sheet.tex`
- `Formula Sheet/method_of_images_formula_sheet.tex`

### Repo problems and code support

- `problems/Poisson_equation.pdf`
- `problems/Laplace_equation.pdf`
- `problems/Green_functions.pdf`
- `problems/method_of_images.pdf`
- `codes/generate_method_of_images_sphere_gif.py`

