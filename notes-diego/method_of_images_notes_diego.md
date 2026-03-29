# Method of Images Notes

**Computational Electrodynamics**  
**Diego Juarez**  
**March 28, 2026**

This is the version of the method of images I want in my head when solving problems. The point is not just to memorize image charges. The point is to understand why the construction is legal, when it works, and what kinds of checks keep the answer honest.

---

## 1. What the method is actually doing

The method of images is a boundary-value trick.

In electrostatics, the potential satisfies

\[
\nabla^2 \phi(\mathbf r) = -\frac{\rho(\mathbf r)}{\varepsilon_0}
\]

in regions containing charge, and

\[
\nabla^2 \phi(\mathbf r) = 0
\]

in charge-free regions.

The hard part is usually not writing down the PDE. The hard part is enforcing the conductor boundary condition.

The method of images replaces that boundary by a carefully chosen set of **fictitious charges** placed outside the physical region. These are not extra physical charges. They are a device for building a candidate potential that already satisfies the boundary condition.

So the real logic is:

1. solve the correct PDE in the physical region
2. satisfy the boundary exactly
3. keep all image singularities outside the physical region
4. use uniqueness

If all four happen, the answer is done.

---

## 2. Why uniqueness makes the method rigorous

The electrostatic uniqueness theorem is the reason image methods are not just lucky guesses.

For a Dirichlet problem, if:

- the charge density is specified in the region
- the potential is specified on the boundary
- the behavior at infinity is fixed when the region is unbounded

then the electrostatic solution is unique.

That means I do **not** need the image charges to be physically present. I only need the candidate potential to satisfy the same differential equation and boundary data in the physical region.

This is the single most important conceptual point.

The image charges live in the excluded region. They help construct the correct potential, but they are not part of the actual laboratory charge density in the region where the solution is being claimed.

---

## 3. Checklist before trying images

Before using the method, I should check:

- is the geometry symmetric enough to support an exact image construction?
- is the conductor grounded or isolated?
- what is the physical region?
- where are the real charges?
- can I place all images outside the physical region?
- can I verify the boundary exactly, not approximately?

If I cannot answer those cleanly, the method is probably the wrong tool.

In practice, image methods work beautifully for:

- grounded infinite planes
- grounded spheres
- some wedge geometries with special angles

They do **not** work generically for arbitrary conductor shapes.

---

## 4. Grounded infinite plane

Take a point charge \(q\) at

\[
\mathbf r_0 = (0,0,a), \qquad a>0
\]

above the grounded plane \(z=0\).

The physical region is the half-space \(z>0\).

The image construction is:

- real charge \(q\) at \((0,0,a)\)
- image charge \(-q\) at \((0,0,-a)\)

Then the candidate potential is

\[
\phi(\mathbf r)
=
\frac{1}{4\pi\varepsilon_0}
\left[
\frac{q}{|\mathbf r-\mathbf r_0|}
-\frac{q}{|\mathbf r-\mathbf r_0^*|}
\right],
\qquad z>0.
\]

Why this works:

- the only singularity in \(z>0\) is the real charge
- on \(z=0\), the distances to the real and image charge are equal
- therefore the two terms cancel and \(\phi=0\) on the conductor
- the potential decays correctly at infinity

That is enough. By uniqueness, this is the physical solution.

### Cylindrical-coordinate form

With cylindrical coordinates \((\rho,\varphi,z)\),

\[
\phi(\rho,z)
=
\frac{q}{4\pi\varepsilon_0}
\left[
\frac{1}{\sqrt{\rho^2+(z-a)^2}}
-\frac{1}{\sqrt{\rho^2+(z+a)^2}}
\right].
\]

This form is often more useful for taking derivatives on the plane.

---

## 5. Field, induced charge, and force for the plane

The electric field is

\[
\mathbf E = -\nabla \phi.
\]

For the grounded plane, the induced surface charge density follows from the normal field just above the conductor:

