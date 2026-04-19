(function () {
  var synth = window.speechSynthesis;
  var storageKey = "maxwellLectureState.v1";
  var lessonListNode = document.getElementById("lessonList");
  var outlineListNode = document.getElementById("outlineList");
  var resourceListNode = document.getElementById("resourceList");
  var voiceSelect = document.getElementById("voiceSelect");
  var rateRange = document.getElementById("rateRange");
  var rateValue = document.getElementById("rateValue");
  var autoAdvance = document.getElementById("autoAdvance");
  var slideEyebrow = document.getElementById("slideEyebrow");
  var lessonStatus = document.getElementById("lessonStatus");
  var slideCounter = document.getElementById("slideCounter");
  var slideTitle = document.getElementById("slideTitle");
  var slideSummary = document.getElementById("slideSummary");
  var slideMedia = document.getElementById("slideMedia");
  var slideBullets = document.getElementById("slideBullets");
  var slidePrompt = document.getElementById("slidePrompt");
  var slideGuide = document.getElementById("slideGuide");
  var slideNarration = document.getElementById("slideNarration");
  var progressBar = document.getElementById("progressBar");
  var playerStatus = document.getElementById("playerStatus");
  var lessonMeta = document.getElementById("lessonMeta");
  var revealGuideButton = document.getElementById("revealGuideButton");
  var startLessonButton = document.getElementById("startLessonButton");
  var speakSlideButton = document.getElementById("speakSlideButton");
  var pauseButton = document.getElementById("pauseButton");
  var replayButton = document.getElementById("replayButton");
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");

  var lessons = [
    {
      id: "method-of-images",
      title: "Method of Images: grounded sphere",
      subtitle: "Boundary conditions by construction",
      eyebrow: "Electrostatics lecture",
      resources: [
        { label: "Visuals page", href: "./visuals.html", meta: "Project visuals and animations" },
        { label: "Topics page", href: "./topics.html", meta: "Grouped study materials" },
        { label: "Chapter 2 notes", href: "https://raw.githubusercontent.com/dajuarez4/Computational-Electrodynamics/main/notes-diego/chapter-2/chapter_2_notes.pdf", meta: "Method of images notes" }
      ],
      slides: [
        {
          eyebrow: "Grounded Sphere",
          title: "Read the problem as a boundary-value problem",
          summary: "A point charge near a conductor is not mainly a force problem. First it is a potential problem with a strict boundary condition on the conducting surface.",
          mediaHtml: '<img src="./assets/method_of_images_grounded_sphere.gif" alt="Grounded sphere method of images animation"><p class="lecture-media__caption">The real charge moves, but the grounded sphere must stay at zero potential on its surface for every frame.</p>',
          bullets: [
            "The conductor is grounded, so the potential on the sphere must be exactly zero.",
            "The electric field is secondary until the potential is constructed correctly.",
            "Symmetry helps, but the boundary condition is what decides the method."
          ],
          prompt: "Before you calculate anything, what condition must hold on every point of the conductor surface?",
          guide: "For a grounded conductor, the surface potential must be zero everywhere. That is the target condition the construction has to satisfy.",
          narration: "Start by shifting your mindset. The grounded sphere problem is not asking for a clever force formula first. It is asking for a potential that obeys a boundary condition everywhere on the metal surface. The moment you say grounded conductor, you should hear one sentence in your head: the potential on that surface must be zero."
        },
        {
          eyebrow: "Grounded Sphere",
          title: "Replace the conductor with an image source",
          summary: "The image charge is not physical. It is a mathematical source placed so the superposed potential vanishes on the spherical boundary.",
          mediaHtml: '<div class="equation-panel"><span class="equation-panel__math">q′ = − q(a/R), &nbsp;&nbsp; b = a²/R</span><p class="equation-panel__caption">For a charge outside a grounded sphere of radius <em>a</em>, the image charge lies on the symmetry axis inside the sphere.</p></div>',
          bullets: [
            "Keep the real charge where it physically sits.",
            "Place the image charge on the same symmetry axis inside the sphere.",
            "Choose its location and magnitude so the surface potential cancels point by point."
          ],
          prompt: "Why does the image charge have to lie on the symmetry axis rather than at some arbitrary interior point?",
          guide: "Because the geometry is axially symmetric. If the image were placed off-axis, the constructed potential would break the same symmetry as the original physical setup.",
          narration: "Now Maxwell makes the key move. Instead of solving directly with the conductor present, replace the conductor by an image charge placed inside the sphere. That image charge is not real matter and not measurable by itself. Its job is purely mathematical: when you add its potential to the real charge potential, the sum must vanish on the spherical boundary."
        },
        {
          eyebrow: "Grounded Sphere",
          title: "Uniqueness is what makes the trick legal",
          summary: "The image construction works because the resulting potential already satisfies both the governing equation in the physical region and the correct boundary values.",
          mediaHtml: '<div class="equation-panel"><span class="equation-panel__math">∇²V = −ρ/ε₀ &nbsp; in the physical region, &nbsp;&nbsp; V = 0 &nbsp; on the sphere</span><p class="equation-panel__caption">Once those conditions are satisfied, the uniqueness theorem removes ambiguity.</p></div>',
          bullets: [
            "The image charge is outside the physical region where the conductor lived.",
            "Inside the physical region, the constructed potential solves the right differential equation.",
            "Matching the boundary condition plus the field equation is enough to guarantee the answer."
          ],
          prompt: "What theorem tells you the image construction is not just a lucky guess?",
          guide: "The electrostatic uniqueness theorem. If two solutions satisfy the same Poisson or Laplace equation in the region and the same boundary conditions, they must be the same solution.",
          narration: "Students often treat the method of images like a magician's trick. The real reason it works is much stricter. In the physical region outside the sphere, your constructed potential satisfies the correct electrostatic equation. On the boundary, it satisfies the correct grounded condition. The uniqueness theorem then says there is only one such solution, so the image construction must be the physical answer in that region."
        },
        {
          eyebrow: "Grounded Sphere",
          title: "Differentiate the potential to get induced charge",
          summary: "Once the potential is correct, the field and induced surface charge follow systematically from normal derivatives at the conductor.",
          mediaHtml: '<div class="equation-panel"><span class="equation-panel__math">σ(θ) = −ε₀ (∂V/∂r) at r = a</span><p class="equation-panel__caption">The conductor responds by building exactly the surface charge needed to enforce the boundary.</p></div>',
          bullets: [
            "Potential first, then normal field, then surface charge density.",
            "The sign of the induced charge is encoded in the radial derivative.",
            "This is where the method turns geometry into measurable electrostatics."
          ],
          prompt: "What quantity do you differentiate, and in which direction, to obtain the induced surface charge on the sphere?",
          guide: "Differentiate the potential in the outward normal direction. For a sphere that means the radial derivative evaluated at the surface.",
          narration: "Once the potential is known, the rest is disciplined follow-through. Differentiate in the normal direction to get the field just outside the conductor, and from that extract the induced surface charge density. This is a pattern students should remember: the difficult step is the potential. After that, the field and induced charge are consequences."
        },
        {
          eyebrow: "Grounded Sphere",
          title: "What you should remember for homework",
          summary: "For method-of-images problems, students should think in a sequence: boundary, symmetry, image configuration, uniqueness, and only then derived quantities like force or energy.",
          mediaHtml: '<img src="./assets/method_of_images_grounded_sphere_preview.png" alt="Method of images grounded sphere preview"><p class="lecture-media__caption">A compact mental checklist: boundary first, image construction second, interpretation third.</p>',
          bullets: [
            "Start with the boundary condition, not the requested final quantity.",
            "Use symmetry to constrain where the image can live.",
            "Invoke uniqueness to justify the result in the physical region."
          ],
          prompt: "If a homework problem asks for the force first, what should your first real move still be?",
          guide: "Construct the potential that satisfies the conductor boundary condition. The force should be computed only after the potential structure is correct.",
          narration: "End the lesson with a memory rule. When a homework statement asks for force, energy, or induced charge, do not let the final quantity control your opening move. In method-of-images problems the opening move is almost always the same: identify the boundary, exploit symmetry, place the image, justify it with uniqueness, and only then compute whatever the problem finally asks for."
        }
      ]
    },
    {
      id: "poisson-laplace",
      title: "From Poisson to Laplace",
      subtitle: "How to read the potential equation correctly",
      eyebrow: "Electrostatics lecture",
      resources: [
        { label: "Poisson equation notes", href: "https://github.com/dajuarez4/Computational-Electrodynamics/blob/main/notes/Poisson_equation_notes.pdf", meta: "Project notes PDF" },
        { label: "Notes page", href: "./notes.html", meta: "Chapter and topic notes" },
        { label: "Topics page", href: "./topics.html", meta: "Problem sets, notebooks, and references" }
      ],
      slides: [
        {
          eyebrow: "Poisson and Laplace",
          title: "Poisson's equation ties charge to curvature",
          summary: "The electrostatic potential is not arbitrary. Its local curvature is determined by the local charge density.",
          mediaHtml: '<div class="equation-panel"><span class="equation-panel__math">∇²V = −ρ/ε₀</span><p class="equation-panel__caption">This is the core field equation of electrostatics in potential form.</p></div>',
          bullets: [
            "Charge density is the source term.",
            "Potential curvature is the response.",
            "You should read the equation locally: what happens in a tiny neighborhood determines the larger field structure."
          ],
          prompt: "If the charge density is positive in a region, what does Poisson's equation say about the sign of the Laplacian there?",
          guide: "It says the Laplacian of the potential is negative there, since ∇²V = −ρ/ε₀.",
          narration: "Poisson's equation is the cleanest statement that electrostatics is local. The charge density at a point controls the curvature of the potential at that point. Instead of memorizing the symbol string, train yourself to read it in words: source on one side, geometric response on the other."
        },
        {
          eyebrow: "Poisson and Laplace",
          title: "Laplace's equation is the source-free limit",
          summary: "Where there is no charge in the region being solved, Poisson simplifies to Laplace, and the solutions become harmonic functions.",
          mediaHtml: '<div class="equation-panel"><span class="equation-panel__math">ρ = 0 &nbsp; ⇒ &nbsp; ∇²V = 0</span><p class="equation-panel__caption">Source-free regions are governed by Laplace equation behavior, even if charges exist somewhere else in the full problem.</p></div>',
          bullets: [
            "Zero charge in the region does not mean zero field.",
            "It means the potential has no local source term there.",
            "Boundary data now become the main global information."
          ],
          prompt: "Can a region satisfy Laplace's equation and still contain a nonzero electric field?",
          guide: "Yes. Laplace means there is no charge inside the region, not that the field must vanish. External charges and boundary values can still produce a nonzero field there.",
          narration: "This distinction matters in nearly every boundary-value problem. Students often see Laplace's equation and mistakenly think the electric field must disappear. That is false. The field can be very real and very strong in a source-free region. Laplace only says the region itself contains no charge density."
        },
        {
          eyebrow: "Poisson and Laplace",
          title: "Geometry tells you how to solve, not just what to solve",
          summary: "Once the equation is known, the next decision is geometric: what coordinates, boundaries, or symmetries make the problem separable or interpretable?",
          mediaHtml: '<img src="./assets/dirac_delta_v2_charge_hunt_heatmap.png" alt="Localized source heatmap"><p class="lecture-media__caption">The same equation can look very different depending on geometry, symmetry, and how the source is distributed.</p>',
          bullets: [
            "Spherical symmetry points toward spherical coordinates.",
            "Planar boundaries often suggest Cartesian setups or image constructions.",
            "The equation alone is not enough; geometry chooses the method."
          ],
          prompt: "What usually matters more after writing the equation: the symbol itself, or the geometry and boundary conditions around it?",
          guide: "The geometry and boundary conditions. They decide whether you use direct integration, separation of variables, Green's functions, or images.",
          narration: "Here is where good problem solving begins to feel less mechanical. Many students can write Poisson or Laplace, but then stall. The next question is not more algebra. It is geometry. What symmetry is present? What boundary is fixed? Which coordinate system turns the equation into something natural?"
        },
        {
          eyebrow: "Poisson and Laplace",
          title: "A homework decision tree you can actually use",
          summary: "Read the source, identify the region, classify the boundary, and only then choose the tool: integration, separation of variables, Green's functions, or images.",
          mediaHtml: '<img src="./assets/mini_electrodynamics_lab_demo.gif" alt="Mini electrodynamics lab animation"><p class="lecture-media__caption">Interactive fields are helpful, but the method still comes from a disciplined decision tree.</p>',
          bullets: [
            "Ask whether the region contains source or is source-free.",
            "Ask what boundary data are prescribed.",
            "Then choose the solving method instead of guessing."
          ],
          prompt: "If you know the region is source-free but bounded by conductors at fixed potential, what family of methods should come to mind first?",
          guide: "Laplace plus fixed boundary values usually suggests separation of variables or another boundary-adapted construction such as Green's functions or images, depending on the geometry.",
          narration: "Maxwell's final advice is procedural. When you face a homework problem, do not jump straight to formulas. First classify the region. Does it contain source or not? Then classify the boundary. Once those two are clear, the method becomes much easier to choose. This is the bridge from equation recognition to actual problem solving."
        }
      ]
    }
  ];

  var state = {
    lessonIndex: 0,
    slideIndex: 0,
    voices: [],
    speaking: false,
    paused: false,
    manualStop: false
  };

  function estimateMinutes(lesson) {
    var words = lesson.slides.reduce(function (total, slide) {
      return total + String(slide.narration || "").split(/\s+/).filter(Boolean).length;
    }, 0);
    return Math.max(1, Math.round(words / 145));
  }

  function currentLesson() {
    return lessons[state.lessonIndex];
  }

  function currentSlide() {
    return currentLesson().slides[state.slideIndex];
  }

  function loadSavedState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (error) {
      return {};
    }
  }

  function saveState() {
    var payload = loadSavedState();
    var lesson = currentLesson();

    payload.lastLessonId = lesson.id;
    payload.lessons = payload.lessons || {};
    payload.lessons[lesson.id] = {
      slideIndex: state.slideIndex,
      completed: state.slideIndex >= lesson.slides.length - 1
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function getLessonProgress(lesson) {
    var saved = loadSavedState();
    var progress = (saved.lessons || {})[lesson.id] || {};

    return {
      slideIndex: typeof progress.slideIndex === "number" ? progress.slideIndex : 0,
      completed: !!progress.completed
    };
  }

  function setStatus(text) {
    playerStatus.textContent = text;
  }

  function updateRateLabel() {
    rateValue.textContent = Number(rateRange.value).toFixed(2) + "x";
  }

  function setButtonState() {
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function renderLessonList() {
    lessonListNode.innerHTML = "";

    lessons.forEach(function (lesson, index) {
      var progress = getLessonProgress(lesson);
      var button = document.createElement("button");
      var badges = [
        '<span class="lesson-pill">' + lesson.slides.length + ' slides</span>',
        '<span class="lesson-pill">' + estimateMinutes(lesson) + ' min</span>'
      ];

      if (progress.completed) {
        badges.push('<span class="status-chip complete">completed</span>');
      } else if (progress.slideIndex > 0) {
        badges.push('<span class="status-chip">resume slide ' + (progress.slideIndex + 1) + '</span>');
      }

      button.type = "button";
      button.className = "lesson-button" + (index === state.lessonIndex ? " active" : "");
      button.innerHTML =
        '<span class="lesson-button__title">' + lesson.title + "</span>" +
        '<span class="lesson-button__meta">' + lesson.subtitle + "</span>" +
        '<div class="lesson-badge-row">' + badges.join("") + "</div>";
      button.addEventListener("click", function () {
        selectLesson(index, true);
      });
      lessonListNode.appendChild(button);
    });
  }

  function renderOutline() {
    var lesson = currentLesson();

    outlineListNode.innerHTML = "";
    lesson.slides.forEach(function (slide, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "outline-button" + (index === state.slideIndex ? " active" : "");
      button.innerHTML =
        '<span class="outline-button__title">' + (index + 1) + ". " + slide.title + "</span>" +
        '<span class="outline-button__meta">' + slide.eyebrow + "</span>";
      button.addEventListener("click", function () {
        goToSlide(index, false);
      });
      outlineListNode.appendChild(button);
    });
  }

  function renderResources() {
    var lesson = currentLesson();

    resourceListNode.innerHTML = "";
    lesson.resources.forEach(function (resource) {
      var link = document.createElement("a");
      link.className = "resource-link";
      link.href = resource.href;
      link.innerHTML =
        '<span class="lesson-button__title">' + resource.label + "</span>" +
        '<span class="resource-link__meta">' + resource.meta + "</span>";
      resourceListNode.appendChild(link);
    });
  }

  function renderSlide() {
    var lesson = currentLesson();
    var slide = currentSlide();

    slideEyebrow.textContent = lesson.eyebrow + " | " + slide.eyebrow;
    slideCounter.textContent = "Slide " + (state.slideIndex + 1) + " / " + lesson.slides.length;
    slideTitle.textContent = slide.title;
    slideSummary.textContent = slide.summary;
    slideMedia.innerHTML = slide.mediaHtml;
    slidePrompt.textContent = slide.prompt;
    slideGuide.classList.remove("visible");
    slideGuide.innerHTML = slide.guide;
    slideNarration.textContent = slide.narration;
    lessonStatus.textContent = "Teaching " + lesson.title;
    lessonMeta.textContent = lesson.slides.length + " slides | about " + estimateMinutes(lesson) + " minutes";
    progressBar.style.width = ((state.slideIndex + 1) / lesson.slides.length * 100).toFixed(1) + "%";

    slideBullets.innerHTML = "";
    slide.bullets.forEach(function (bullet) {
      var item = document.createElement("li");
      item.textContent = bullet;
      slideBullets.appendChild(item);
    });

    renderLessonList();
    renderOutline();
    renderResources();
    saveState();
  }

  function populateVoices() {
    if (!synth || !voiceSelect) return;

    var voices = synth.getVoices();

    if (!voices.length) return;
    state.voices = voices;
    voiceSelect.innerHTML = "";

    voices.forEach(function (voice, index) {
      var option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = voice.name + " (" + voice.lang + ")";
      if (!voiceSelect.value && /en/i.test(voice.lang) && /female|samantha|victoria|karen|zira|ava|allison|moira/i.test(voice.name)) {
        option.selected = true;
      }
      if (!voiceSelect.value && index === 0) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
  }

  function selectedVoice() {
    var voiceId = voiceSelect.value;
    return state.voices.find(function (voice) {
      return voice.voiceURI === voiceId;
    }) || null;
  }

  function cancelSpeech() {
    if (!synth) return;
    state.manualStop = true;
    state.speaking = false;
    state.paused = false;
    synth.cancel();
    setButtonState();
  }

  function speakSlide() {
    var lesson = currentLesson();
    var slide = currentSlide();
    var utterance;

    if (!synth) {
      setStatus("Speech synthesis is not available in this browser. The lesson still works as a visual slide deck.");
      return;
    }

    cancelSpeech();
    state.manualStop = false;
    utterance = new SpeechSynthesisUtterance(slide.narration);
    utterance.rate = Number(rateRange.value);
    utterance.pitch = 1;
    utterance.voice = selectedVoice();

    utterance.onstart = function () {
      state.speaking = true;
      state.paused = false;
      setButtonState();
      setStatus("Narrating " + lesson.title + ", slide " + (state.slideIndex + 1) + ".");
    };

    utterance.onend = function () {
      state.speaking = false;
      state.paused = false;
      setButtonState();

      if (!state.manualStop && autoAdvance.checked && state.slideIndex < lesson.slides.length - 1) {
        state.slideIndex += 1;
        renderSlide();
        window.setTimeout(function () {
          speakSlide();
        }, 280);
        return;
      }

      if (!state.manualStop && state.slideIndex >= lesson.slides.length - 1) {
        var saved = loadSavedState();
        saved.lessons = saved.lessons || {};
        saved.lessons[lesson.id] = {
          slideIndex: state.slideIndex,
          completed: true
        };
        saved.lastLessonId = lesson.id;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        renderLessonList();
        setStatus("Lesson complete. You can replay the slide, switch lessons, or review the outline.");
        return;
      }

      setStatus("Narration stopped on slide " + (state.slideIndex + 1) + ".");
    };

    utterance.onerror = function () {
      state.speaking = false;
      state.paused = false;
      setButtonState();
      setStatus("The browser voice engine could not play this slide. Try a different voice.");
    };

    synth.speak(utterance);
  }

  function goToSlide(index, speak) {
    var lesson = currentLesson();
    var nextIndex = Math.max(0, Math.min(index, lesson.slides.length - 1));

    cancelSpeech();
    state.slideIndex = nextIndex;
    renderSlide();
    if (speak) speakSlide();
  }

  function selectLesson(index, restoreProgress) {
    var lesson = lessons[index];
    var progress = getLessonProgress(lesson);

    cancelSpeech();
    state.lessonIndex = index;
    state.slideIndex = restoreProgress ? progress.slideIndex : 0;
    renderSlide();
    setStatus("Loaded " + lesson.title + ". Press Start or resume to hear Maxwell narrate the deck.");
  }

  function startCurrentLesson() {
    speakSlide();
  }

  function togglePause() {
    if (!synth) return;

    if (synth.speaking && !synth.paused) {
      synth.pause();
      state.paused = true;
      setStatus("Narration paused.");
      setButtonState();
      return;
    }

    if (synth.paused) {
      synth.resume();
      state.paused = false;
      setStatus("Narration resumed.");
      setButtonState();
      return;
    }

    speakSlide();
  }

  function revealGuide() {
    slideGuide.classList.toggle("visible");
    revealGuideButton.textContent = slideGuide.classList.contains("visible") ? "Hide guide" : "Reveal guide";
  }

  function boot() {
    var saved = loadSavedState();
    var lastLessonIndex = lessons.findIndex(function (lesson) {
      return lesson.id === saved.lastLessonId;
    });

    updateRateLabel();
    populateVoices();

    if (typeof synth !== "undefined" && synth && typeof synth.onvoiceschanged !== "undefined") {
      synth.onvoiceschanged = populateVoices;
    }

    if (lastLessonIndex >= 0) {
      state.lessonIndex = lastLessonIndex;
      state.slideIndex = getLessonProgress(lessons[lastLessonIndex]).slideIndex;
    }

    renderSlide();
    setStatus("Ready. Pick a lesson and press Start or resume.");
  }

  if (rateRange) {
    rateRange.addEventListener("input", updateRateLabel);
  }

  if (revealGuideButton) {
    revealGuideButton.addEventListener("click", revealGuide);
  }

  if (startLessonButton) {
    startLessonButton.addEventListener("click", startCurrentLesson);
  }

  if (speakSlideButton) {
    speakSlideButton.addEventListener("click", function () {
      speakSlide();
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", togglePause);
  }

  if (replayButton) {
    replayButton.addEventListener("click", function () {
      speakSlide();
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      goToSlide(state.slideIndex - 1, false);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      goToSlide(state.slideIndex + 1, false);
    });
  }

  window.addEventListener("beforeunload", function () {
    cancelSpeech();
  });

  boot();
})();
