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
  var pdfDeckTitle = document.getElementById("pdfDeckTitle");
  var pdfDeckMeta = document.getElementById("pdfDeckMeta");
  var pdfToggleButton = document.getElementById("pdfToggleButton");
  var pdfOpenLink = document.getElementById("pdfOpenLink");
  var pdfPrevPageButton = document.getElementById("pdfPrevPageButton");
  var pdfPageInput = document.getElementById("pdfPageInput");
  var pdfGoPageButton = document.getElementById("pdfGoPageButton");
  var pdfNextPageButton = document.getElementById("pdfNextPageButton");
  var pdfFollowSlideButton = document.getElementById("pdfFollowSlideButton");
  var pdfPageStatus = document.getElementById("pdfPageStatus");
  var pdfFrameWrap = document.getElementById("pdfFrameWrap");
  var pdfFrame = document.getElementById("pdfFrame");
  var pdfPlaceholder = document.getElementById("pdfPlaceholder");
  var sourceExplainMeta = document.getElementById("sourceExplainMeta");
  var sourceExplainStatus = document.getElementById("sourceExplainStatus");
  var sourceExplainOutput = document.getElementById("sourceExplainOutput");
  var sourceExplainButton = document.getElementById("sourceExplainButton");
  var sourceRawWrap = document.getElementById("sourceRawWrap");
  var sourceRawText = document.getElementById("sourceRawText");
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
      sourceDeck: {
        href: "./slide-decks/laplace-unique-images.pdf",
        qaPath: "slides/Laplaces eq, Uniqe and Images.pdf",
        title: "Laplace, uniqueness, and images",
        meta: "Original slide deck used as a companion while Maxwell narrates."
      },
      resources: [
        { label: "Visuals page", href: "./visuals.html", meta: "Project visuals and animations" },
        { label: "Topics page", href: "./topics.html", meta: "Grouped study materials" },
        { label: "Chapter 2 notes", href: "https://raw.githubusercontent.com/dajuarez4/Computational-Electrodynamics/main/notes-diego/chapter-2/chapter_2_notes.pdf", meta: "Method of images notes" }
      ],
      slides: [
        {
          eyebrow: "Grounded Sphere",
          title: "Read the problem as a boundary-value problem",
          sourcePages: [9, 14],
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
          sourcePages: [14],
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
          sourcePages: [7, 8],
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
          sourcePages: [12, 14],
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
          sourcePages: [15],
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
      sourceDeck: {
        href: "./slide-decks/laplace-unique-images.pdf",
        qaPath: "slides/Laplaces eq, Uniqe and Images.pdf",
        title: "Laplace, uniqueness, and images",
        meta: "This deck covers the Laplace-side material behind the current lesson."
      },
      resources: [
        { label: "Poisson equation notes", href: "https://github.com/dajuarez4/Computational-Electrodynamics/blob/main/notes/Poisson_equation_notes.pdf", meta: "Project notes PDF" },
        { label: "Notes page", href: "./notes.html", meta: "Chapter and topic notes" },
        { label: "Topics page", href: "./topics.html", meta: "Problem sets, notebooks, and references" }
      ],
      slides: [
        {
          eyebrow: "Poisson and Laplace",
          title: "Poisson's equation ties charge to curvature",
          sourcePages: [3],
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
          sourcePages: [3, 5, 6],
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
          sourcePages: [4, 9],
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
          sourcePages: [9, 15],
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
    manualStop: false,
    pdfVisible: true,
    pdfPageOverride: null,
    qaChunkMap: null,
    qaIndexPromise: null,
    qaPageCountMap: null
  };

  var SOURCE_STOPWORDS = {
    a: true,
    about: true,
    after: true,
    again: true,
    all: true,
    also: true,
    and: true,
    any: true,
    are: true,
    around: true,
    because: true,
    been: true,
    before: true,
    being: true,
    between: true,
    both: true,
    but: true,
    can: true,
    conductor: false,
    current: false,
    each: true,
    equation: false,
    field: false,
    first: true,
    for: true,
    from: true,
    have: true,
    image: false,
    into: true,
    just: true,
    lesson: true,
    more: true,
    near: true,
    only: true,
    page: true,
    point: false,
    potential: false,
    problem: false,
    slide: true,
    source: true,
    sphere: false,
    that: true,
    the: true,
    their: true,
    there: true,
    these: true,
    they: true,
    this: true,
    through: true,
    what: true,
    when: true,
    where: true,
    with: true,
    your: true
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

  function slideMappedPages() {
    return uniqueNumbers(currentSlide().sourcePages);
  }

  function activeSourcePages() {
    if (typeof state.pdfPageOverride === "number" && state.pdfPageOverride > 0) {
      return [state.pdfPageOverride];
    }

    return slideMappedPages();
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
    payload.pdfVisible = state.pdfVisible;
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uniqueNumbers(list) {
    var seen = {};
    return (list || []).filter(function (value) {
      var num = Number(value);
      if (!num || seen[num]) return false;
      seen[num] = true;
      return true;
    }).sort(function (a, b) {
      return a - b;
    });
  }

  function formatPageRange(pages) {
    var sorted = uniqueNumbers(pages);
    var ranges = [];
    var start;
    var end;

    if (!sorted.length) return "unmapped";

    start = sorted[0];
    end = sorted[0];

    sorted.slice(1).forEach(function (page) {
      if (page === end + 1) {
        end = page;
        return;
      }

      ranges.push(start === end ? String(start) : start + "-" + end);
      start = page;
      end = page;
    });

    ranges.push(start === end ? String(start) : start + "-" + end);
    return ranges.join(", ");
  }

  function pageWord(pages) {
    return uniqueNumbers(pages).length > 1 ? "pages" : "page";
  }

  function getDeckPageCount(deck) {
    if (!deck || !deck.qaPath || !state.qaPageCountMap) return null;
    return state.qaPageCountMap[deck.qaPath] || null;
  }

  function clampPageNumber(page, deck) {
    var count = getDeckPageCount(deck);
    var parsed = Number(page);

    if (!parsed || parsed < 1) {
      parsed = 1;
    }

    parsed = Math.floor(parsed);

    if (count) {
      parsed = Math.min(parsed, count);
    }

    return parsed;
  }

  function cleanSourceText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
  }

  function keywordList(slide, lesson) {
    var words = ((lesson.title || "") + " " + (slide.title || "") + " " + (slide.summary || "") + " " + (slide.eyebrow || ""))
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function (word) {
        return word && word.length > 3 && !SOURCE_STOPWORDS[word];
      });
    var seen = {};

    return words.filter(function (word) {
      if (seen[word]) return false;
      seen[word] = true;
      return true;
    });
  }

  function bestSourceSnippet(text, keywords) {
    var clean = cleanSourceText(text);
    var lower = clean.toLowerCase();
    var start = 0;
    var end;
    var bestIndex = -1;

    if (!clean) return "No extracted text was found for this source page.";

    keywords.some(function (keyword) {
      var index = lower.indexOf(keyword.toLowerCase());
      if (index >= 0) {
        bestIndex = index;
        return true;
      }
      return false;
    });

    if (bestIndex > 0) {
      start = Math.max(0, bestIndex - 70);
      while (start < clean.length && start > 0 && clean.charAt(start) !== " ") {
        start += 1;
      }
    }

    end = Math.min(clean.length, start + 260);
    if (end < clean.length) {
      while (end > start + 180 && clean.charAt(end) !== " ") {
        end -= 1;
      }
    }

    return (start > 0 ? "... " : "") + clean.slice(start, end).trim() + (end < clean.length ? " ..." : "");
  }

  function sourceChunksForPages(lesson, pages) {
    var deck = lesson.sourceDeck || {};

    if (!deck.qaPath || !pages || !pages.length || !state.qaChunkMap) {
      return [];
    }

    return uniqueNumbers(pages).map(function (page) {
      return state.qaChunkMap[deck.qaPath + "::" + page];
    }).filter(Boolean);
  }

  function renderSourceExplanation() {
    var lesson = currentLesson();
    var slide = currentSlide();
    var deck = lesson.sourceDeck || {};
    var pages = activeSourcePages();
    var manualMode = typeof state.pdfPageOverride === "number" && state.pdfPageOverride > 0;
    var chunks;
    var keywords;
    var html;

    if (!deck.qaPath || !pages.length) {
      sourceExplainMeta.textContent = "This slide does not have a mapped source page yet.";
      sourceExplainStatus.textContent = "Add source page numbers to the lesson data to ground this slide in the extracted PDF text.";
      sourceExplainOutput.innerHTML = "<p>The current slide is still using only the lesson summary and narration.</p>";
      sourceRawText.textContent = "No source-page mapping for this slide.";
      if (sourceRawWrap) sourceRawWrap.open = false;
      return;
    }

    sourceExplainButton.textContent = manualMode ? "Explain selected page" : "Refresh explanation";
    sourceExplainMeta.textContent = manualMode
      ? "Using extracted text from selected page " + formatPageRange(pages) + " of " + deck.title + "."
      : "Using extracted text from " + pageWord(pages) + " " + formatPageRange(pages) + " of " + deck.title + ".";

    if (!state.qaChunkMap) {
      sourceExplainStatus.textContent = state.qaIndexPromise
        ? "Loading the local PDF text index for this slide."
        : "Loading the local PDF text index.";
      sourceExplainOutput.innerHTML = "<p>Waiting for the extracted PDF text so Maxwell can explain this slide from the source pages directly.</p>";
      sourceRawText.textContent = "Loading extracted source text...";

      if (!state.qaIndexPromise) {
        loadKnowledgeIndex();
      }
      return;
    }

    chunks = sourceChunksForPages(lesson, pages);
    keywords = keywordList(slide, lesson);

    if (!chunks.length) {
      sourceExplainStatus.textContent = "The local PDF index loaded, but no extracted text was found for the mapped page range.";
      sourceExplainOutput.innerHTML = "<p>Try remapping the slide to the correct PDF page or rebuilding the local knowledge index.</p>";
      sourceRawText.textContent = "No extracted PDF text found for pages " + formatPageRange(pages) + ".";
      return;
    }

    html = [
      "<p><strong>Matched source excerpts.</strong> These snippets come directly from the extracted PDF text tied to this slide.</p>",
      "<ul>"
    ];

    chunks.forEach(function (chunk) {
      html.push(
        "<li><strong>" + escapeHtml(chunk.locator || ("p. " + chunk.page_start)) + ":</strong> " +
        escapeHtml(bestSourceSnippet(chunk.text, keywords)) + "</li>"
      );
    });

    html.push("</ul>");
    if (manualMode) {
      html.push("<p><strong>Mode:</strong> Manual page mode is active, so Maxwell is explaining the page you selected in the source deck.</p>");
    }
    html.push("<p><strong>Slide focus:</strong> " + escapeHtml(slide.summary) + "</p>");

    sourceExplainOutput.innerHTML = html.join("");
    sourceExplainStatus.textContent = manualMode
      ? "Source-grounded explanation for the selected PDF page is ready."
      : "Source-grounded explanation ready.";
    sourceRawText.textContent = chunks.map(function (chunk) {
      return "[" + (chunk.locator || ("p. " + chunk.page_start)) + "]\n" + cleanSourceText(chunk.text);
    }).join("\n\n");
  }

  function loadKnowledgeIndex() {
    if (state.qaChunkMap) {
      return Promise.resolve(state.qaChunkMap);
    }

    if (state.qaIndexPromise) {
      return state.qaIndexPromise;
    }

    if (sourceExplainButton) {
      sourceExplainButton.disabled = true;
    }

    state.qaIndexPromise = fetch("./maxwell-qa-index.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        var map = {};
        var counts = {};

        (payload.chunks || []).forEach(function (chunk) {
          if (chunk.path && chunk.page_start) {
            map[chunk.path + "::" + chunk.page_start] = chunk;
            counts[chunk.path] = Math.max(counts[chunk.path] || 0, Number(chunk.page_start) || 0);
          }
        });

        state.qaChunkMap = map;
        state.qaPageCountMap = counts;
        sourceExplainStatus.textContent = "Local PDF text index ready. Source explanations are now grounded in the extracted pages.";
        return map;
      })
      .catch(function (error) {
        state.qaIndexPromise = null;
        sourceExplainStatus.textContent = "Could not load the local PDF text index for Lecture Mode (" + error.message + ").";
        sourceExplainOutput.innerHTML = "<p>Lecture Mode is still usable, but the source-text explainer is unavailable until the local index loads correctly.</p>";
        sourceRawText.textContent = "PDF extraction index failed to load.";
        return null;
      })
      .finally(function () {
        if (sourceExplainButton) {
          sourceExplainButton.disabled = false;
        }
        renderPdfPanel();
        renderSourceExplanation();
      });

    return state.qaIndexPromise;
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

  function renderPdfPanel() {
    var lesson = currentLesson();
    var deck = lesson.sourceDeck;
    var mappedPages = slideMappedPages();
    var pages = activeSourcePages();
    var manualMode = typeof state.pdfPageOverride === "number" && state.pdfPageOverride > 0;
    var firstPage = pages.length ? pages[0] : null;
    var deckPageCount = getDeckPageCount(deck);
    var targetSrc;
    var openHref;

    if (!deck) {
      pdfDeckTitle.textContent = "No source deck yet";
      pdfDeckMeta.textContent = "This lesson does not have a published slide PDF yet.";
      pdfOpenLink.href = "#";
      pdfOpenLink.setAttribute("aria-disabled", "true");
      pdfOpenLink.style.pointerEvents = "none";
      pdfToggleButton.disabled = true;
      pdfPrevPageButton.disabled = true;
      pdfGoPageButton.disabled = true;
      pdfNextPageButton.disabled = true;
      pdfFollowSlideButton.disabled = true;
      pdfPageInput.disabled = true;
      pdfPageInput.value = "1";
      pdfPageStatus.textContent = "No PDF deck is attached to this lesson.";
      pdfFrame.removeAttribute("src");
      pdfFrame.hidden = true;
      pdfPlaceholder.hidden = false;
      pdfPlaceholder.innerHTML = "<div><strong>No PDF available.</strong><p class=\"lecture-pdf-note\">Add a matching slide deck later and it will appear here automatically.</p></div>";
      return;
    }

    pdfDeckTitle.textContent = deck.title;
    pdfDeckMeta.textContent = deck.meta + (firstPage ? " Current view: " + pageWord(pages) + " " + formatPageRange(pages) + "." : "");
    openHref = deck.href + (firstPage ? "#page=" + firstPage : "");
    pdfOpenLink.href = openHref;
    pdfOpenLink.removeAttribute("aria-disabled");
    pdfOpenLink.style.pointerEvents = "";
    pdfToggleButton.disabled = false;
    pdfToggleButton.textContent = state.pdfVisible ? "Hide panel" : "Show panel";
    pdfPageInput.disabled = false;
    pdfPageInput.value = String(firstPage || 1);
    if (deckPageCount) {
      pdfPageInput.max = String(deckPageCount);
    } else {
      pdfPageInput.removeAttribute("max");
    }
    pdfPrevPageButton.disabled = !firstPage || firstPage <= 1;
    pdfGoPageButton.disabled = false;
    pdfNextPageButton.disabled = !firstPage || (deckPageCount ? firstPage >= deckPageCount : false);
    pdfFollowSlideButton.disabled = !manualMode;
    pdfPageStatus.textContent = manualMode
      ? "Manual page mode: page " + firstPage + (deckPageCount ? " of " + deckPageCount : "") + ". Use slide pages to return to the lesson mapping."
      : (mappedPages.length
        ? "Following slide-mapped " + pageWord(mappedPages) + " " + formatPageRange(mappedPages) + "."
        : "No source pages are mapped for this slide.");

    if (state.pdfVisible) {
      targetSrc = deck.href + (firstPage ? "#page=" + firstPage + "&view=FitH" : "#view=FitH");
      if (pdfFrame.getAttribute("src") !== targetSrc) {
        pdfFrame.setAttribute("src", targetSrc);
      }
      pdfFrame.hidden = false;
      pdfPlaceholder.hidden = true;
    } else {
      pdfFrame.hidden = true;
      pdfPlaceholder.hidden = false;
      pdfPlaceholder.innerHTML = "<div><strong>Embedded panel hidden.</strong><p class=\"lecture-pdf-note\">Use the toggle above to show the source deck again, or open the PDF in a new tab.</p></div>";
    }
  }

  function setManualPdfPage(page) {
    var deck = currentLesson().sourceDeck;

    if (!deck) return;

    state.pdfPageOverride = clampPageNumber(page, deck);
    renderPdfPanel();
    renderSourceExplanation();
    setStatus("Showing source deck page " + state.pdfPageOverride + ".");
  }

  function clearManualPdfPage(silent) {
    if (state.pdfPageOverride === null) return;

    state.pdfPageOverride = null;
    renderPdfPanel();
    renderSourceExplanation();

    if (!silent) {
      setStatus("Returned to the slide-mapped source pages.");
    }
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
    renderPdfPanel();
    renderSourceExplanation();
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
    state.pdfPageOverride = null;
    state.slideIndex = nextIndex;
    renderSlide();
    if (speak) speakSlide();
  }

  function selectLesson(index, restoreProgress) {
    var lesson = lessons[index];
    var progress = getLessonProgress(lesson);

    cancelSpeech();
    state.lessonIndex = index;
    state.pdfPageOverride = null;
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

  function togglePdfPanel() {
    state.pdfVisible = !state.pdfVisible;
    renderPdfPanel();
    saveState();
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

    if (typeof saved.pdfVisible === "boolean") {
      state.pdfVisible = saved.pdfVisible;
    }

    renderSlide();
    setStatus("Ready. Pick a lesson and press Start or resume.");
    loadKnowledgeIndex();
  }

  if (rateRange) {
    rateRange.addEventListener("input", updateRateLabel);
  }

  if (revealGuideButton) {
    revealGuideButton.addEventListener("click", revealGuide);
  }

  if (pdfToggleButton) {
    pdfToggleButton.addEventListener("click", togglePdfPanel);
  }

  if (pdfPrevPageButton) {
    pdfPrevPageButton.addEventListener("click", function () {
      setManualPdfPage((activeSourcePages()[0] || 1) - 1);
    });
  }

  if (pdfGoPageButton) {
    pdfGoPageButton.addEventListener("click", function () {
      setManualPdfPage(pdfPageInput.value);
    });
  }

  if (pdfPageInput) {
    pdfPageInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        setManualPdfPage(pdfPageInput.value);
      }
    });
  }

  if (pdfNextPageButton) {
    pdfNextPageButton.addEventListener("click", function () {
      setManualPdfPage((activeSourcePages()[0] || 1) + 1);
    });
  }

  if (pdfFollowSlideButton) {
    pdfFollowSlideButton.addEventListener("click", function () {
      clearManualPdfPage(false);
    });
  }

  if (sourceExplainButton) {
    sourceExplainButton.addEventListener("click", function () {
      sourceExplainStatus.textContent = "Refreshing the explanation from the extracted PDF text.";
      renderSourceExplanation();
    });
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
