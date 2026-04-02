(function () {
  var domainMin = -4.0;
  var domainMax = 4.0;
  var sampleCount = 600;
  var xs = [];
  var i;

  for (i = 0; i < sampleCount; i += 1) {
    xs.push(domainMin + (i / (sampleCount - 1)) * (domainMax - domainMin));
  }

  var dx = xs[1] - xs[0];

  var levels = [
    [
      { position: -2.35, strength: 0.95 },
      { position: -0.45, strength: -0.65 },
      { position: 1.35, strength: 1.15 },
      { position: 2.60, strength: -0.55 }
    ],
    [
      { position: -2.80, strength: -0.85 },
      { position: -1.10, strength: 1.05 },
      { position: 0.90, strength: 0.72 },
      { position: 2.20, strength: -1.00 }
    ],
    [
      { position: -2.00, strength: 0.60 },
      { position: -0.20, strength: 1.25 },
      { position: 1.10, strength: -0.80 },
      { position: 2.90, strength: 0.72 }
    ]
  ];

  var canvas = document.getElementById("chargeHuntCanvas");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var heatStrip = document.getElementById("heatStrip");
  var heatCtx = heatStrip ? heatStrip.getContext("2d") : null;

  var centerSlider = document.getElementById("centerSlider");
  var epsilonSlider = document.getElementById("epsilonSlider");
  var newLevelBtn = document.getElementById("newLevelBtn");
  var revealBtn = document.getElementById("revealBtn");
  var resetTrailBtn = document.getElementById("resetTrailBtn");

  var centerValue = document.getElementById("centerValue");
  var epsilonValue = document.getElementById("epsilonValue");
  var responseValue = document.getElementById("responseValue");
  var bestValue = document.getElementById("bestValue");
  var scanCountValue = document.getElementById("scanCountValue");
  var levelValue = document.getElementById("levelValue");
  var huntStatus = document.getElementById("huntStatus");

  var state = {
    levelIndex: 0,
    center: 0.0,
    epsilon: 0.28,
    reveal: false,
    best: 0.0,
    scans: [],
    dragging: false
  };

  if (!canvas || !ctx || !heatStrip || !heatCtx) {
    return;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function activeCharges() {
    return levels[state.levelIndex];
  }

  function gaussianDelta(x, epsilon, center) {
    var scaled = (x - center) / epsilon;
    return Math.exp(-scaled * scaled) / (Math.sqrt(Math.PI) * epsilon);
  }

  function chargeDensity(x, charges) {
    var sigma = 0.12;
    var total = 0.0;
    var j;
    for (j = 0; j < charges.length; j += 1) {
      var scaled = (x - charges[j].position) / sigma;
      total += charges[j].strength * Math.exp(-scaled * scaled) / (Math.sqrt(Math.PI) * sigma);
    }
    return total;
  }

  function responseFor(center, epsilon) {
    var charges = activeCharges();
    var total = 0.0;
    var j;
    for (j = 0; j < xs.length; j += 1) {
      total += chargeDensity(xs[j], charges) * gaussianDelta(xs[j], epsilon, center) * dx;
    }
    return Math.abs(total) / (1.0 + 3.6 * epsilon);
  }

  function maxAbsProfile() {
    var charges = activeCharges();
    var maxValue = 1.2;
    var j;
    for (j = 0; j < xs.length; j += 1) {
      var value = Math.abs(chargeDensity(xs[j], charges));
      if (value > maxValue) {
        maxValue = value;
      }
    }
    return maxValue;
  }

  function xToCanvas(x, rect) {
    return rect.left + ((x - domainMin) / (domainMax - domainMin)) * rect.width;
  }

  function yToCanvas(y, rect, yMin, yMax) {
    return rect.bottom - ((y - yMin) / (yMax - yMin)) * rect.height;
  }

  function roundedRect(x, y, w, h, r) {
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

  function addScan() {
    var response = responseFor(state.center, state.epsilon);
    state.scans.push({
      center: state.center,
      response: response
    });
    if (state.scans.length > 250) {
      state.scans.shift();
    }
    if (response > state.best) {
      state.best = response;
    }
  }

  function statusText(response) {
    if (response > 0.55) return "Very hot. You are close to a hidden source.";
    if (response > 0.32) return "Warm. Sweep nearby and tighten epsilon.";
    if (response > 0.16) return "Faint signal. Keep scanning.";
    if (state.epsilon > 0.6) return "Cold. Your detector is too wide.";
    return "Cold. Sweep the line first before shrinking epsilon.";
  }

  function updateReadout() {
    var response = responseFor(state.center, state.epsilon);
    levelValue.textContent = String(state.levelIndex + 1);
    centerValue.textContent = state.center.toFixed(2);
    epsilonValue.textContent = state.epsilon.toFixed(2);
    responseValue.textContent = response.toFixed(3);
    bestValue.textContent = state.best.toFixed(3);
    scanCountValue.textContent = String(state.scans.length);
    huntStatus.textContent = statusText(response);
    huntStatus.className = "hunt-status";
    if (response > 0.55) huntStatus.className += " hot";
    else if (response > 0.22) huntStatus.className += " warm";
    else huntStatus.className += " cold";
  }

  function drawHeatStrip() {
    var width = heatStrip.width;
    var height = heatStrip.height;
    heatCtx.clearRect(0, 0, width, height);
    heatCtx.fillStyle = "#0d1822";
    heatCtx.fillRect(0, 0, width, height);

    var j;
    var maxResponse = 0.001;
    var responses = [];
    for (j = 0; j < width; j += 1) {
      var x = domainMin + (j / (width - 1)) * (domainMax - domainMin);
      var r = responseFor(x, state.epsilon);
      responses.push(r);
      if (r > maxResponse) maxResponse = r;
    }

    for (j = 0; j < width; j += 1) {
      var t = responses[j] / maxResponse;
      var red = Math.round(34 + t * 220);
      var green = Math.round(62 + t * 135);
      var blue = Math.round(88 - t * 45);
      heatCtx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
      heatCtx.fillRect(j, 18, 1, 26);
    }

    var markerX = ((state.center - domainMin) / (domainMax - domainMin)) * width;
    heatCtx.strokeStyle = "rgba(255,255,255,0.92)";
    heatCtx.lineWidth = 2;
    heatCtx.beginPath();
    heatCtx.moveTo(markerX, 10);
    heatCtx.lineTo(markerX, 60);
    heatCtx.stroke();
  }

  function drawGame() {
    var response = responseFor(state.center, state.epsilon);
    var maxAbs = maxAbsProfile();
    var topRect = { left: 42, top: 30, width: canvas.width - 84, height: 360, right: canvas.width - 42, bottom: 390 };
    var bottomRect = { left: 42, top: 470, width: canvas.width - 84, height: 140, right: canvas.width - 42, bottom: 610 };
    var detectorX = xToCanvas(state.center, topRect);
    var j;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08111a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0d1822";
    roundedRect(topRect.left, topRect.top, topRect.width, topRect.height, 22);
    ctx.fill();
    roundedRect(bottomRect.left, bottomRect.top, bottomRect.width, bottomRect.height, 22);
    ctx.fill();

    ctx.strokeStyle = "rgba(179,199,218,0.14)";
    ctx.lineWidth = 1;
    for (j = 0; j <= 8; j += 1) {
      var gx = topRect.left + (j / 8) * topRect.width;
      ctx.beginPath();
      ctx.moveTo(gx, topRect.top + 16);
      ctx.lineTo(gx, topRect.bottom - 16);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(topRect.left + 14, yToCanvas(0, topRect, -maxAbs, maxAbs));
    ctx.lineTo(topRect.right - 14, yToCanvas(0, topRect, -maxAbs, maxAbs));
    ctx.stroke();

    ctx.beginPath();
    for (j = 0; j < xs.length; j += 1) {
      var scaled = (xs[j] - state.center) / Math.max(state.epsilon, 0.05);
      var kernelPreview = 1.12 * Math.exp(-scaled * scaled);
      var px = xToCanvas(xs[j], topRect);
      var py = yToCanvas(kernelPreview, topRect, -maxAbs, maxAbs);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "rgba(121,216,255,0.95)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    if (state.reveal) {
      ctx.beginPath();
      for (j = 0; j < xs.length; j += 1) {
        var chargeY = chargeDensity(xs[j], activeCharges());
        var qx = xToCanvas(xs[j], topRect);
        var qy = yToCanvas(chargeY, topRect, -maxAbs, maxAbs);
        if (j === 0) ctx.moveTo(qx, qy);
        else ctx.lineTo(qx, qy);
      }
      ctx.strokeStyle = "#79d8ff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (j = 0; j < state.scans.length; j += 1) {
      var scan = state.scans[j];
      var sx = xToCanvas(scan.center, bottomRect);
      var alpha = Math.min(0.95, 0.24 + scan.response * 1.2);
      ctx.fillStyle = "rgba(236,187,134," + alpha + ")";
      ctx.beginPath();
      ctx.arc(sx, bottomRect.top + 38, 8 + scan.response * 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#edf5fb";
    ctx.font = "700 17px Georgia";
    ctx.fillText("Hidden line-charge profile", topRect.left + 18, topRect.top + 28);
    ctx.font = "14px Georgia";
    ctx.fillStyle = "#a8bbcf";
    ctx.fillText(state.reveal ? "Source revealed." : "Source hidden. Scan the line and watch the detector response.", topRect.left + 18, topRect.top + 50);

    ctx.fillStyle = "rgba(255,190,90," + Math.min(0.95, 0.14 + response * 0.9) + ")";
    ctx.beginPath();
    ctx.arc(detectorX, topRect.top + 96, 18 + (1.2 - state.epsilon) * 18 + response * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8d6a1";
    ctx.beginPath();
    ctx.arc(detectorX, topRect.top + 96, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "700 15px Georgia";
    ctx.fillText("a = " + state.center.toFixed(2), detectorX - 24, topRect.top + 136);

    ctx.strokeStyle = "rgba(248,214,161,0.42)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(detectorX, topRect.top + 118);
    ctx.lineTo(detectorX, topRect.bottom - 18);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(121,216,255,0.16)";
    roundedRect(detectorX - state.epsilon * 80, topRect.bottom - 58, state.epsilon * 160, 32, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(255,196,120,0.96)";
    roundedRect(topRect.right - 160, topRect.top + 18, 128, 36, 14);
    ctx.fill();
    ctx.fillStyle = "#13212d";
    ctx.font = "700 12px Georgia";
    ctx.fillText("response", topRect.right - 148, topRect.top + 32);
    ctx.font = "700 16px Georgia";
    ctx.fillText(response.toFixed(3), topRect.right - 90, topRect.top + 32);

    ctx.fillStyle = "#edf5fb";
    ctx.font = "700 15px Georgia";
    ctx.fillText("Detector response trail", bottomRect.left + 18, bottomRect.top + 28);
    ctx.font = "13px Georgia";
    ctx.fillStyle = "#a8bbcf";
    ctx.fillText("Each glow marks a scan. Brighter means stronger overlap.", bottomRect.left + 18, bottomRect.top + 52);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundedRect(bottomRect.left + 18, bottomRect.bottom - 36, bottomRect.width - 36, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#f5c48e";
    roundedRect(bottomRect.left + 18, bottomRect.bottom - 36, (bottomRect.width - 36) * Math.min(1, response / 0.8), 16, 8);
    ctx.fill();
    ctx.fillStyle = "#edf5fb";
    ctx.font = "15px Georgia";
    ctx.fillText("Response meter", bottomRect.left + 18, bottomRect.bottom - 48);

    drawHeatStrip();
  }

  function refreshAll() {
    updateReadout();
    drawGame();
  }

  function setCenter(value) {
    state.center = clamp(parseFloat(value), domainMin, domainMax);
    centerSlider.value = String(state.center);
    addScan();
    refreshAll();
  }

  function setEpsilon(value) {
    state.epsilon = clamp(parseFloat(value), 0.05, 1.2);
    epsilonSlider.value = String(state.epsilon);
    addScan();
    refreshAll();
  }

  function newLevel() {
    state.levelIndex = (state.levelIndex + 1) % levels.length;
    state.center = 0.0;
    state.epsilon = 0.28;
    state.reveal = false;
    state.best = 0.0;
    state.scans = [];
    revealBtn.textContent = "Reveal Source";
    centerSlider.value = "0";
    epsilonSlider.value = "0.28";
    addScan();
    refreshAll();
  }

  centerSlider.addEventListener("input", function () {
    setCenter(centerSlider.value);
  });

  epsilonSlider.addEventListener("input", function () {
    setEpsilon(epsilonSlider.value);
  });

  newLevelBtn.addEventListener("click", function () {
    newLevel();
  });

  revealBtn.addEventListener("click", function () {
    state.reveal = !state.reveal;
    revealBtn.textContent = state.reveal ? "Hide Source" : "Reveal Source";
    refreshAll();
  });

  resetTrailBtn.addEventListener("click", function () {
    state.scans = [];
    state.best = 0.0;
    addScan();
    refreshAll();
  });

  canvas.addEventListener("mousedown", function (event) {
    state.dragging = true;
    var rect = canvas.getBoundingClientRect();
    var localX = clamp(event.clientX - rect.left, 42, canvas.width - 42);
    var t = (localX - 42) / (canvas.width - 84);
    setCenter(domainMin + t * (domainMax - domainMin));
  });

  window.addEventListener("mouseup", function () {
    state.dragging = false;
  });

  canvas.addEventListener("mousemove", function (event) {
    if (!state.dragging) return;
    var rect = canvas.getBoundingClientRect();
    var localX = clamp(event.clientX - rect.left, 42, canvas.width - 42);
    var t = (localX - 42) / (canvas.width - 84);
    setCenter(domainMin + t * (domainMax - domainMin));
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      setCenter(state.center - 0.08);
    } else if (event.key === "ArrowRight") {
      setCenter(state.center + 0.08);
    } else if (event.key === "ArrowUp") {
      setEpsilon(state.epsilon * 0.92);
    } else if (event.key === "ArrowDown") {
      setEpsilon(state.epsilon * 1.08);
    } else if ((event.key || "").toLowerCase() === "r") {
      state.reveal = !state.reveal;
      revealBtn.textContent = state.reveal ? "Hide Source" : "Reveal Source";
      refreshAll();
    } else if ((event.key || "").toLowerCase() === "n") {
      newLevel();
    }
  });

  addScan();
  refreshAll();
})();
