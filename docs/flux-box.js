(function () {
  var canvas = document.getElementById("fluxBoxCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var checkFluxBtn = document.getElementById("checkFluxBtn");
  var hintBtn = document.getElementById("hintBtn");
  var resetSurfaceBtn = document.getElementById("resetSurfaceBtn");
  var fieldToggleBtn = document.getElementById("fieldToggleBtn");
  var nextLevelBtn = document.getElementById("nextLevelBtn");

  var levelValue = document.getElementById("levelValue");
  var goalValue = document.getElementById("goalValue");
  var enclosedValue = document.getElementById("enclosedValue");
  var fluxValue = document.getElementById("fluxValue");
  var mismatchValue = document.getElementById("mismatchValue");
  var insideCountValue = document.getElementById("insideCountValue");
  var attemptsValue = document.getElementById("attemptsValue");
  var bestValue = document.getElementById("bestValue");
  var fluxStatus = document.getElementById("fluxStatus");

  var rect = { left: 34, top: 34, width: 1012, height: 752, right: 1046, bottom: 786 };
  var domain = { xmin: -4, xmax: 4, ymin: -4, ymax: 4 };
  var minHalfSize = 0.45;

  var levels = [
    {
      name: "Warm-up",
      target: 1,
      charges: [
        { x: -2.5, y: 1.9, q: 1 },
        { x: -0.8, y: -1.6, q: -1 },
        { x: 1.0, y: 1.1, q: 1 },
        { x: 2.5, y: -0.2, q: -2 }
      ]
    },
    {
      name: "Neutral shell",
      target: 0,
      charges: [
        { x: -2.7, y: 1.4, q: 1 },
        { x: -1.3, y: -1.5, q: -1 },
        { x: 0.6, y: 1.6, q: 2 },
        { x: 1.9, y: -1.1, q: -2 },
        { x: 3.0, y: 0.4, q: 1 }
      ]
    },
    {
      name: "Negative flux",
      target: -2,
      charges: [
        { x: -2.6, y: 1.8, q: -1 },
        { x: -1.2, y: -0.7, q: 2 },
        { x: 0.4, y: 1.0, q: -1 },
        { x: 1.9, y: -1.7, q: -1 },
        { x: 3.0, y: 1.6, q: 1 }
      ]
    },
    {
      name: "Mode crowd",
      target: 2,
      charges: [
        { x: -2.8, y: 1.2, q: 1 },
        { x: -1.4, y: -1.6, q: 1 },
        { x: -0.1, y: 0.8, q: -1 },
        { x: 1.2, y: -0.8, q: 2 },
        { x: 2.4, y: 1.7, q: -2 },
        { x: 2.9, y: -1.5, q: 1 }
      ]
    }
  ];

  var state = {
    levelIndex: 0,
    surface: { cx: 0, cy: 0, hw: 1.35, hh: 1.15 },
    dragging: null,
    attempts: 0,
    showHint: false,
    showField: true,
    solved: false,
    message: "",
    bestDiff: null,
    solutionIndices: []
  };

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function signed(value) {
    if (value > 0) return "+" + value;
    return String(value);
  }

  function copySurface(surface) {
    return { cx: surface.cx, cy: surface.cy, hw: surface.hw, hh: surface.hh };
  }

  function activeLevel() {
    return levels[state.levelIndex];
  }

  function surfaceEdges(surface) {
    return {
      left: surface.cx - surface.hw,
      right: surface.cx + surface.hw,
      bottom: surface.cy - surface.hh,
      top: surface.cy + surface.hh
    };
  }

  function toCanvasX(x) {
    return rect.left + ((x - domain.xmin) / (domain.xmax - domain.xmin)) * rect.width;
  }

  function toCanvasY(y) {
    return rect.bottom - ((y - domain.ymin) / (domain.ymax - domain.ymin)) * rect.height;
  }

  function toWorldX(px) {
    return domain.xmin + ((px - rect.left) / rect.width) * (domain.xmax - domain.xmin);
  }

  function toWorldY(py) {
    return domain.ymin + ((rect.bottom - py) / rect.height) * (domain.ymax - domain.ymin);
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function distance(x1, y1, x2, y2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getEventPoint(event) {
    var source = event;
    if (event.touches && event.touches.length) source = event.touches[0];
    else if (event.changedTouches && event.changedTouches.length) source = event.changedTouches[0];

    var bounds = canvas.getBoundingClientRect();
    var px = source.clientX - bounds.left;
    var py = source.clientY - bounds.top;

    return {
      x: domain.xmin + (px / bounds.width) * (domain.xmax - domain.xmin),
      y: domain.ymax - (py / bounds.height) * (domain.ymax - domain.ymin)
    };
  }

  function pointInSurface(x, y) {
    return Math.abs(x - state.surface.cx) <= state.surface.hw && Math.abs(y - state.surface.cy) <= state.surface.hh;
  }

  function enclosedData() {
    var charges = activeLevel().charges;
    var netCharge = 0;
    var count = 0;
    var indices = [];
    var i;
    for (i = 0; i < charges.length; i += 1) {
      if (pointInSurface(charges[i].x, charges[i].y)) {
        netCharge += charges[i].q;
        count += 1;
        indices.push(i);
      }
    }
    return {
      netCharge: netCharge,
      count: count,
      indices: indices
    };
  }

  function fieldAt(x, y) {
    var charges = activeLevel().charges;
    var ex = 0;
    var ey = 0;
    var i;

    for (i = 0; i < charges.length; i += 1) {
      var dx = x - charges[i].x;
      var dy = y - charges[i].y;
      var r2 = dx * dx + dy * dy + 0.055;
      var r = Math.sqrt(r2);
      ex += charges[i].q * dx / (r2 * r);
      ey += charges[i].q * dy / (r2 * r);
    }

    return { ex: ex, ey: ey };
  }

  function subsetForTarget(charges, target) {
    var best = null;

    function search(index, sum, chosen) {
      if (sum === target && chosen.length > 0) {
        if (!best || chosen.length < best.length) {
          best = chosen.slice();
        }
      }

      if (index >= charges.length) return;
      if (best && chosen.length >= best.length) return;

      search(index + 1, sum, chosen);
      chosen.push(index);
      search(index + 1, sum + charges[index].q, chosen);
      chosen.pop();
    }

    search(0, 0, []);
    return best || [];
  }

  function statusClass(diff) {
    if (state.solved || diff === 0) return "hot";
    if (diff <= 1) return "warm";
    return "cold";
  }

  function updateReadout() {
    var level = activeLevel();
    var enclosed = enclosedData();
    var mismatch = level.target - enclosed.netCharge;
    var diff = Math.abs(mismatch);

    levelValue.textContent = String(state.levelIndex + 1) + " - " + level.name;
    goalValue.textContent = signed(level.target);
    enclosedValue.textContent = signed(enclosed.netCharge);
    fluxValue.textContent = signed(enclosed.netCharge);
    mismatchValue.textContent = signed(mismatch);
    insideCountValue.textContent = String(enclosed.count);
    attemptsValue.textContent = String(state.attempts);
    bestValue.textContent = state.bestDiff === null ? "-" : String(state.bestDiff);

    fluxStatus.textContent = state.message;
    fluxStatus.className = "hunt-status " + statusClass(diff);
    fieldToggleBtn.textContent = state.showField ? "Field Arrows: On" : "Field Arrows: Off";
    hintBtn.textContent = state.showHint ? "Hide Hint" : "Show Hint";
    nextLevelBtn.textContent = state.solved ? "Next Puzzle" : "Skip Puzzle";
  }

  function drawGrid() {
    var i;
    ctx.strokeStyle = "rgba(180, 203, 224, 0.10)";
    ctx.lineWidth = 1;
    for (i = 0; i <= 8; i += 1) {
      var gx = rect.left + (i / 8) * rect.width;
      var gy = rect.top + (i / 8) * rect.height;
      ctx.beginPath();
      ctx.moveTo(gx, rect.top);
      ctx.lineTo(gx, rect.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rect.left, gy);
      ctx.lineTo(rect.right, gy);
      ctx.stroke();
    }
  }

  function drawFieldArrows() {
    if (!state.showField) return;

    var spacing = 68;
    var charges = activeLevel().charges;
    var i;
    var j;

    for (var py = rect.top + 26; py < rect.bottom - 26; py += spacing) {
      for (var px = rect.left + 26; px < rect.right - 26; px += spacing) {
        var x = toWorldX(px);
        var y = toWorldY(py);

        var nearCharge = false;
        for (i = 0; i < charges.length; i += 1) {
          if (distance(x, y, charges[i].x, charges[i].y) < 0.44) {
            nearCharge = true;
            break;
          }
        }
        if (nearCharge) continue;

        var sample = fieldAt(x, y);
        var mag = Math.sqrt(sample.ex * sample.ex + sample.ey * sample.ey);
        if (mag < 0.012) continue;

        var ux = sample.ex / mag;
        var uy = sample.ey / mag;
        var scaledMag = Math.log(1 + 3.4 * mag);
        var len = clamp(8 + scaledMag * 8.5, 8, 21);
        var alpha = clamp(0.22 + scaledMag * 0.27, 0.22, 0.82);
        var x2 = px + ux * len;
        var y2 = py - uy * len;

        ctx.strokeStyle = "rgba(238, 245, 252," + alpha.toFixed(3) + ")";
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * 4.5 - uy * 3.0, y2 + uy * 4.5 - ux * 3.0);
        ctx.lineTo(x2 - ux * 4.5 + uy * 3.0, y2 + uy * 4.5 + ux * 3.0);
        ctx.closePath();
        ctx.fillStyle = "rgba(238, 245, 252," + clamp(alpha + 0.08, 0.28, 0.9).toFixed(3) + ")";
        ctx.fill();
      }
    }
  }

  function drawSurface() {
    var edges = surfaceEdges(state.surface);
    var x = toCanvasX(edges.left);
    var y = toCanvasY(edges.top);
    var w = toCanvasX(edges.right) - x;
    var h = toCanvasY(edges.bottom) - y;

    ctx.fillStyle = "rgba(111, 227, 196, 0.10)";
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "rgba(131, 243, 210, 0.95)";
    ctx.lineWidth = 2.8;
    ctx.setLineDash([14, 9]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    var handles = [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + h },
      { x: x, y: y + h }
    ];

    var i;
    for (i = 0; i < handles.length; i += 1) {
      ctx.fillStyle = "#83f3d2";
      ctx.beginPath();
      ctx.arc(handles[i].x, handles[i].y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0d1822";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawCharges() {
    var charges = activeLevel().charges;
    var enclosed = enclosedData().indices;
    var enclosedMap = {};
    var hintMap = {};
    var i;

    for (i = 0; i < enclosed.length; i += 1) {
      enclosedMap[enclosed[i]] = true;
    }
    for (i = 0; i < state.solutionIndices.length; i += 1) {
      hintMap[state.solutionIndices[i]] = true;
    }

    for (i = 0; i < charges.length; i += 1) {
      var cx = toCanvasX(charges[i].x);
      var cy = toCanvasY(charges[i].y);
      var radius = 17;

      if (state.showHint && hintMap[i]) {
        ctx.strokeStyle = "rgba(145, 228, 186, 0.92)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 9, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enclosedMap[i]) {
        ctx.strokeStyle = "rgba(255, 247, 203, 0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = charges[i].q > 0 ? "#f3b676" : "#7bcfff";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#10202c";
      ctx.font = "700 13px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(signed(charges[i].q), cx, cy + 1);
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function drawHud() {
    var level = activeLevel();
    var enclosed = enclosedData();

    ctx.fillStyle = "#edf5fb";
    ctx.font = "700 18px Georgia";
    ctx.fillText("Flux Box", rect.left + 16, rect.top + 28);
    ctx.font = "14px Georgia";
    ctx.fillStyle = "#a8bbcf";
    ctx.fillText("Move the Gaussian surface until Phi_E = q_enc in normalized units.", rect.left + 16, rect.top + 52);

    ctx.fillStyle = "rgba(255, 236, 190, 0.95)";
    drawRoundedRect(rect.right - 222, rect.top + 16, 188, 86, 15);
    ctx.fill();

    ctx.fillStyle = "#13212d";
    ctx.font = "700 13px Georgia";
    ctx.fillText("target flux: " + signed(level.target), rect.right - 206, rect.top + 42);
    ctx.fillText("enclosed q: " + signed(enclosed.netCharge), rect.right - 206, rect.top + 63);
    ctx.fillText("charges inside: " + enclosed.count, rect.right - 206, rect.top + 84);

    if (state.solved) {
      ctx.fillStyle = "rgba(146, 225, 176, 0.94)";
      drawRoundedRect(rect.left + 16, rect.bottom - 76, 270, 46, 14);
      ctx.fill();
      ctx.fillStyle = "#10202c";
      ctx.font = "700 14px Georgia";
      ctx.fillText("Solved: the enclosed charge matches the target flux.", rect.left + 30, rect.bottom - 47);
    }
  }

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08111a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0d1822";
    drawRoundedRect(rect.left, rect.top, rect.width, rect.height, 24);
    ctx.fill();

    drawGrid();
    drawFieldArrows();
    drawSurface();
    drawCharges();
    drawHud();
  }

  function randomizeSurface() {
    state.surface.cx = (Math.random() - 0.5) * 1.2;
    state.surface.cy = (Math.random() - 0.5) * 1.2;
    state.surface.hw = 0.95 + Math.random() * 0.75;
    state.surface.hh = 0.85 + Math.random() * 0.65;
  }

  function loadLevel(index) {
    state.levelIndex = (index + levels.length) % levels.length;
    state.attempts = 0;
    state.showHint = false;
    state.solved = false;
    state.bestDiff = null;
    state.solutionIndices = subsetForTarget(activeLevel().charges, activeLevel().target);
    state.dragging = null;
    randomizeSurface();
    state.message = "Drag the Gaussian surface until the net enclosed charge matches the target flux.";
    updateReadout();
    drawScene();
  }

  function checkSurface() {
    var level = activeLevel();
    var enclosed = enclosedData();
    var mismatch = level.target - enclosed.netCharge;
    var diff = Math.abs(mismatch);

    state.attempts += 1;
    if (state.bestDiff === null || diff < state.bestDiff) {
      state.bestDiff = diff;
    }

    if (mismatch === 0) {
      state.solved = true;
      state.message = "Solved. The enclosed charge matches the target flux exactly.";
    } else if (mismatch > 0) {
      state.message = "Flux is too small. Capture more positive charge or exclude some negative charge.";
    } else {
      state.message = "Flux is too large. Exclude some positive charge or include more negative charge.";
    }

    updateReadout();
    drawScene();
  }

  function toggleHint() {
    state.showHint = !state.showHint;
    if (state.showHint && !state.solutionIndices.length) {
      state.message = "No single shortest hint was found for this puzzle, but the target is still reachable.";
    } else if (state.showHint) {
      state.message = "Hint active. The green halos show one charge combination that matches the target.";
    } else {
      state.message = "Hint hidden. Solve it using the Gaussian surface alone.";
    }
    updateReadout();
    drawScene();
  }

  function resetSurface() {
    randomizeSurface();
    state.solved = false;
    state.message = "Surface reset. Drag or resize it to try a new enclosure.";
    updateReadout();
    drawScene();
  }

  function toggleField() {
    state.showField = !state.showField;
    state.message = state.showField ? "Field arrows on. Outside charges can look busy, but flux still depends only on enclosed charge." : "Field arrows off. Focus on the charge bookkeeping behind Gauss's law.";
    updateReadout();
    drawScene();
  }

  function handleAtPoint(x, y) {
    var edges = surfaceEdges(state.surface);
    var handles = [
      { key: "nw", x: edges.left, y: edges.top },
      { key: "ne", x: edges.right, y: edges.top },
      { key: "se", x: edges.right, y: edges.bottom },
      { key: "sw", x: edges.left, y: edges.bottom }
    ];

    var i;
    for (i = 0; i < handles.length; i += 1) {
      if (distance(x, y, handles[i].x, handles[i].y) < 0.34) {
        return handles[i].key;
      }
    }

    if (pointInSurface(x, y)) return "move";
    return null;
  }

  function setCursor(mode) {
    if (mode === "move") {
      canvas.style.cursor = "grab";
    } else if (mode === "nw" || mode === "se") {
      canvas.style.cursor = "nwse-resize";
    } else if (mode === "ne" || mode === "sw") {
      canvas.style.cursor = "nesw-resize";
    } else {
      canvas.style.cursor = "default";
    }
  }

  function startDrag(event) {
    var point = getEventPoint(event);
    var mode = handleAtPoint(point.x, point.y);
    if (!mode) return;

    event.preventDefault();
    state.dragging = {
      mode: mode,
      startX: point.x,
      startY: point.y,
      surface: copySurface(state.surface)
    };
    canvas.style.cursor = "grabbing";
  }

  function moveDrag(event) {
    if (!state.dragging) {
      setCursor(handleAtPoint(getEventPoint(event).x, getEventPoint(event).y));
      return;
    }

    event.preventDefault();
    var point = getEventPoint(event);
    var dx = point.x - state.dragging.startX;
    var dy = point.y - state.dragging.startY;
    var original = state.dragging.surface;

    if (state.dragging.mode === "move") {
      state.surface.cx = clamp(original.cx + dx, domain.xmin + original.hw, domain.xmax - original.hw);
      state.surface.cy = clamp(original.cy + dy, domain.ymin + original.hh, domain.ymax - original.hh);
    } else {
      var edges = surfaceEdges(original);
      var left = edges.left;
      var right = edges.right;
      var top = edges.top;
      var bottom = edges.bottom;

      if (state.dragging.mode === "nw" || state.dragging.mode === "sw") {
        left = clamp(edges.left + dx, domain.xmin, edges.right - 2 * minHalfSize);
      }
      if (state.dragging.mode === "ne" || state.dragging.mode === "se") {
        right = clamp(edges.right + dx, edges.left + 2 * minHalfSize, domain.xmax);
      }
      if (state.dragging.mode === "nw" || state.dragging.mode === "ne") {
        top = clamp(edges.top + dy, edges.bottom + 2 * minHalfSize, domain.ymax);
      }
      if (state.dragging.mode === "sw" || state.dragging.mode === "se") {
        bottom = clamp(edges.bottom + dy, domain.ymin, edges.top - 2 * minHalfSize);
      }

      state.surface.cx = 0.5 * (left + right);
      state.surface.cy = 0.5 * (top + bottom);
      state.surface.hw = 0.5 * (right - left);
      state.surface.hh = 0.5 * (top - bottom);
    }

    updateReadout();
    drawScene();
  }

  function endDrag() {
    state.dragging = null;
    canvas.style.cursor = "default";
  }

  checkFluxBtn.addEventListener("click", checkSurface);
  hintBtn.addEventListener("click", toggleHint);
  resetSurfaceBtn.addEventListener("click", resetSurface);
  fieldToggleBtn.addEventListener("click", toggleField);
  nextLevelBtn.addEventListener("click", function () {
    loadLevel(state.levelIndex + 1);
  });

  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", moveDrag);
  canvas.addEventListener("mouseleave", endDrag);
  window.addEventListener("mouseup", endDrag);

  canvas.addEventListener("touchstart", startDrag, { passive: false });
  canvas.addEventListener("touchmove", moveDrag, { passive: false });
  canvas.addEventListener("touchend", endDrag, { passive: false });
  canvas.addEventListener("touchcancel", endDrag, { passive: false });

  loadLevel(0);
}());
