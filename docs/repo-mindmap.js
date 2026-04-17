(function () {
  const canvas = document.getElementById("repo-map-canvas");
  const ctx = canvas.getContext("2d");

  const titleEl = document.getElementById("map-node-title");
  const groupEl = document.getElementById("map-node-group");
  const descEl = document.getElementById("map-node-description");
  const pathEl = document.getElementById("map-node-path");
  const linksEl = document.getElementById("map-node-links");
  const openButton = document.getElementById("map-open-button");

  const repoUrl = "https://github.com/dajuarez4/Computational-Electrodynamics";
  const tree = (path) => `${repoUrl}/tree/main/${path}`;
  const blob = (path) => `${repoUrl}/blob/main/${path}`;

  const categorySpecs = [
    {
      id: "notebooks",
      label: "Notebooks",
      group: "Study Content",
      path: "notebooks/",
      url: tree("notebooks"),
      description: "Theory notebooks, Jackson-focused studies, numerical experiments, and visualization notebooks.",
      color: "#7fc4ff",
      children: [
        {
          id: "electrostatics-core",
          label: "Electrostatics Core",
          path: "notebooks/",
          url: "./topics.html",
          description: "Dirac delta, Poisson, Laplace, Green functions, method of images, multipoles, and dielectrics."
        },
        {
          id: "jackson-studies",
          label: "Jackson Studies",
          path: "notebooks/Jackson *.ipynb",
          url: tree("notebooks"),
          description: "Problem-driven notebook studies from Jackson Chapter 2 and related electrostatics topics."
        },
        {
          id: "numerical-notebooks",
          label: "Numerical Notebooks",
          path: "notebooks/FFT Poisson solver.ipynb",
          url: blob("notebooks/FFT%20Poisson%20solver.ipynb"),
          description: "FFT Poisson, finite-difference Poisson, 3D output viewers, and FDTD exploration."
        },
        {
          id: "waveguides",
          label: "Waveguides",
          path: "notebooks/Rectangular Waveguide Modes.ipynb",
          url: blob("notebooks/Rectangular%20Waveguide%20Modes.ipynb"),
          description: "Guided-mode structure, cutoff, and mode visualization in rectangular waveguides."
        }
      ]
    },
    {
      id: "problems",
      label: "Problems",
      group: "Problem Sets",
      path: "problems/ + Jackson-problems/ + Griffiths-problems/",
      url: tree("problems"),
      description: "Topic-based PDFs, Jackson problem material, and the Griffiths exercise index.",
      color: "#8ab6ff",
      children: [
        {
          id: "topic-problem-sets",
          label: "Topic PDFs",
          path: "problems/",
          url: tree("problems"),
          description: "Topic-centered problem sets with LaTeX sources and compiled PDFs."
        },
        {
          id: "jackson-problems",
          label: "Jackson Problems",
          path: "Jackson-problems/",
          url: tree("Jackson-problems"),
          description: "Chapter-based Jackson problem PDFs and study material."
        },
        {
          id: "griffiths-problems",
          label: "Griffiths Index",
          path: "Griffiths-problems/griffiths_problem_index_aa.tex",
          url: blob("Griffiths-problems/griffiths_problem_index_aa.tex"),
          description: "A structured Griffiths problem index in A&A-style LaTeX, with paraphrased statements."
        }
      ]
    },
    {
      id: "notes",
      label: "Notes",
      group: "Notes and Study Files",
      path: "notes/ + notes-diego/ + slides/",
      url: tree("notes-diego"),
      description: "Focused topic notes, personal chapter notes, and lecture-style slides.",
      color: "#ffd98a",
      children: [
        {
          id: "repo-notes",
          label: "Repo Notes",
          path: "notes/",
          url: tree("notes"),
          description: "Focused notes for Dirac delta and Poisson topics."
        },
        {
          id: "diego-notes",
          label: "Diego Notes",
          path: "notes-diego/",
          url: tree("notes-diego"),
          description: "Personal chapter packets, calculus references, vector formulas, and support notes."
        },
        {
          id: "slides",
          label: "Slides",
          path: "slides/",
          url: tree("slides"),
          description: "Presentation PDFs and beamer-style electrodynamics slide decks."
        }
      ]
    },
    {
      id: "formula-sheets",
      label: "Formula Sheets",
      group: "Reference Material",
      path: "Formula Sheet/",
      url: tree("Formula%20Sheet"),
      description: "Compact formula-sheet references in LaTeX and PDF form.",
      color: "#ffd98a",
      children: [
        {
          id: "formula-sheets-core",
          label: "Core Formula Sheets",
          path: "Formula Sheet/",
          url: tree("Formula%20Sheet"),
          description: "Dirac delta, Poisson, Laplace, Green functions, method of images, multipoles, dielectrics, and radiation."
        }
      ]
    },
    {
      id: "code",
      label: "Code",
      group: "Implementation",
      path: "codes/",
      url: tree("codes"),
      description: "Python scripts, generated assets, and C++ solvers that support the computational side of the repo.",
      color: "#8ce2a8",
      children: [
        {
          id: "python-tools",
          label: "Python Tools",
          path: "codes/*.py",
          url: tree("codes"),
          description: "GIF builders, game scripts, plotting utilities, and export tools."
        },
        {
          id: "cpp-yee",
          label: "C++ Yee FDTD",
          path: "codes/cpp/yee_fdtd/",
          url: tree("codes/cpp/yee_fdtd"),
          description: "2D and 3D Yee-grid electromagnetic solvers with output for later visualization."
        },
        {
          id: "cpp-fft",
          label: "C++ FFT Poisson",
          path: "codes/cpp/fft_poisson/",
          url: tree("codes/cpp/fft_poisson"),
          description: "3D FFT Poisson solver for periodic electrostatics."
        },
        {
          id: "generated-plots",
          label: "Generated Plots",
          path: "codes/plots/",
          url: tree("codes/plots"),
          description: "Rendered animations, previews, and plots produced by the scripts and solvers."
        }
      ]
    },
    {
      id: "website",
      label: "Website",
      group: "Public-Facing Pages",
      path: "docs/",
      url: "./index.html",
      description: "The published site layer: topic pages, notes, visuals, games, and interactive numerical viewers.",
      color: "#8ce2a8",
      children: [
        {
          id: "docs-pages",
          label: "Main Pages",
          path: "docs/index.html + topics.html + notes.html + visuals.html",
          url: "./index.html",
          description: "The main browsing surface for the course-style site."
        },
        {
          id: "interactive-games",
          label: "Games and Lab",
          path: "docs/charge-hunt.html + flux-box.html + lab.html",
          url: "./lab.html",
          description: "Interactive pages for electrostatics intuition and hands-on exploration."
        },
        {
          id: "fft-viewer",
          label: "3D Viewers",
          path: "docs/fft-poisson.html",
          url: "./fft-poisson.html",
          description: "Interactive browser viewers for numerical electrostatics output."
        },
        {
          id: "site-mirror",
          label: "Site Mirror",
          path: "site/",
          url: tree("site"),
          description: "An alternate static-site layer with overlapping HTML, CSS, and JS structure."
        }
      ]
    },
    {
      id: "publishing",
      label: "Publishing",
      group: "Export Workflows",
      path: "overleaf_uploads/",
      url: tree("overleaf_uploads"),
      description: "Export-ready copies of materials for Overleaf or external editing workflows.",
      color: "#ffd98a",
      children: [
        {
          id: "overleaf-formulas",
          label: "Overleaf Formula Sheets",
          path: "overleaf_uploads/formula_sheets_project/",
          url: tree("overleaf_uploads/formula_sheets_project"),
          description: "Upload-ready copies of the formula-sheet project."
        },
        {
          id: "overleaf-problems",
          label: "Overleaf Problem Sets",
          path: "overleaf_uploads/problems_project/",
          url: tree("overleaf_uploads/problems_project"),
          description: "Upload-ready copies of the problem-set project."
        }
      ]
    },
    {
      id: "references",
      label: "References",
      group: "Textbook Anchors",
      path: "griffiths_4ed.pdf + Classical_Electrodynamics_Jackson_3rd_.pdf",
      url: blob("README.md"),
      description: "The textbook anchor layer tying Griffiths and Jackson material to the repo content.",
      color: "#ffd98a",
      children: [
        {
          id: "griffiths-pdf",
          label: "Griffiths 4ed",
          path: "griffiths_4ed.pdf",
          url: blob("griffiths_4ed.pdf"),
          description: "Reference textbook used for the Griffiths problem index work."
        },
        {
          id: "jackson-pdf",
          label: "Jackson 3rd",
          path: "Classical_Electrodynamics_Jackson_3rd_.pdf",
          url: blob("Classical_Electrodynamics_Jackson_3rd_.pdf"),
          description: "Primary graduate electrodynamics reference driving much of the repo."
        }
      ]
    }
  ];

  const nodes = [];
  const nodeById = new Map();
  const edges = [];

  function makeNode(spec, extra) {
    const node = Object.assign(
      {
        size: 10,
        depthScale: 1,
        kind: "leaf",
        connections: []
      },
      spec,
      extra || {}
    );
    nodes.push(node);
    nodeById.set(node.id, node);
    return node;
  }

  function connect(a, b, style) {
    edges.push({ a, b, style: style || "main" });
  }

  const root = makeNode({
    id: "root",
    label: "Repo",
    group: "Repository Root",
    path: "/Users/dajuarez4/Computational-Electrodynamics-",
    url: "./index.html",
    description: "The full project graph. This root links theory, problems, notes, code, the website layer, and publishing exports.",
    color: "#ecbb86",
    size: 18,
    kind: "root"
  });

  const categoryRadius = 185;
  const leafRadius = 315;
  const categoryDirections = fibonacciSphere(categorySpecs.length, categoryRadius);

  categorySpecs.forEach((spec, categoryIndex) => {
    const base = categoryDirections[categoryIndex];
    const category = makeNode({
      id: spec.id,
      label: spec.label,
      group: spec.group,
      path: spec.path,
      url: spec.url,
      description: spec.description,
      color: spec.color,
      size: 13,
      kind: "category",
      base
    });

    connect(root.id, category.id, "hub");

    const cluster = ringCluster(base, spec.children.length, leafRadius, 0.43);
    spec.children.forEach((child, childIndex) => {
      const leaf = makeNode({
        id: child.id,
        label: child.label,
        group: spec.label,
        path: child.path,
        url: child.url,
        description: child.description,
        color: tint(spec.color, childIndex * 0.05),
        size: 8,
        kind: "leaf",
        base: cluster[childIndex]
      });

      connect(category.id, leaf.id, "branch");
    });
  });

  [
    ["electrostatics-core", "topic-problem-sets"],
    ["electrostatics-core", "formula-sheets-core"],
    ["jackson-studies", "jackson-problems"],
    ["griffiths-pdf", "griffiths-problems"],
    ["jackson-pdf", "jackson-studies"],
    ["jackson-pdf", "jackson-problems"],
    ["numerical-notebooks", "cpp-fft"],
    ["numerical-notebooks", "cpp-yee"],
    ["generated-plots", "docs-pages"],
    ["generated-plots", "fft-viewer"],
    ["python-tools", "interactive-games"],
    ["site-mirror", "docs-pages"],
    ["overleaf-formulas", "formula-sheets-core"],
    ["overleaf-problems", "topic-problem-sets"],
    ["diego-notes", "slides"],
    ["repo-notes", "electrostatics-core"],
    ["interactive-games", "docs-pages"]
  ].forEach(([a, b]) => connect(a, b, "cross"));

  edges.forEach((edge) => {
    const a = nodeById.get(edge.a);
    const b = nodeById.get(edge.b);
    if (!a || !b) {
      return;
    }
    a.connections.push(b.label);
    b.connections.push(a.label);
  });

  const state = {
    width: 0,
    height: 0,
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    rotX: -0.22,
    rotY: 0.35,
    targetRotX: -0.22,
    targetRotY: 0.35,
    zoom: 760,
    pointerX: 0,
    pointerY: 0,
    hovered: root,
    dragging: false,
    dragMoved: false,
    lastX: 0,
    lastY: 0,
    autoSpin: 0.0014,
    nodeScreenData: [],
    time: 0
  };

  const stars = Array.from({ length: 160 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.8 + 0.3,
    alpha: Math.random() * 0.55 + 0.12
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = Math.round(rect.width * state.dpr);
    canvas.height = Math.round(rect.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function fibonacciSphere(count, radius) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      pts.push({
        x: Math.cos(theta) * radial * radius,
        y: y * radius,
        z: Math.sin(theta) * radial * radius
      });
    }
    return pts;
  }

  function ringCluster(direction, count, radius, spread) {
    const n = normalize(direction);
    const ref = Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const tangent = normalize(cross(ref, n));
    const bitangent = normalize(cross(n, tangent));
    const pts = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const local = normalize({
        x: n.x * (1 - spread) + spread * (Math.cos(angle) * tangent.x + Math.sin(angle) * bitangent.x),
        y: n.y * (1 - spread) + spread * (Math.cos(angle) * tangent.y + Math.sin(angle) * bitangent.y),
        z: n.z * (1 - spread) + spread * (Math.cos(angle) * tangent.z + Math.sin(angle) * bitangent.z)
      });
      pts.push(scale(local, radius));
    }
    return pts;
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function normalize(v) {
    const m = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / m, y: v.y / m, z: v.z / m };
  }

  function scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  function tint(hex, shift) {
    const rgb = hex
      .replace("#", "")
      .match(/.{1,2}/g)
      .map((part) => parseInt(part, 16));
    const mixed = rgb.map((value, index) => {
      const toward = index === 0 ? 255 : 245;
      return Math.max(0, Math.min(255, Math.round(value + (toward - value) * shift)));
    });
    return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
  }

  function rotatePoint(point, rx, ry) {
    const cosy = Math.cos(ry);
    const siny = Math.sin(ry);
    const cosx = Math.cos(rx);
    const sinx = Math.sin(rx);

    const x1 = point.x * cosy - point.z * siny;
    const z1 = point.x * siny + point.z * cosy;
    const y2 = point.y * cosx - z1 * sinx;
    const z2 = point.y * sinx + z1 * cosx;

    return { x: x1, y: y2, z: z2 };
  }

  function project(point) {
    const z = point.z + state.zoom;
    const scaleFactor = state.zoom / Math.max(120, z);
    return {
      x: state.width * 0.5 + point.x * scaleFactor,
      y: state.height * 0.5 + point.y * scaleFactor,
      scale: scaleFactor,
      z: point.z
    };
  }

  function drawBackdrop() {
    const grad = ctx.createLinearGradient(0, 0, 0, state.height);
    grad.addColorStop(0, "rgba(5, 15, 23, 0.08)");
    grad.addColorStop(1, "rgba(5, 15, 23, 0.2)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.width, state.height);

    stars.forEach((star) => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.arc(star.x * state.width, star.y * state.height, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawSphereGuides() {
    const guideColor = "rgba(190, 220, 245, 0.14)";
    [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].forEach((angle) => {
      draw3dRing(315, angle, "longitude", guideColor);
    });
    [-0.7, -0.25, 0.25, 0.7].forEach((lat) => {
      draw3dRing(315, lat, "latitude", guideColor);
    });
  }

  function draw3dRing(radius, angle, type, color) {
    const pts = [];
    for (let i = 0; i <= 100; i += 1) {
      const t = (Math.PI * 2 * i) / 100;
      let point;
      if (type === "longitude") {
        point = {
          x: radius * Math.cos(t) * Math.cos(angle),
          y: radius * Math.sin(t),
          z: radius * Math.cos(t) * Math.sin(angle)
        };
      } else {
        point = {
          x: radius * Math.cos(t) * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: radius * Math.sin(t) * Math.cos(angle)
        };
      }
      pts.push(project(rotatePoint(point, state.rotX, state.rotY)));
    }

    ctx.beginPath();
    pts.forEach((p, index) => {
      if (index === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function updateNodeScreenData() {
    state.nodeScreenData = nodes.map((node) => {
      const rotated = node.id === "root" ? { x: 0, y: 0, z: 0 } : rotatePoint(node.base, state.rotX, state.rotY);
      const projected = project(rotated);
      const radius = Math.max(4, node.size * projected.scale * 0.62);
      return {
        node,
        rotated,
        projected,
        radius
      };
    });
  }

  function drawEdges() {
    const rendered = edges
      .map((edge) => {
        const a = state.nodeScreenData.find((entry) => entry.node.id === edge.a);
        const b = state.nodeScreenData.find((entry) => entry.node.id === edge.b);
        return {
          edge,
          a,
          b,
          depth: ((a && a.rotated.z) || 0) + ((b && b.rotated.z) || 0)
        };
      })
      .sort((left, right) => left.depth - right.depth);

    rendered.forEach(({ edge, a, b, depth }) => {
      if (!a || !b) {
        return;
      }
      const front = (depth + 700) / 1400;
      const alpha = edge.style === "cross" ? 0.14 + front * 0.18 : 0.18 + front * 0.22;
      ctx.beginPath();
      ctx.moveTo(a.projected.x, a.projected.y);
      ctx.lineTo(b.projected.x, b.projected.y);
      ctx.strokeStyle =
        edge.style === "cross"
          ? `rgba(236, 187, 134, ${alpha})`
          : `rgba(150, 210, 255, ${alpha})`;
      ctx.lineWidth = edge.style === "hub" ? 1.8 : edge.style === "cross" ? 1.1 : 1.35;
      ctx.stroke();
    });
  }

  function drawNodes() {
    state.nodeScreenData
      .slice()
      .sort((left, right) => left.rotated.z - right.rotated.z)
      .forEach((entry) => {
        const isHovered = state.hovered && state.hovered.id === entry.node.id;
        const x = entry.projected.x;
        const y = entry.projected.y;
        const radius = entry.radius;

        const glowRadius = radius * (isHovered ? 3.8 : 2.6);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        glow.addColorStop(0, rgbaFrom(entry.node.color, isHovered ? 0.42 : 0.24));
        glow.addColorStop(1, rgbaFrom(entry.node.color, 0));
        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = entry.node.kind === "root" ? "#ffe5bf" : entry.node.color;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.lineWidth = isHovered ? 2.8 : 1.3;
        ctx.strokeStyle = isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)";
        ctx.arc(x, y, radius + (isHovered ? 4 : 2), 0, Math.PI * 2);
        ctx.stroke();
      });

    state.nodeScreenData.forEach((entry) => {
      const shouldLabel =
        entry.node.kind !== "leaf" ||
        (entry.projected.scale > 0.92 && entry.rotated.z > -20) ||
        (state.hovered && state.hovered.id === entry.node.id);

      if (!shouldLabel) {
        return;
      }

      ctx.font =
        entry.node.kind === "root"
          ? "700 15px Georgia"
          : entry.node.kind === "category"
            ? "700 13px Georgia"
            : "600 11px Georgia";
      ctx.fillStyle =
        state.hovered && state.hovered.id === entry.node.id
          ? "rgba(255,255,255,0.98)"
          : "rgba(235,244,251,0.84)";
      ctx.textAlign = "center";
      ctx.fillText(entry.node.label, entry.projected.x, entry.projected.y - entry.radius - 10);
    });
  }

  function rgbaFrom(color, alpha) {
    if (color.startsWith("rgb(")) {
      return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    }
    const rgb = color
      .replace("#", "")
      .match(/.{1,2}/g)
      .map((part) => parseInt(part, 16));
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  function pickHovered() {
    let best = null;
    state.nodeScreenData.forEach((entry) => {
      const dx = state.pointerX - entry.projected.x;
      const dy = state.pointerY - entry.projected.y;
      const hitRadius = Math.max(entry.radius + 8, 14);
      const dist = Math.hypot(dx, dy);
      if (dist < hitRadius) {
        if (!best || entry.projected.scale > best.projected.scale) {
          best = entry;
        }
      }
    });
    state.hovered = best ? best.node : root;
    updateInspector();
  }

  function updateInspector() {
    const node = state.hovered || root;
    titleEl.textContent = node.label === "Repo" ? "Computational-Electrodynamics-" : node.label;
    groupEl.textContent = node.group;
    descEl.textContent = node.description;
    pathEl.textContent = node.path;

    linksEl.innerHTML = "";
    const items = (node.connections || []).slice(0, 6);
    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No additional cross-links stored for this node.";
      linksEl.appendChild(li);
    } else {
      items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        linksEl.appendChild(li);
      });
    }

    openButton.disabled = !node.url;
    openButton.dataset.url = node.url || "";
  }

  function step() {
    state.time += 1;
    if (!state.dragging) {
      state.targetRotY += state.autoSpin;
    }
    state.rotX += (state.targetRotX - state.rotX) * 0.08;
    state.rotY += (state.targetRotY - state.rotY) * 0.08;

    ctx.clearRect(0, 0, state.width, state.height);
    drawBackdrop();
    drawSphereGuides();
    updateNodeScreenData();
    drawEdges();
    drawNodes();
    if (!state.dragging) {
      pickHovered();
    }
    requestAnimationFrame(step);
  }

  function setPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = event.clientX - rect.left;
    state.pointerY = event.clientY - rect.top;
  }

  canvas.addEventListener("pointerdown", (event) => {
    canvas.classList.add("is-dragging");
    state.dragging = true;
    state.dragMoved = false;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    setPointerPosition(event);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    setPointerPosition(event);
    if (state.dragging) {
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        state.dragMoved = true;
      }
      state.targetRotY += dx * 0.0052;
      state.targetRotX += dy * 0.0048;
      state.targetRotX = Math.max(-1.15, Math.min(1.15, state.targetRotX));
      state.lastX = event.clientX;
      state.lastY = event.clientY;
    } else {
      pickHovered();
    }
  });

  function endDrag(event) {
    if (state.dragging) {
      state.dragging = false;
      canvas.classList.remove("is-dragging");
      setPointerPosition(event);
      pickHovered();
    }
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", () => {
    if (!state.dragging) {
      state.hovered = root;
      updateInspector();
    }
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      state.zoom += event.deltaY * 0.35;
      state.zoom = Math.max(520, Math.min(980, state.zoom));
    },
    { passive: false }
  );

  canvas.addEventListener("click", () => {
    if (state.dragMoved) {
      state.dragMoved = false;
      return;
    }
    if (!state.hovered || !state.hovered.url) {
      return;
    }
    openNode(state.hovered.url);
  });

  openButton.addEventListener("click", () => {
    const url = openButton.dataset.url;
    if (url) {
      openNode(url);
    }
  });

  function openNode(url) {
    if (url.startsWith("./")) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener");
    }
  }

  window.addEventListener("resize", resize);

  resize();
  updateInspector();
  requestAnimationFrame(step);
})();