\[
\sigma(\rho)=\varepsilon_0 E_z(\rho,0^+)
=
-\varepsilon_0\left.\frac{\partial \phi}{\partial z}\right|_{z=0^+}.
\]

Differentiating gives

\[
\sigma(\rho)=
-\frac{qa}{2\pi(\rho^2+a^2)^{3/2}}.
\]

This is a good result to remember:

- it is negative everywhere if the external charge is positive
- it is strongest directly below the charge
- it decays as the radial distance increases

The total induced charge is

\[
Q_{\mathrm{ind}}
=
\int_0^\infty \sigma(\rho)\,2\pi\rho\,d\rho
= -q.
\]

That makes physical sense for an infinite grounded plane: the conductor can draw charge from ground and exactly cancel the external charge in total.

### Force on the external charge

The force is the same as the Coulomb force between the real charge and the image charge:

\[
\mathbf F
=
-\frac{q^2}{16\pi\varepsilon_0 a^2}\,\hat{\mathbf z}.
\]

So the charge is attracted toward the plane.

The shortcut is useful, but I should remember what it means: I am not saying there is a real charge behind the plane. I am using the auxiliary configuration to compute the field in the physical region.

---

## 6. Energy subtlety for the plane

There is an easy trap here.

The force can be computed using the image charge directly, but the electrostatic energy of the charge-conductor system is **not** the full Coulomb interaction energy between the real charge and the image as if both were ordinary physical charges.

There is a factor of one-half in the energy interpretation:

\[
U
=
\frac{1}{2} q\,\phi_{\text{image}}(\mathbf r_0).
\]

That factor appears because the conductor response is induced rather than independently prescribed as a second free charge distribution.

This is exactly the kind of place where blindly treating the image as “real” causes mistakes.

---

## 7. Grounded conducting sphere

Now take a grounded conducting sphere of radius \(R\) centered at the origin, and place a real charge \(q\) on the \(z\)-axis at distance \(a>R\).

The image construction is:

\[
q' = -q\frac{R}{a},
\qquad
b=\frac{R^2}{a}.
\]

So:

- the real charge is at \(z=a\)
- the image charge is at \(z=b\)
- the image lies inside the sphere

The exterior potential is

