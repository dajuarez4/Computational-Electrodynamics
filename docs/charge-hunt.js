(function () {
  const domainMin = -4;
  const domainMax = 4;
  const samples = 900;
  const xs = Array.from({ length: samples }, (_, i) => domainMin + (i / (samples - 1)) * (domainMax - domainMin));
  const dx = xs[1] - xs[0];

  const levels = [
    [
      { position: -2.35, strength: 0.95 },
      { position: -0.45, strength: -0.65 },
      { position: 1.35, strength: 1.15 },
      { position: 2.6, strength: -0.55 }
    ],
    [
      { position: -2.8, strength: -0.85 },
      { position: -1.1, strength: 1.05 },
      { position: 0.9, strength: 0.72 },
      { position: 2.2, strength: -1.0 }
    ],
    [
      { position: -2.0, strength: 0.6 },
      { position: -0.2, strength: 1.25 },
      { position: 1.1, strength: -0.8 },
      { position: 2.9, strength: 0.72 }
    ]
  ];

  const canvas = document.getElementById("chargeHuntCanvas");
  const ctx = canvas.getContext("2d");
  const centerSlider = document.getElementById("centerSlider");
  const epsilonSlider = document.getElementById("epsilonSlider");
  const newLevelBtn = document.getElementById("newLevelBtn");
  const revealBtn = document.getElementById("revealBtn");
  const resetTrailBtn = document.getElementById("resetTrailBtn");

  const centerValue = document.getElementById("centerValue");
  const epsilonValue = document.getElementById("epsilonValue");
  const responseValue = document.getElementById("responseValue");
  const bestValue = document.getElementById("bestValue");
  const scanCountValue = document.getElementById("scanCountValue");
  const levelValue = document.getElementById("levelValue");
  const huntStatus = document.getElementById("huntStatus");
  const heatStrip = document.getElementById("heatStrip");
  const heatCtx = heatStrip.getContext("2d");

  const state = {
    levelIndex: 0,
    center: 0,
    epsilon: 0.28,
    reveal: false,
    best: 0,
    scans: [],
    draggingCanvas: false,
    seed: Math.random() * 1000
  };

  function gaussianDelta(x, epsilon, center) {
    const scaled = (x - center) / epsilon;
    return Math.exp(-Math.pow(scaled, 2)) / (Math.sqrt(Math.PI) * epsilon);
  }

  function chargeDensity(x, charges, sigma = 0.12) {
    let total = 0;
    for (const charge of charges) {
      const scaled = (x - charge.position) / sigma;
      total += charge.strength * Math.exp(-Math.pow(scaled, 2)) / (Math.sqrt(Math.PI) * sigma);
    }
    return total;
  }

  function activeCharges() {
    return levels[state.levelIndex];
  }

  function randomLevel() {
    const count = 4 + Math.floor(Math.random() * 2);
    const charges = [];
    for (let i = 0; i < count; i += 1) {
      charges.push({
        position: -3 + Math.random() * 6,
        strength: (Math.random() > 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.95)
      });
    }
    return charges.sort((a, b) => a.position - b.position);
  }

  function profileValues() {
    const charges = activeCharges();
    return xs.map((x) => chargeDensity(x, charges));
  }

  function responseFor(center, epsilon) {
    const charges = activeCharges();
    let total = 0;
    for (let i = 0; i < xs.length; i += 1) {
      const density = chargeDensity(xs[i], charges);
      const kernel = gaussianDelta(xs[i], epsilon, center);
      total += density * kernel * dx;
    }
    const localizationBonus = 1 / (1 + 3.6 * epsilon);
    return Math.abs(total) * localizationBonus;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function xToCanvas(x, rect) {
    return rect.left + ((x - domainMin) / (domainMax - domainMin)) * rect.width;
  }

  function yToCanvas(y, rect, yMin, yMax) {
    const t = (y - yMin) / (yMax - yMin);
    return rect.bottom - t * rect.height;
  }

  function addScan() {
    const response = responseFor(state.center, state.epsilon);
    state.best = Math.max(state.best, response);
    state.scans.push({
      center: state.center,
      epsilon: state.epsilon,
      response
    });
    if (state.scans.length > 400) {
      state.scans.shift();
    }
  }

  function statusFor(response, best, epsilon) {
    if (best > 0.72 && epsilon < 0.18) return "Locked on. This is the kind of narrow, centered hit you want.";
    if (response > 0.55) return "Very hot. You are almost sitting on top of the source.";
    if (response > 0.32) return "Warm. Something is nearby, tighten the detector.";
    if (response > 0.16) return "Faint signal. Keep sweeping and compare nearby positions.";
    if (epsilon > 0.65) return "Cold. Your detector is too wide right now.";
    return "Cold. Sweep the line first before shrinking ε.";
  }

  function refreshReadout() {
    const response = responseFor(state.center, state.epsilon);
    levelValue.textContent = String(state.levelIndex + 1);
    centerValue.textContent = state.center.toFixed(2);
    epsilonValue.textContent = state.epsilon.toFixed(2);
    responseValue.textContent = response.toFixed(3);
    bestValue.textContent = state.best.toFixed(3);
    scanCountValue.textContent = String(state.scans.length);
    huntStatus.textContent = statusFor(response, state.best, state.epsilon);
    huntStatus.className = `hunt-status ${response > 0.55 ? "hot" : response > 0.22 ? "warm" : "cold"}`;
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

  function draw() {
    const profile = profileValues();
    const response = responseFor(state.center, state.epsilon);
    const maxAbs = Math.max(...profile.map((v) => Math.abs(v)), 1.2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08111a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const topRect = { left: 42, top: 38, width: canvas.width - 84, height: 270, right: canvas.width - 42, bottom: 308 };
    const bottomRect = { left: 42, top: 350, width: canvas.width - 84, height: 128, right: canvas.width - 42, bottom: 478 };

    ctx.fillStyle = "#0d1822";
    drawRoundedRect(topRect.left, topRect.top, topRect.width, topRect.height, 22);
    ctx.fill();
    drawRoundedRect(bottomRect.left, bottomRect.top, bottomRect.width, bottomRect.height, 22);
    ctx.fill();

    ctx.strokeStyle = "rgba(179, 199, 218, 0.14)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i += 1) {
      const x = topRect.left + (i / 8) * topRect.width;
      ctx.beginPath();
      ctx.moveTo(x, topRect.top + 16);
      ctx.lineTo(x, topRect.bottom - 16);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i += 1) {
      const y = topRect.top + 16 + (i / 4) * (topRect.height - 32);
      ctx.beginPath();
      ctx.moveTo(topRect.left + 14, y);
      ctx.lineTo(topRect.right - 14, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(topRect.left + 14, yToCanvas(0, topRect, -maxAbs, maxAbs));
    ctx.lineTo(topRect.right - 14, yToCanvas(0, topRect, -maxAbs, maxAbs));
    ctx.stroke();

    ctx.beginPath();
    xs.forEach((x, i) => {
      const scaled = (x - state.center) / Math.max(state.epsilon, 0.05);
      const kernelPreview = 1.12 * Math.exp(-Math.pow(scaled, 2));
      const px = xToCanvas(x, topRect);
      const py = yToCanvas(kernelPreview, topRect, -maxAbs, maxAbs);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "rgba(121, 216, 255, 0.95)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    if (state.reveal) {
      ctx.beginPath();
      profile.forEach((value, i) => {
        const x = xToCanvas(xs[i], topRect);
        const y = yToCanvas(value, topRect, -maxAbs, maxAbs);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#79d8ff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (const scan of state.scans) {
      const x = xToCanvas(scan.center, bottomRect);
      const alpha = Math.min(0.95, 0.24 + scan.response * 1.2);
      ctx.fillStyle = `rgba(236, 187, 134, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, bottomRect.top + 30, 8 + scan.response * 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#edf5fb";
    ctx.font = "700 17px Georgia";
    ctx.fillText("Hidden line-charge profile", topRect.left + 18, topRect.top + 28);
    ctx.font = "16px Georgia";
    ctx.fillStyle = "#a8bbcf";
    ctx.fillText(state.reveal ? "Source revealed. Scan again or load a new level." : "Source hidden. Use the detector response to infer where the charges are.", topRect.left + 18, topRect.top + 52);
    ctx.fillText("Blue curve = detector kernel. Gold detector brightens when the overlap gets stronger.", topRect.left + 18, topRect.top + 74);

    const detectorX = xToCanvas(state.center, topRect);
    const detectorRadius = 14 + (1.2 - state.epsilon) * 18;
    const glow = Math.min(0.95, 0.14 + response * 0.9);
    ctx.fillStyle = `rgba(255, 190, 90, ${glow})`;
    ctx.beginPath();
    ctx.arc(detectorX, topRect.top + 88, detectorRadius + response * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8d6a1";
    ctx.beginPath();
    ctx.arc(detectorX, topRect.top + 88, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "700 15px Georgia";
    ctx.fillText(`a = ${state.center.toFixed(2)}`, detectorX - 22, topRect.top + 126);

    ctx.strokeStyle = "rgba(248, 214, 161, 0.42)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(detectorX, topRect.top + 108);
    ctx.lineTo(detectorX, topRect.bottom - 18);
    ctx.stroke();
    ctx.setLineDash([]);

    const kernelHalfWidth = state.epsilon * 80;
    ctx.fillStyle = "rgba(121, 216, 255, 0.16)";
    drawRoundedRect(detectorX - kernelHalfWidth, topRect.bottom - 52, kernelHalfWidth * 2, 28, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 196, 120, 0.96)";
    drawRoundedRect(topRect.right - 168, topRect.top + 18, 136, 42, 14);
    ctx.fill();
    ctx.fillStyle = "#13212d";
    ctx.font = "700 14px Georgia";
    ctx.fillText("response", topRect.right - 152, topRect.top + 36);
    ctx.font = "700 18px Georgia";
    ctx.fillText(response.toFixed(3), topRect.right - 90, topRect.top + 36);

    ctx.fillStyle = "#edf5fb";
    ctx.font = "700 16px Georgia";
    ctx.fillText("Detector response trail", bottomRect.left + 18, bottomRect.top + 28);
    ctx.font = "15px Georgia";
    ctx.fillStyle = "#a8bbcf";
    ctx.fillText("Each glow marks where you scanned. Brighter means a stronger overlap.", bottomRect.left + 18, bottomRect.top + 50);

    const meterX = bottomRect.left + 18;
    const meterY = bottomRect.bottom - 34;
    const meterW = bottomRect.width - 36;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    drawRoundedRect(meterX, meterY, meterW, 14, 8);
    ctx.fill();
    ctx.fillStyle = "#f5c48e";
    drawRoundedRect(meterX, meterY, meterW * Math.min(1, response / 0.8), 14, 8);
    ctx.fill();

    ctx.fillStyle = "#edf5fb";
    ctx.font = "15px Georgia";
    ctx.fillText("Response meter", meterX, meterY - 10);
    drawHeatStrip();
  }

  function drawHeatStrip() {
    const width = heatStrip.width;
    const height = heatStrip.height;
    heatCtx.clearRect(0, 0, width, height);
    heatCtx.fillStyle = "#0d1822";
    heatCtx.fillRect(0, 0, width, height);

    const epsilon = state.epsilon;
    const responses = xs.map((x) => responseFor(x, epsilon));
    const maxR = Math.max(...responses, 0.001);

    for (let i = 0; i < width; i += 1) {
      const t = i / (width - 1);
      const x = domainMin + t * (domainMax - domainMin);
      const idx = Math.floor(t * (responses.length - 1));
      const r = responses[idx] / maxR;
      const red = Math.round(34 + r * 220);
      const green = Math.round(62 + r * 135);
      const blue = Math.round(88 - r * 45);
      heatCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      heatCtx.fillRect(i, 18, 1, 26);
      if (state.reveal) {
        const density = chargeDensity(x, activeCharges());
        if (Math.abs(density) > 0.55) {
          heatCtx.fillStyle = density > 0 ? "rgba(121,216,255,0.9)" : "rgba(255,120,120,0.85)";
          heatCtx.fillRect(i, 48, 1, 10);
        }
      }
    }

    const markerX = ((state.center - domainMin) / (domainMax - domainMin)) * width;
    heatCtx.strokeStyle = "rgba(255,255,255,0.92)";
    heatCtx.lineWidth = 2;
    heatCtx.beginPath();
    heatCtx.moveTo(markerX, 10);
    heatCtx.lineTo(markerX, 60);
    heatCtx.stroke();

    heatCtx.fillStyle = "#edf5fb";
    heatCtx.font = "12px Georgia";
    heatCtx.fillText("response", 10, 12);
    if (state.reveal) {
      heatCtx.fillStyle = "#a8bbcf";
      heatCtx.fillText("source markers revealed", 180, 12);
    }
  }

  function setCenterFromSlider() {
    state.center = parseFloat(centerSlider.value);
    addScan();
    refreshReadout();
    draw();
  }

  function setEpsilonFromSlider() {
    state.epsilon = parseFloat(epsilonSlider.value);
    addScan();
    refreshReadout();
    draw();
  }

  function setCenterFromCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 42, canvas.width - 42);
    const t = (x - 42) / (canvas.width - 84);
    state.center = domainMin + t * (domainMax - domainMin);
    centerSlider.value = state.center.toFixed(2);
    addScan();
    refreshReadout();
    draw();
  }

  function newLevel() {
    state.levelIndex += 1;
    if (state.levelIndex >= levels.length) {
      levels.push(randomLevel());
    }
    state.reveal = false;
    state.best = 0;
    state.scans = [];
    state.center = 0;
    state.epsilon = 0.28;
    centerSlider.value = "0";
    epsilonSlider.value = "0.28";
    refreshReadout();
    draw();
  }

  centerSlider.addEventListener("input", setCenterFromSlider);
  epsilonSlider.addEventListener("input", setEpsilonFromSlider);
  newLevelBtn.addEventListener("click", newLevel);
  revealBtn.addEventListener("click", () => {
    state.reveal = !state.reveal;
    revealBtn.textContent = state.reveal ? "Hide Source" : "Reveal Source";
    refreshReadout();
    draw();
  });
  resetTrailBtn.addEventListener("click", () => {
    state.scans = [];
    state.best = 0;
    refreshReadout();
    draw();
  });

  canvas.addEventListener("mousedown", (event) => {
    state.draggingCanvas = true;
    setCenterFromCanvas(event);
  });
  window.addEventListener("mouseup", () => {
    state.draggingCanvas = false;
  });
  canvas.addEventListener("mousemove", (event) => {
    if (state.draggingCanvas) {
      setCenterFromCanvas(event);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      state.center = clamp(state.center - 0.08, domainMin, domainMax);
      centerSlider.value = state.center.toFixed(2);
      addScan();
    } else if (event.key === "ArrowRight") {
      state.center = clamp(state.center + 0.08, domainMin, domainMax);
      centerSlider.value = state.center.toFixed(2);
      addScan();
    } else if (event.key === "ArrowUp") {
      state.epsilon = clamp(state.epsilon * 0.92, 0.05, 1.2);
      epsilonSlider.value = state.epsilon.toFixed(2);
      addScan();
    } else if (event.key === "ArrowDown") {
      state.epsilon = clamp(state.epsilon * 1.08, 0.05, 1.2);
      epsilonSlider.value = state.epsilon.toFixed(2);
      addScan();
    } else if (event.key.toLowerCase() === "r") {
      state.reveal = !state.reveal;
      revealBtn.textContent = state.reveal ? "Hide Source" : "Reveal Source";
    } else if (event.key.toLowerCase() === "n") {
      newLevel();
    }
    refreshReadout();
    draw();
  });

  addScan();
  refreshReadout();
  draw();
})();
