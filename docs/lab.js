(function () {
  var canvas = document.getElementById("labCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var addPositiveBtn = document.getElementById("addPositiveBtn");
  var addNegativeBtn = document.getElementById("addNegativeBtn");
  var resetChargesBtn = document.getElementById("resetChargesBtn");
  var groundedToggleBtn = document.getElementById("groundedToggleBtn");
  var launchParticleBtn = document.getElementById("launchParticleBtn");
  var resetParticleBtn = document.getElementById("resetParticleBtn");
  var heatSlider = document.getElementById("heatSlider");
  var arrowSlider = document.getElementById("arrowSlider");
  var particleSlider = document.getElementById("particleSlider");

  var chargeCountValue = document.getElementById("chargeCountValue");
  var modeValue = document.getElementById("modeValue");
  var probeXValue = document.getElementById("probeXValue");
  var probeYValue = document.getElementById("probeYValue");
  var potentialValue = document.getElementById("potentialValue");
  var fieldMagValue = document.getElementById("fieldMagValue");

  var rect = { left: 34, top: 34, width: 1000, height: 752, right: 1034, bottom: 786 };
  var domain = { xmin: -4, xmax: 4, ymin: -4, ymax: 4 };
  var groundY = 0;

  var state = {
    charges: [
      { x: -1.6, y: 1.8, q: 1.0 },
      { x: 1.4, y: 0.9, q: -1.0 }
    ],
    grounded: false,
    draggingIndex: -1,
    heatGain: 1.0,
    arrowStep: 18,
    particleSpeed: 1.0,
    probeX: 0,
    probeY: 0,
    particle: {
      x: -3.0,
      y: 2.8,
      vx: 0.0,
      vy: 0.0,
      active: false,
      trail: []
    }
  };

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
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

  function distance(x1, y1, x2, y2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function effectiveCharges() {
    var charges = state.charges.slice();
    if (state.grounded) {
      for (var i = 0; i < state.charges.length; i += 1) {
        charges.push({
          x: state.charges[i].x,
          y: -state.charges[i].y,
          q: -state.charges[i].q,
          image: true
        });
      }
    }
    return charges;
  }

  function fieldAndPotential(x, y) {
    var charges = effectiveCharges();
    var ex = 0;
    var ey = 0;
    var phi = 0;
    for (var i = 0; i < charges.length; i += 1) {
      var dx = x - charges[i].x;
      var dy = y - charges[i].y;
      var r2 = dx * dx + dy * dy + 0.02;
      var r = Math.sqrt(r2);
      phi += charges[i].q / r;
      ex += charges[i].q * dx / (r2 * r);
      ey += charges[i].q * dy / (r2 * r);
    }
    return { ex: ex, ey: ey, phi: phi };
  }

  function updateReadout() {
    var sample = fieldAndPotential(state.probeX, state.probeY);
    chargeCountValue.textContent = String(state.charges.length);
    modeValue.textContent = state.grounded ? "Grounded plane" : "Free space";
    probeXValue.textContent = state.probeX.toFixed(2);
    probeYValue.textContent = state.probeY.toFixed(2);
    potentialValue.textContent = sample.phi.toFixed(3);
    fieldMagValue.textContent = Math.sqrt(sample.ex * sample.ex + sample.ey * sample.ey).toFixed(3);
    groundedToggleBtn.textContent = state.grounded ? "Grounded Plane: On" : "Grounded Plane: Off";
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

  function drawHeatmap() {
    var cols = 36;
    var rows = 36;
    var cellW = rect.width / cols;
    var cellH = rect.height / rows;
    for (var iy = 0; iy < rows; iy += 1) {
      for (var ix = 0; ix < cols; ix += 1) {
        var x = domain.xmin + (ix + 0.5) / cols * (domain.xmax - domain.xmin);
        var y = domain.ymax - (iy + 0.5) / rows * (domain.ymax - domain.ymin);
        if (state.grounded && y < 0) {
          ctx.fillStyle = "rgba(8, 17, 26, 0.98)";
        } else {
          var phi = fieldAndPotential(x, y).phi * state.heatGain;
          var clipped = clamp(phi / 4.0, -1, 1);
          var red = clipped > 0 ? Math.round(60 + 190 * clipped) : 42;
          var blue = clipped < 0 ? Math.round(60 + 190 * (-clipped)) : 62;
          var green = Math.round(52 + 70 * (1 - Math.abs(clipped)));
          ctx.fillStyle = "rgba(" + red + "," + green + "," + blue + ",0.75)";
        }
        ctx.fillRect(rect.left + ix * cellW, rect.top + iy * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  function drawContours() {
    var levelsPhi = [-3, -2, -1, 1, 2, 3];
    var cols = 52;
    var rows = 52;
    for (var k = 0; k < levelsPhi.length; k += 1) {
      var level = levelsPhi[k];
      ctx.strokeStyle = level > 0 ? "rgba(255, 214, 144, 0.38)" : "rgba(130, 214, 255, 0.34)";
      ctx.lineWidth = 1;
      for (var iy = 0; iy < rows - 1; iy += 1) {
        for (var ix = 0; ix < cols - 1; ix += 1) {
          var x0 = domain.xmin + ix / (cols - 1) * (domain.xmax - domain.xmin);
          var x1 = domain.xmin + (ix + 1) / (cols - 1) * (domain.xmax - domain.xmin);
          var y0 = domain.ymax - iy / (rows - 1) * (domain.ymax - domain.ymin);
          var y1 = domain.ymax - (iy + 1) / (rows - 1) * (domain.ymax - domain.ymin);
          if (state.grounded && (y0 < 0 || y1 < 0)) continue;
          var p00 = fieldAndPotential(x0, y0).phi;
          var p10 = fieldAndPotential(x1, y0).phi;
          var p01 = fieldAndPotential(x0, y1).phi;
          var p11 = fieldAndPotential(x1, y1).phi;
          var minPhi = Math.min(p00, p10, p01, p11);
          var maxPhi = Math.max(p00, p10, p01, p11);
          if (level < minPhi || level > maxPhi) continue;
          ctx.beginPath();
          ctx.moveTo(toCanvasX(x0), toCanvasY(y0));
          ctx.lineTo(toCanvasX(x1), toCanvasY(y0));
          ctx.lineTo(toCanvasX(x1), toCanvasY(y1));
          ctx.lineTo(toCanvasX(x0), toCanvasY(y1));
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }

  function drawFieldArrows() {
    var step = state.arrowStep;
    var spacing = step * 2.0;
    var charges = effectiveCharges();
    for (var py = rect.top + 22; py < rect.bottom - 22; py += spacing) {
      for (var px = rect.left + 22; px < rect.right - 22; px += spacing) {
        var x = toWorldX(px);
        var y = toWorldY(py);
        if (state.grounded && y < 0) continue;

        var tooClose = false;
        for (var i = 0; i < charges.length; i += 1) {
          if (distance(x, y, charges[i].x, charges[i].y) < 0.34) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        var sample = fieldAndPotential(x, y);
        var mag = Math.sqrt(sample.ex * sample.ex + sample.ey * sample.ey);
        if (mag < 0.004) continue;
        var ux = sample.ex / mag;
        var uy = sample.ey / mag;
        var scaledMag = Math.log(1 + 3.2 * mag);
        var len = clamp(7 + scaledMag * 7.5, 7, 20);
        var alpha = clamp(0.26 + scaledMag * 0.28, 0.24, 0.82);
        var x2 = px + ux * len;
        var y2 = py - uy * len;
        ctx.strokeStyle = "rgba(239, 246, 252," + alpha.toFixed(3) + ")";
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * 4.6 - uy * 3.2, y2 + uy * 4.6 - ux * 3.2);
        ctx.lineTo(x2 - ux * 4.6 + uy * 3.2, y2 + uy * 4.6 + ux * 3.2);
        ctx.closePath();
        ctx.fillStyle = "rgba(239, 246, 252," + clamp(alpha + 0.05, 0.3, 0.9).toFixed(3) + ")";
        ctx.fill();
      }
    }
  }

  function drawCharges() {
    var charges = effectiveCharges();
    for (var i = 0; i < charges.length; i += 1) {
      var cx = toCanvasX(charges[i].x);
      var cy = toCanvasY(charges[i].y);
      var radius = charges[i].image ? 11 : 15;
      ctx.fillStyle = charges[i].q > 0 ? (charges[i].image ? "rgba(255, 173, 120, 0.55)" : "#f6b873") : (charges[i].image ? "rgba(123, 205, 255, 0.55)" : "#79d0ff");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#10202c";
      ctx.font = "700 16px Georgia";
      ctx.fillText(charges[i].q > 0 ? "+" : "-", cx - 5, cy + 5);
    }
  }

  function drawGroundPlane() {
    if (!state.grounded) return;
    var py = toCanvasY(0);
    ctx.fillStyle = "rgba(10, 18, 26, 0.96)";
    ctx.fillRect(rect.left, py, rect.width, rect.bottom - py);
    ctx.strokeStyle = "rgba(240, 245, 250, 0.7)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(rect.left, py);
    ctx.lineTo(rect.right, py);
    ctx.stroke();
    ctx.fillStyle = "#d9e6f2";
    ctx.font = "700 15px Georgia";
    ctx.fillText("grounded conductor", rect.left + 18, py + 26);
  }

  function updateParticle() {
    if (!state.particle.active) return;
    var dt = 0.022 * state.particleSpeed;
    var sample = fieldAndPotential(state.particle.x, state.particle.y);
    state.particle.vx += sample.ex * dt * 0.75;
    state.particle.vy += sample.ey * dt * 0.75;
    state.particle.x += state.particle.vx * dt;
    state.particle.y += state.particle.vy * dt;
    state.particle.trail.push({ x: state.particle.x, y: state.particle.y });
    if (state.particle.trail.length > 320) state.particle.trail.shift();
    if (state.grounded && state.particle.y <= 0) state.particle.active = false;
    if (state.particle.x < domain.xmin || state.particle.x > domain.xmax || state.particle.y < domain.ymin || state.particle.y > domain.ymax) {
      state.particle.active = false;
    }
  }

  function drawParticle() {
    var trail = state.particle.trail;
    if (trail.length > 1) {
      ctx.beginPath();
      for (var i = 0; i < trail.length; i += 1) {
        var px = toCanvasX(trail[i].x);
        var py = toCanvasY(trail[i].y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "rgba(255, 236, 180, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    var cx = toCanvasX(state.particle.x);
    var cy = toCanvasY(state.particle.y);
    ctx.fillStyle = "#fff3be";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHUD() {
    ctx.fillStyle = "#edf5fb";
    ctx.font = "700 18px Georgia";
    ctx.fillText("Mini Electrodynamics Lab", rect.left + 16, rect.top + 28);
    ctx.font = "14px Georgia";
    ctx.fillStyle = "#a8bbcf";
    ctx.fillText("Drag charges, probe the field, and launch a test particle.", rect.left + 16, rect.top + 52);

    ctx.fillStyle = "rgba(255, 196, 120, 0.96)";
    drawRoundedRect(rect.right - 196, rect.top + 16, 164, 72, 14);
    ctx.fill();
    ctx.fillStyle = "#13212d";
    ctx.font = "700 13px Georgia";
    ctx.fillText(state.grounded ? "mode: grounded plane" : "mode: free space", rect.right - 182, rect.top + 38);
    ctx.fillText("charges: " + state.charges.length, rect.right - 182, rect.top + 60);
    ctx.fillText("particle: " + (state.particle.active ? "moving" : "idle"), rect.right - 182, rect.top + 82);
  }

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08111a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0d1822";
    drawRoundedRect(rect.left, rect.top, rect.width, rect.height, 24);
    ctx.fill();

    drawHeatmap();
    drawContours();
    drawFieldArrows();
    drawGroundPlane();
    drawParticle();
    drawCharges();
    drawHUD();

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
  }

  function refreshAll() {
    updateReadout();
    drawScene();
  }

  function resetParticle() {
    state.particle.x = -3.0;
    state.particle.y = state.grounded ? 2.4 : 2.8;
    state.particle.vx = 0.0;
    state.particle.vy = 0.0;
    state.particle.active = false;
    state.particle.trail = [];
  }

  function addCharge(sign) {
    state.charges.push({ x: 0.0, y: state.grounded ? 1.2 : 0.0, q: sign });
    refreshAll();
  }

  function resetCharges() {
    state.charges = [
      { x: -1.6, y: 1.8, q: 1.0 },
      { x: 1.4, y: 0.9, q: -1.0 }
    ];
    resetParticle();
    refreshAll();
  }

  function pickCharge(px, py) {
    for (var i = state.charges.length - 1; i >= 0; i -= 1) {
      var cx = toCanvasX(state.charges[i].x);
      var cy = toCanvasY(state.charges[i].y);
      if (distance(px, py, cx, cy) < 18) return i;
    }
    return -1;
  }

  function updateProbeFromMouse(px, py) {
    state.probeX = clamp(toWorldX(px), domain.xmin, domain.xmax);
    state.probeY = clamp(toWorldY(py), domain.ymin, domain.ymax);
  }

  function canvasPointFromEvent(event) {
    var bounds = canvas.getBoundingClientRect();
    var scaleX = canvas.width / bounds.width;
    var scaleY = canvas.height / bounds.height;
    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY
    };
  }

  canvas.addEventListener("mousedown", function (event) {
    var point = canvasPointFromEvent(event);
    var px = point.x;
    var py = point.y;
    updateProbeFromMouse(px, py);
    state.draggingIndex = pickCharge(px, py);
    refreshAll();
  });

  canvas.addEventListener("mousemove", function (event) {
    var point = canvasPointFromEvent(event);
    var px = point.x;
    var py = point.y;
    updateProbeFromMouse(px, py);
    if (state.draggingIndex >= 0) {
      state.charges[state.draggingIndex].x = clamp(toWorldX(px), domain.xmin + 0.2, domain.xmax - 0.2);
      state.charges[state.draggingIndex].y = clamp(toWorldY(py), state.grounded ? 0.25 : domain.ymin + 0.2, domain.ymax - 0.2);
    }
    refreshAll();
  });

  window.addEventListener("mouseup", function () {
    state.draggingIndex = -1;
  });

  addPositiveBtn.addEventListener("click", function () {
    addCharge(1.0);
  });

  addNegativeBtn.addEventListener("click", function () {
    addCharge(-1.0);
  });

  resetChargesBtn.addEventListener("click", function () {
    resetCharges();
  });

  groundedToggleBtn.addEventListener("click", function () {
    state.grounded = !state.grounded;
    for (var i = 0; i < state.charges.length; i += 1) {
      if (state.grounded && state.charges[i].y < 0.25) state.charges[i].y = 0.25;
    }
    resetParticle();
    refreshAll();
  });

  launchParticleBtn.addEventListener("click", function () {
    resetParticle();
    state.particle.vx = 0.9;
    state.particle.vy = -0.15;
    state.particle.active = true;
  });

  resetParticleBtn.addEventListener("click", function () {
    resetParticle();
    refreshAll();
  });

  heatSlider.addEventListener("input", function () {
    state.heatGain = parseFloat(heatSlider.value);
    refreshAll();
  });

  arrowSlider.addEventListener("input", function () {
    state.arrowStep = parseInt(arrowSlider.value, 10);
    refreshAll();
  });

  particleSlider.addEventListener("input", function () {
    state.particleSpeed = parseFloat(particleSlider.value);
  });

  function frame() {
    updateParticle();
    refreshAll();
    window.requestAnimationFrame(frame);
  }

  resetParticle();
  refreshAll();
  window.requestAnimationFrame(frame);
})();