\[
\phi(\mathbf r)
=
\frac{1}{4\pi\varepsilon_0}
\left[
\frac{q}{|\mathbf r-a\hat{\mathbf z}|}
+
\frac{q'}{|\mathbf r-b\hat{\mathbf z}|}
\right],
\qquad r>R.
\]

The important pattern here is not only the formulas. It is the geometry:

- the boundary is curved, so the image is not just a mirror reflection
- both the position and magnitude of the image change
- the image still stays outside the physical region

### Why the sphere surface is grounded

On the sphere \(r=R\), the geometry gives a proportionality between the distances to the real and image charges that makes the two terms cancel exactly. That is the reason the method works, not magic.

Once \(\phi(R,\theta)=0\) is verified pointwise, uniqueness finishes the proof.

---

## 8. Induced charge and force for the sphere

The surface charge density is obtained from the outward radial field:

\[
\sigma(\theta)
=
-\varepsilon_0\left.\frac{\partial \phi}{\partial r}\right|_{r=R^+}.
\]

The closed-form result is

\[
\sigma(\theta)=
-\frac{q}{4\pi R}
\frac{a^2-R^2}{\left(a^2+R^2-2aR\cos\theta\right)^{3/2}}.
\]

This tells me:

- the induced charge is negative everywhere for \(a>R\)
- the charge density is strongest near the closest point to the external charge
- curvature matters strongly

The total induced charge is

\[
Q_{\mathrm{ind}} = q' = -q\frac{R}{a}.
\]

That is smaller in magnitude than \(-q\), unlike the infinite grounded plane. The geometry matters.

### Force on the external charge

Using the image charge, the force is

\[
\mathbf F
=
-\frac{1}{4\pi\varepsilon_0}
\frac{q^2Ra}{(a^2-R^2)^2}\,\hat{\mathbf z}.
\]

Again the force is attractive.

Two limiting checks are worth remembering:

- as \(a\to\infty\), the force goes to zero
- as \(a\to R^+\), the attraction grows strongly

There is also a nice local flat-surface limit: near the closest point, a very large sphere looks like a plane, and the force approaches the plane result.

---

## 9. Plane versus sphere

These two examples are similar in logic but different in geometry.

### Shared structure

- both problems are Dirichlet problems for grounded conductors
- both use fictitious charges outside the physical region
- both rely on exact satisfaction of the boundary
- both are justified by uniqueness

### Important differences

- for the plane, the image is just a mirrored charge of opposite sign
- for the sphere, the image changes both position and magnitude
- the plane induces total charge \(-q\)
- the sphere induces total charge \(-qR/a\)

So the sphere problem is not just a harder version of the plane. It teaches that image methods are geometry-sensitive Green-function constructions.

---

## 10. Relation to Green's functions

The method of images can be understood as constructing a Dirichlet Green function for the region.

For the half-space above a grounded plane,

\[
G_D(\mathbf r,\mathbf r')
=
\frac{1}{|\mathbf r-\mathbf r'|}
-\frac{1}{|\mathbf r-\mathbf r'^*|}.
\]

This Green function:

- has the correct singularity at \(\mathbf r=\mathbf r'\)
- vanishes on the boundary \(z=0\)
- already builds the boundary condition into the kernel

So the method of images is not separate from Green-function theory. It is one especially elegant way of building the correct Green function when symmetry allows it.

---

## 11. Grounded versus isolated conductors

This matters a lot.

A grounded conductor has a fixed potential, usually taken to be zero. Charge can flow to or from ground.

An isolated neutral conductor is different:

- its total charge is constrained
- its potential is not automatically zero
- the image construction usually changes

So I should never take a grounded answer and casually reuse it for an isolated neutral conductor. Those are different boundary-value problems.

---

## 12. When the method fails

The method of images is powerful, but it is not a universal method.

It usually fails when:

- the boundary is too irregular
- there is no symmetry that suggests a finite image set
- the conductor is not one of the special solvable geometries

In those cases, I need another method:

- separation of variables
- Green's functions in a more general form
- numerical methods

If I find myself forcing an image construction that only satisfies the boundary approximately, that is a sign I should stop.

---

## 13. Problem-solving checklist

When I do a method-of-images problem, I want to check these in order:

1. Identify the physical region.
2. State the correct PDE in that region.
3. State the conductor boundary condition.
4. Place the images outside the physical region.
5. Write the candidate potential.
6. Verify the boundary exactly.
7. Check singularities and far-field behavior.
8. Invoke uniqueness explicitly.
9. Only then compute fields, forces, or induced charge.

That order prevents a lot of nonsense.

---

## 14. What I actually want to remember

- The method of images is justified by uniqueness, not by physical reality of the images.
- Images must stay outside the physical region.
- Grounded plane:
  \[
  \phi=\frac{q}{4\pi\varepsilon_0}\left(\frac{1}{|\mathbf r-\mathbf r_0|}-\frac{1}{|\mathbf r-\mathbf r_0^*|}\right)
  \]
- Plane induced charge:
  \[
  \sigma(\rho)= -\frac{qa}{2\pi(\rho^2+a^2)^{3/2}}
  \]
- Plane total induced charge: \(-q\)
- Grounded sphere:
  \[
  q'=-qR/a,\qquad b=R^2/a
  \]
- Sphere total induced charge:
  \[
  -qR/a
  \]
- Grounded and isolated conductors are different problems.
- The image method is really a special Green-function construction.

---

## References used here

- `Classical_Electrodynamics_Jackson_3rd_.pdf`
- `notebooks/Method of images in electrostatics.ipynb`
- `Formula Sheet/method_of_images_formula_sheet.tex`
- `problems/method_of_images_test.tex`
- `codes/generate_method_of_images_sphere_gif.py`

