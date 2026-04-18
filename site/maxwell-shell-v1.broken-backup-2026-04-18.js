(function () {
  var body = document.body;
  if (!body) return;

  var SESSION_KEY = "maxwell-v2-session";
  var MAX_RESULTS = 8;
  var MAX_RECENT = 6;
  var MAX_PINS = 6;

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var TOPICS = [
    {
      id: "electrostatics",
      label: "Electrostatics",
      aliases: ["electrostatics", "electric field", "coulomb", "charges", "charge distributions"],
      keywords: ["electrostatics", "electric field", "coulomb", "electrostatic", "charge distribution"],
      intro: "Core charge, field, and potential material."
    },
    {
      id: "vector-analysis",
      label: "Vector Analysis",
      aliases: ["vector analysis", "calculus", "theorems from calculus", "vector calculus"],
      keywords: ["vector analysis", "vector calculus", "calculus theorems", "theorems from calculus"],
      intro: "Foundational calculus tools used across the repo."
    },
    {
      id: "dirac-delta",
      label: "Dirac Delta",
      aliases: ["dirac delta", "delta function", "dirac"],
      keywords: ["dirac delta", "delta function", "charge hunt"],
      intro: "Distribution-based notes, problems, and interactive practice."
    },
    {
      id: "potentials",
      label: "Potentials",
      aliases: ["potentials", "electrostatic potential"],
      keywords: ["potential", "potentials"],
      intro: "Potential-based reasoning, Laplace, Poisson, and boundary-value structure."
    },
    {
      id: "poisson",
      label: "Poisson Equation",
      aliases: ["poisson", "poisson equation"],
      keywords: ["poisson equation", "poisson"],
      intro: "Potential problems with explicit sources."
    },
    {
      id: "laplace",
      label: "Laplace Equation",
      aliases: ["laplace", "laplace equation"],
      keywords: ["laplace equation", "laplace"],
      intro: "Boundary-value problems in source-free regions."
    },
    {
      id: "method-of-images",
      label: "Method of Images",
      aliases: ["method of images", "image charges", "images"],
      keywords: ["method of images", "image charge", "grounded sphere", "conducting sphere"],
      intro: "Image-charge intuition, grounded conductors, and boundary matching."
    },
    {
      id: "green-functions",
      label: "Green's Functions",
      aliases: ["green functions", "greens functions", "green's functions"],
      keywords: ["green functions", "greens functions", "green's functions"],
      intro: "Kernel methods for potentials and boundary-value problems."
    },
    {
      id: "multipole",
      label: "Multipole Expansion",
      aliases: ["multipole", "multipole expansion", "dipole"],
      keywords: ["multipole", "dipole", "quadrupole", "octopole"],
      intro: "Far-field approximations and angular structure."
    },
    {
      id: "dielectrics",
      label: "Dielectrics",
      aliases: ["dielectrics", "polarization", "electric fields in matter"],
      keywords: ["dielectrics", "polarization", "electric fields in matter"],
      intro: "Electric fields in matter and material response."
    },
    {
      id: "magnetostatics",
      label: "Magnetostatics",
      aliases: ["magnetostatics", "magnetic fields", "magnetic matter", "magnetization"],
      keywords: ["magnetostatics", "magnetic field", "magnetization", "magnetic material"],
      intro: "Steady currents, magnetic fields, and magnetic matter."
    },
    {
      id: "radiation",
      label: "Electromagnetic Radiation",
      aliases: ["radiation", "electromagnetic radiation", "waves"],
      keywords: ["electromagnetic radiation", "radiation", "waves"],
      intro: "Wave propagation, radiation, and time-varying fields."
    },
    {
      id: "waveguides",
      label: "Waveguides",
      aliases: ["waveguides", "waveguide", "rectangular waveguide"],
      keywords: ["waveguide", "rectangular waveguide", "guided wave"],
      intro: "Guided modes, cutoff, and dispersion."
    },
    {
      id: "visuals",
      label: "Visuals & Simulations",
      aliases: ["visuals", "animations", "simulation", "viewer", "lab", "game"],
      keywords: ["visuals", "animation", "viewer", "lab", "game", "mindmap", "plot"],
      intro: "Interactive pages, visual intuition, and project demos."
    },
    {
      id: "repo",
      label: "Repo Navigation",
      aliases: ["repo", "repository", "navigation", "website", "home"],
      keywords: ["repository", "readme", "topics page", "notes page", "website", "repo map"],
      intro: "Main entry pages and project structure."
    }
  ];

  var TOPIC_MAP = {};
  TOPICS.forEach(function (topic) {
    topic._labelNorm = normalize(topic.label);
    topic._aliasNorms = (topic.aliases || []).map(function (alias) {
      return normalize(alias);
    });
    topic._keywordNorms = (topic.keywords || []).map(function (keyword) {
      return normalize(keyword);
    });
    TOPIC_MAP[topic.id] = topic;
  });

  var state = {
    context: "docs",
    count: 0,
    entries: [],
    entryMap: {},
    open: false,
    booted: false,
    history: [],
    historyIndex: -1,
    lastResults: [],
    previewPath: "",
    recentPaths: [],
    pinnedPaths: [],
    topicCounts: {}
  };

  loadSession();

  var widget = document.createElement("div");
  widget.className = "maxwell-shell";
  widget.innerHTML = [
    '<button class="maxwell-launcher" type="button" aria-label="Open Maxwell navigator">',
    '  <span class="maxwell-launcher__label">MAXWELL</span>',
    '  <span class="maxwell-launcher__hint">Ctrl+K</span>',
    "</button>",
    '<section class="maxwell-panel" aria-hidden="true">',
    '  <div class="maxwell-panel__frame"></div>',
    '  <header class="maxwell-header">',
    '    <div class="maxwell-header__meta">',
    '      <span class="maxwell-dot"></span>',
    '      <span class="maxwell-header__title">MAXWELL TERMINAL</span>',
    '      <span class="maxwell-header__subtitle">repo navigator</span>',
    "    </div>",
    '    <button class="maxwell-close" type="button" aria-label="Close Maxwell">ESC</button>',
    "  </header>",
    '  <div class="maxwell-body">',
    '    <aside class="maxwell-sidecar">',
    '      <pre class="maxwell-ascii">  __\n /__\\\\\n(•‿•)\n /|∞|\\\\\n  | |\n /   \\\\\n\n Maxwell</pre>',
    '      <p class="maxwell-sidecar__text">Guided terminal for pages, notes, visuals, and topic paths.</p>',
    '      <div class="maxwell-shortcuts">',
    '        <button class="maxwell-chip" type="button" data-command="help">help</button>',
    '        <button class="maxwell-chip" type="button" data-command="topics">topics</button>',
    '        <button class="maxwell-chip" type="button" data-command="notes">notes</button>',
    '        <button class="maxwell-chip" type="button" data-command="visuals">visuals</button>',
    '        <button class="maxwell-chip" type="button" data-command="open lab">open lab</button>',
    "      </div>",
    "    </aside>",
    '    <div class="maxwell-console">',
      '      <div class="maxwell-log" aria-live="polite"></div>',
      '      <form class="maxwell-form">',
      '        <label class="maxwell-prompt" for="maxwellInput">maxwell@repo:~$</label>',
      '        <input id="maxwellInput" class="maxwell-input" type="text" autocomplete="off" spellcheck="false" placeholder="topics, study electrostatics, open lab, find waveguide">',
      "      </form>",
    "    </div>",
    "  </div>",
    "</section>"
  ].join("");
  body.appendChild(widget);

  var launcher = widget.querySelector(".maxwell-launcher");
  var panel = widget.querySelector(".maxwell-panel");
  var closeButton = widget.querySelector(".maxwell-close");
  var logNode = widget.querySelector(".maxwell-log");
  var form = widget.querySelector(".maxwell-form");
  var input = widget.querySelector(".maxwell-input");
  var previewStatus = widget.querySelector(".maxwell-preview__status");
  var previewContent = widget.querySelector(".maxwell-preview__content");
  var topicPulseNode = widget.querySelector(".maxwell-topic-pulse");
  var pinnedNode = widget.querySelector('[data-memory="pins"]');
  var recentNode = widget.querySelector('[data-memory="recent"]');

  function loadSession() {
    try {
      var raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      state.recentPaths = sanitizePathList(parsed.recentPaths, MAX_RECENT);
      state.pinnedPaths = sanitizePathList(parsed.pinnedPaths, MAX_PINS);
    } catch (error) {
      state.recentPaths = [];
      state.pinnedPaths = [];
    }
  }

  function persistSession() {
    try {
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          recentPaths: state.recentPaths.slice(0, MAX_RECENT),
          pinnedPaths: state.pinnedPaths.slice(0, MAX_PINS)
        })
      );
    } catch (error) {
      return;
    }
  }

  function sanitizePathList(list, limit) {
    if (!Array.isArray(list)) return [];
    return list
      .map(function (item) {
        return String(item || "").trim();
      })
      .filter(Boolean)
      .filter(function (path, index, items) {
        return items.indexOf(path) === index;
      })
      .slice(0, limit);
  }

  function getTopic(topicId) {
    return TOPIC_MAP[topicId] || null;
  }

  function getTopicLabel(topicId) {
    var topic = getTopic(topicId);
    return topic ? topic.label : "";
  }

  function getEntryByPath(path) {
    return path && state.entryMap[path] ? state.entryMap[path] : null;
  }

  function isInternalNonPage(entry) {
    return entry.path.indexOf(state.context + "/") === 0 && entry.kind !== "page";
  }

  function isProblem(entry) {
    return entry.path.indexOf("problems/") === 0 || entry.path.indexOf("Jackson-problems/") === 0;
  }

  function isFormula(entry) {
    return entry.path.indexOf("Formula Sheet/") === 0;
  }

  function isNote(entry) {
    return (
      entry.path.indexOf("notes/") === 0 ||
      entry.path.indexOf("notes-diego/") === 0 ||
      entry.title.indexOf("Notes") !== -1
    );
  }

  function isVisual(entry) {
    return (
      entry.kind === "image" ||
      entry.path.indexOf("docs/assets/") === 0 ||
      entry.path.indexOf("codes/plots/") === 0 ||
      entry.path.indexOf("docs/visual") === 0 ||
      entry.path.indexOf("docs/lab") === 0 ||
      entry.path.indexOf("docs/charge-hunt") === 0 ||
      entry.path.indexOf("docs/flux-box") === 0 ||
      entry.path.indexOf("docs/repo-mindmap") === 0 ||
      entry.path.indexOf("docs/fft-poisson") === 0
    );
  }

  function isOverleaf(entry) {
    return entry.path.indexOf("overleaf_uploads/") === 0;
  }

  function bestUse(entry) {
    if (isFormula(entry)) return "fast review";
    if (isProblem(entry)) return "problem practice";
    if (entry.kind === "notebook") return "interactive derivation";
    if (entry.kind === "page") return "guided browser view";
    if (entry.kind === "markdown") return "editable reading notes";
    if (entry.kind === "pdf") return "reading or printing";
    if (entry.kind === "latex") return "source editing";
    if (entry.kind === "image") return "visual intuition";
    if (entry.kind === "script") return "implementation details";
    return "repo reference";
  }

  function inferredDescription(entry) {
    var generic = !entry.description || /file in the repository\./i.test(entry.description);
    var topicLabel = getTopicLabel(entry._primaryTopic || entry._topics[0]) || entry.group || "the repo";

    if (!generic) return entry.description;
    if (entry.kind === "page") return "Browser page for " + topicLabel.toLowerCase() + ".";
    if (isFormula(entry)) return "Formula sheet for quick review in " + topicLabel.toLowerCase() + ".";
    if (isProblem(entry)) return "Problem set or homework file for " + topicLabel.toLowerCase() + ".";
    if (entry.kind === "notebook") return "Notebook for " + topicLabel.toLowerCase() + " with code or derivation.";
    if (entry.kind === "pdf") return "PDF reference for " + topicLabel.toLowerCase() + ".";
    if (entry.kind === "markdown") return "Markdown notes for " + topicLabel.toLowerCase() + ".";
    if (entry.kind === "latex") return "Source file related to " + topicLabel.toLowerCase() + ".";
    if (entry.kind === "image") return "Visual asset connected to " + topicLabel.toLowerCase() + ".";
    if (entry.kind === "script") return "Source script connected to " + topicLabel.toLowerCase() + ".";
    return "Repository item connected to " + topicLabel.toLowerCase() + ".";
  }

  function inferTopics(entry) {
    var topics = [];
    var haystack = normalize(
      [
        entry.title,
        entry.path,
        entry.kind,
        entry.group,
        entry.description,
        (entry.aliases || []).join(" ")
      ].join(" ")
    );

    function addTopic(topicId) {
      if (!TOPIC_MAP[topicId]) return;
      if (topics.indexOf(topicId) === -1) topics.push(topicId);
    }

    if (entry.path.indexOf("notes-diego/chapter-1/") === 0 || entry.path.indexOf("Jackson-problems/chapter_1") === 0) {
      addTopic("electrostatics");
    }
    if (entry.path.indexOf("notes-diego/chapter-2/") === 0 || entry.path.indexOf("Jackson-problems/chapter_2") === 0) {
      addTopic("method-of-images");
    }
    if (entry.path.indexOf("notes-diego/chapter-3/") === 0) {
      addTopic("potentials");
    }
    if (entry.path.indexOf("notes-diego/chapter-4/") === 0) {
      addTopic("dielectrics");
    }
    if (entry.path.indexOf("notes-diego/chapter-5/") === 0) {
      addTopic("magnetostatics");
    }
    if (entry.path.indexOf("notes-diego/calculus-theorems/") === 0) {
      addTopic("vector-analysis");
    }

    TOPICS.forEach(function (topic) {
      if (
        topic._keywordNorms.some(function (keyword) {
          return keyword && haystack.indexOf(keyword) !== -1;
        })
      ) {
        addTopic(topic.id);
      }
    });

    if (isVisual(entry)) addTopic("visuals");
    if (entry.group === "Website" || entry.path === "README.md") addTopic("repo");
    if (!topics.length && entry.group === "Repository") addTopic("repo");

    return topics;
  }

  function decorateEntry(entry) {
    entry.priority = Number(entry.priority || 0);
    entry._titleNorm = normalize(entry.title);
    entry._pathNorm = normalize(entry.path);
    entry._aliasesNormList = (entry.aliases || []).map(function (alias) {
      return normalize(alias);
    });
    entry._aliasNorm = normalize((entry.aliases || []).join(" "));
    entry._descriptionNorm = normalize(entry.description || "");
    entry._topics = inferTopics(entry);
    entry._primaryTopic = entry._topics[0] || "";
    entry._topicNorm = normalize(
      entry._topics
        .map(function (topicId) {
          return getTopicLabel(topicId);
        })
        .join(" ")
    );
    entry._previewDescription = inferredDescription(entry);
    entry._searchNorm = normalize(
      [
        entry.title,
        entry.path,
        entry.kind,
        entry.group,
        entry.description,
        entry._previewDescription,
        entry._topicNorm,
        (entry.aliases || []).join(" ")
      ].join(" ")
    );
    return entry;
  }

  function buildTopicCounts() {
    state.topicCounts = {};
    state.entries.forEach(function (entry) {
      entry._topics.forEach(function (topicId) {
        state.topicCounts[topicId] = (state.topicCounts[topicId] || 0) + 1;
      });
    });
  }

  function renderTopicPulse() {
    if (!topicPulseNode) return;
    topicPulseNode.innerHTML = "";

    var rankedTopics = TOPICS.map(function (topic) {
      return {
        topic: topic,
        count: state.topicCounts[topic.id] || 0
      };
    })
      .filter(function (item) {
        return item.count > 0 && item.topic.id !== "repo";
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, 4);

    if (!rankedTopics.length) return;

    var label = document.createElement("div");
    label.className = "maxwell-memory-panel__label";
    label.textContent = "Live topics";
    topicPulseNode.appendChild(label);

    var row = document.createElement("div");
    row.className = "maxwell-topic-pulse__row";

    rankedTopics.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "maxwell-mini-chip";
      button.setAttribute("data-command", "topic " + item.topic.label.toLowerCase());
      button.textContent = item.topic.label + " (" + item.count + ")";
      row.appendChild(button);
    });

    topicPulseNode.appendChild(row);
  }

  function formatKind(kind) {
    return String(kind || "file").toUpperCase();
  }

  function scrollLog() {
    logNode.scrollTop = logNode.scrollHeight;
  }

  function createLine(role, text) {
    var line = document.createElement("div");
    line.className = "maxwell-line maxwell-line--" + role;
    line.textContent = text;
    return line;
  }

  function appendLine(role, text) {
    var line = createLine(role, text);
    logNode.appendChild(line);
    scrollLog();
    return line;
  }

  function appendUser(text) {
    appendLine("user", "maxwell> " + text);
  }

  function appendSystem(text) {
    appendLine("system", text);
  }

  function appendWarning(text) {
    appendLine("warning", text);
  }

  function refreshResultHighlights() {
    var resultButtons = widget.querySelectorAll("[data-open-path]");
    resultButtons.forEach(function (button) {
      var path = button.getAttribute("data-open-path");
      button.classList.toggle("is-active", !!path && path === state.previewPath);
    });
  }

  function getPreviewEntry() {
    return getEntryByPath(state.previewPath);
  }

  function getRelatedEntries(entry, limit) {
    if (!entry || !entry._topics.length) return [];
    var topic = getTopic(entry._primaryTopic || entry._topics[0]);
    if (!topic) return [];
    return rankTopicEntries(topic, "topic")
      .filter(function (candidate) {
        return candidate.path !== entry.path;
      })
      .slice(0, limit || 3);
  }

  function setPreview(entry, sourceLabel) {
    if (!previewStatus || !previewContent) return;
    state.previewPath = entry ? entry.path : "";
    refreshResultHighlights();

    if (!entry) {
      previewStatus.textContent = sourceLabel || "Preview panel";
      previewContent.innerHTML = "";

      var empty = document.createElement("div");
      empty.className = "maxwell-preview-card";

      var emptyTitle = document.createElement("h3");
      emptyTitle.className = "maxwell-preview__title";
      emptyTitle.textContent = "Nothing selected yet.";

      var emptyBody = document.createElement("p");
      emptyBody.className = "maxwell-preview__description";
      emptyBody.textContent =
        "Try topics, notes, visuals, or a direct search. Maxwell will keep the next step simple.";

      empty.appendChild(emptyTitle);
      empty.appendChild(emptyBody);
      previewContent.appendChild(empty);
      return;
    }

    var topic = getTopic(entry._primaryTopic || entry._topics[0]);
    previewStatus.textContent = sourceLabel || "Preview";
    previewContent.innerHTML = "";

    var card = document.createElement("div");
    card.className = "maxwell-preview-card";

    var title = document.createElement("h3");
    title.className = "maxwell-preview__title";
    title.textContent = entry.title;

    var meta = document.createElement("div");
    meta.className = "maxwell-preview__meta";

    var kindBadge = document.createElement("span");
    kindBadge.className = "maxwell-preview__badge";
    kindBadge.textContent = formatKind(entry.kind);
    meta.appendChild(kindBadge);

    var groupBadge = document.createElement("span");
    groupBadge.className = "maxwell-preview__badge";
    groupBadge.textContent = entry.group;
    meta.appendChild(groupBadge);

    if (topic) {
      var topicBadge = document.createElement("span");
      topicBadge.className = "maxwell-preview__badge maxwell-preview__badge--topic";
      topicBadge.textContent = topic.label;
      meta.appendChild(topicBadge);
    }

    var description = document.createElement("p");
    description.className = "maxwell-preview__description";
    description.textContent = entry._previewDescription;

    var pathLine = document.createElement("div");
    pathLine.className = "maxwell-preview__path";
    pathLine.textContent = entry.path;

    var actions = document.createElement("div");
    actions.className = "maxwell-preview__actions";

    var openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "maxwell-action";
    openButton.setAttribute("data-preview-open", entry.path);
    openButton.textContent = "Open";
    actions.appendChild(openButton);

    if (topic) {
      var studyButton = document.createElement("button");
      studyButton.type = "button";
      studyButton.className = "maxwell-action maxwell-action--soft";
      studyButton.setAttribute("data-command-run", "study " + topic.label.toLowerCase());
      studyButton.textContent = "Study";
      actions.appendChild(studyButton);
    }

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(description);
    card.appendChild(pathLine);
    card.appendChild(actions);

    previewContent.appendChild(card);
  }

  function pushUniqueFront(list, value, maxSize) {
    var next = [value].concat(
      list.filter(function (item) {
        return item !== value;
      })
    );
    return next.slice(0, maxSize);
  }

  function rememberRecent(entry) {
    if (!entry || !entry.path) return;
    state.recentPaths = pushUniqueFront(state.recentPaths, entry.path, MAX_RECENT);
    persistSession();
    renderMemoryPanels();
  }

  function togglePinned(entry) {
    if (!entry || !entry.path) return false;
    var pinned = state.pinnedPaths.indexOf(entry.path) !== -1;
    if (pinned) {
      state.pinnedPaths = state.pinnedPaths.filter(function (path) {
        return path !== entry.path;
      });
    } else {
      state.pinnedPaths = pushUniqueFront(state.pinnedPaths, entry.path, MAX_PINS);
    }
    persistSession();
    renderMemoryPanels();
    setPreview(entry, "Preview");
    return !pinned;
  }

  function createMemoryButton(entry) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "maxwell-memory-item";
    button.setAttribute("data-preview-path", entry.path);
    button.textContent = entry.title;
    return button;
  }

  function renderMemoryPane(node, paths, emptyLabel) {
    if (!node) return;
    node.innerHTML = "";

    var entries = paths
      .map(function (path) {
        return getEntryByPath(path);
      })
      .filter(Boolean);

    if (!entries.length) {
      var empty = document.createElement("div");
      empty.className = "maxwell-memory-empty";
      empty.textContent = emptyLabel;
      node.appendChild(empty);
      return;
    }

    entries.forEach(function (entry) {
      node.appendChild(createMemoryButton(entry));
    });
  }

  function renderMemoryPanels() {
    renderMemoryPane(pinnedNode, state.pinnedPaths, "Pin a previewed item to keep it here.");
    renderMemoryPane(recentNode, state.recentPaths, "Open something and it will appear here.");
  }

  function scoreEntry(entry, query) {
    var normalizedQuery = normalize(query);
    if (!normalizedQuery) return 0;

    var tokens = normalizedQuery.split(" ").filter(Boolean);
    var matchedTokens = 0;
    var score = 0;
    var internalNonPage = isInternalNonPage(entry);

    if (entry._titleNorm === normalizedQuery) score += internalNonPage ? 70 : 240;
    if (entry._pathNorm === normalizedQuery) score += 220;
    if (entry._aliasesNormList.indexOf(normalizedQuery) !== -1) score += 250;
    if (entry._topicNorm === normalizedQuery) score += 110;
    if (entry._searchNorm.indexOf(normalizedQuery) !== -1) score += 90;
    if (entry._titleNorm.indexOf(normalizedQuery) !== -1) score += 120;
    if (entry._pathNorm.indexOf(normalizedQuery) !== -1) score += 105;

    tokens.forEach(function (token) {
      var matched = false;

      if (entry._titleNorm.indexOf(token) !== -1) {
        score += 28;
        matched = true;
      }
      if (entry._pathNorm.indexOf(token) !== -1) {
        score += 22;
        matched = true;
      }
      if (entry._aliasNorm.indexOf(token) !== -1) {
        score += 24;
        matched = true;
      }
      if (entry._descriptionNorm.indexOf(token) !== -1) {
        score += 10;
        matched = true;
      }
      if (entry._topicNorm.indexOf(token) !== -1) {
        score += 18;
        matched = true;
      }

      if (matched) matchedTokens += 1;
    });

    if (!matchedTokens) return 0;
    if (tokens.length > 1 && matchedTokens < Math.max(1, Math.ceil(tokens.length * 0.6))) return 0;

    score += entry.priority * 0.45;
    if (entry.kind === "page") score += 20;
    if (internalNonPage && tokens.length === 1 && normalizedQuery.length <= 8) score -= 28;
    if (isOverleaf(entry)) score -= 34;
    return score;
  }

  function searchEntries(query, limit) {
    return state.entries
      .map(function (entry) {
        return {
          entry: entry,
          score: scoreEntry(entry, query)
        };
      })
      .filter(function (item) {
        return item.score > 0;
      })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.title.localeCompare(b.entry.title);
      })
      .slice(0, limit || MAX_RESULTS)
      .map(function (item) {
        item.entry._score = item.score;
        return item.entry;
      });
  }

  function showResults(title, results, hint, previewLabel) {
    state.lastResults = results.slice(0, MAX_RESULTS);

    var block = document.createElement("div");
    block.className = "maxwell-block";

    var heading = document.createElement("div");
    heading.className = "maxwell-line maxwell-line--system";
    heading.textContent = title;
    block.appendChild(heading);

    if (hint) {
      var hintLine = document.createElement("div");
      hintLine.className = "maxwell-line maxwell-line--hint";
      hintLine.textContent = hint;
      block.appendChild(hintLine);
    }

    var list = document.createElement("div");
    list.className = "maxwell-results";

    if (!state.lastResults.length) {
      var empty = document.createElement("div");
      empty.className = "maxwell-line maxwell-line--warning";
      empty.textContent = "No matches.";
      list.appendChild(empty);
    }

    state.lastResults.forEach(function (entry, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "maxwell-result";
      button.setAttribute("data-open-path", entry.path);

      var left = document.createElement("span");
      left.className = "maxwell-result__main";

      var ordinal = document.createElement("span");
      ordinal.className = "maxwell-result__index";
      ordinal.textContent = String(index + 1).padStart(2, "0");

      var meta = document.createElement("span");
      meta.className = "maxwell-result__copy";

      var label = document.createElement("span");
      label.className = "maxwell-result__title";
      label.textContent = entry.title;

      var subline = document.createElement("span");
      subline.className = "maxwell-result__path";
      subline.textContent = entry.path;

      meta.appendChild(label);
      meta.appendChild(subline);
      left.appendChild(ordinal);
      left.appendChild(meta);

      var badge = document.createElement("span");
      badge.className = "maxwell-result__badge";
      badge.textContent = formatKind(entry.kind);

      button.appendChild(left);
      button.appendChild(badge);
      list.appendChild(button);
    });

    block.appendChild(list);
    logNode.appendChild(block);
    scrollLog();

    if (state.lastResults.length) {
      setPreview(state.lastResults[0], previewLabel || "Preview");
    } else {
      setPreview(null, previewLabel || "Preview");
    }
  }

  function makeFallbackPage(path, title) {
    return decorateEntry({
      title: title,
      path: path,
      url: "../" + path,
      kind: "page",
      group: "Website",
      description: "Built-in page route.",
      aliases: [],
      openIn: "self",
      priority: 180
    });
  }

  function resolveBuiltInRoute(query) {
    var normalizedQuery = normalize(query);
    var routes = {
      home: { file: "index.html", title: "Home" },
      index: { file: "index.html", title: "Home" },
      notes: { file: "notes.html", title: "Notes" },
      topics: { file: "topics.html", title: "Topics" },
      visuals: { file: "visuals.html", title: "Visuals" },
      lab: { file: "lab.html", title: "Mini Electrodynamics Lab", fallbackPath: "docs/lab.html" },
      "mini lab": { file: "lab.html", title: "Mini Electrodynamics Lab", fallbackPath: "docs/lab.html" },
      "electrodynamics lab": { file: "lab.html", title: "Mini Electrodynamics Lab", fallbackPath: "docs/lab.html" },
      "mini electrodynamics lab": { file: "lab.html", title: "Mini Electrodynamics Lab", fallbackPath: "docs/lab.html" },
      "charge hunt": { file: "charge-hunt.html", title: "Charge Hunt", fallbackPath: "docs/charge-hunt.html" },
      "charge-hunt": { file: "charge-hunt.html", title: "Charge Hunt", fallbackPath: "docs/charge-hunt.html" },
      "flux box": { file: "flux-box.html", title: "Flux Box", fallbackPath: "docs/flux-box.html" },
      "repo map": { file: "repo-mindmap.html", title: "3D Repo Mindmap", fallbackPath: "docs/repo-mindmap.html" },
      mindmap: { file: "repo-mindmap.html", title: "3D Repo Mindmap", fallbackPath: "docs/repo-mindmap.html" },
      yarnball: { file: "repo-mindmap.html", title: "3D Repo Mindmap", fallbackPath: "docs/repo-mindmap.html" },
      "fft poisson": { file: "fft-poisson.html", title: "3D FFT Poisson Viewer", fallbackPath: "docs/fft-poisson.html" },
      "poisson viewer": { file: "fft-poisson.html", title: "3D FFT Poisson Viewer", fallbackPath: "docs/fft-poisson.html" },
      game: { file: "charge-hunt.html", title: "Charge Hunt", fallbackPath: "docs/charge-hunt.html" }
    };
    var route = routes[normalizedQuery];
    var localPath;
    if (!route) return null;

    localPath = state.context + "/" + route.file;
    if (state.entryMap[localPath]) return state.entryMap[localPath];
    if (route.fallbackPath) return makeFallbackPage(route.fallbackPath, route.title);
    return null;
  }

  function getResultByOrdinal(raw) {
    var match = String(raw || "").trim().match(/^(\d+)$/);
    if (!match) return null;
    var index = parseInt(match[1], 10) - 1;
    if (index < 0 || index >= state.lastResults.length) return null;
    return state.lastResults[index];
  }

  function resolveTopic(query) {
    var normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    var matches = TOPICS.map(function (topic) {
      var score = 0;
      if (topic._labelNorm === normalizedQuery) score += 100;
      if (topic._aliasNorms.indexOf(normalizedQuery) !== -1) score += 120;
      if (topic._labelNorm.indexOf(normalizedQuery) !== -1) score += 70;

      topic._aliasNorms.forEach(function (alias) {
        if (alias.indexOf(normalizedQuery) !== -1 || normalizedQuery.indexOf(alias) !== -1) score += 45;
      });

      return {
        topic: topic,
        score: score
      };
    })
      .filter(function (item) {
        return item.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    return matches.length ? matches[0].topic : null;
  }

  function scoreTopicEntry(entry, mode, topic) {
    var score = entry.priority + 20;
    var primary = entry._primaryTopic === topic.id;

    if (primary) score += 42;
    if (entry._topics.indexOf(topic.id) !== -1) score += 30;
    if (isOverleaf(entry)) score -= 60;
    if (entry.path.indexOf("tools/") === 0) score -= 34;
    if (entry.kind === "latex" && !isFormula(entry) && !isProblem(entry)) score -= 10;

    if (mode === "study") {
      if (entry.kind === "page") score += 52;
      if (entry.kind === "markdown") score += 46;
      if (entry.kind === "pdf") score += 36;
      if (entry.kind === "notebook") score += 34;
      if (isProblem(entry)) score += 26;
      if (isFormula(entry)) score += 28;
      if (isVisual(entry)) score += 18;
    } else if (mode === "review") {
      if (isFormula(entry)) score += 92;
      if (isProblem(entry)) score += 76;
      if (entry.kind === "pdf") score += 38;
      if (isNote(entry)) score += 34;
      if (entry.kind === "markdown") score += 26;
      if (entry.kind === "page") score += 18;
      if (entry.kind === "notebook") score += 10;
      if (isVisual(entry)) score -= 6;
    } else {
      if (entry.kind === "page") score += 30;
      if (entry.kind === "pdf") score += 24;
      if (entry.kind === "notebook") score += 22;
      if (isProblem(entry)) score += 18;
      if (isFormula(entry)) score += 18;
      if (isVisual(entry)) score += 12;
    }

    if (topic.id === "visuals") {
      if (isVisual(entry)) score += 70;
      if (entry.kind === "page") score += 30;
      if (entry.kind === "image") score += 28;
      if (entry.kind === "script") score += 12;
    }

    if (topic.id === "repo") {
      if (entry.group === "Website") score += 40;
      if (entry.path === "README.md") score += 30;
    }

    return score;
  }

  function rankTopicEntries(topic, mode) {
    var seenTitles = {};
    var ranked = state.entries
      .filter(function (entry) {
        return entry._topics.indexOf(topic.id) !== -1;
      })
      .map(function (entry) {
        return {
          entry: entry,
          score: scoreTopicEntry(entry, mode, topic)
        };
      })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.title.localeCompare(b.entry.title);
      });

    return ranked
      .filter(function (item) {
        var key = normalize(item.entry.title);
        if (seenTitles[key]) return false;
        seenTitles[key] = true;
        return true;
      })
      .slice(0, MAX_RESULTS)
      .map(function (item) {
        item.entry._score = item.score;
        return item.entry;
      });
  }

  function listEntries(label, predicate, emptyMessage, previewLabel) {
    var results = state.entries.filter(predicate).slice(0, MAX_RESULTS);
    if (!results.length) {
      appendWarning(emptyMessage);
      return;
    }
    showResults(label, results, "Use open 1, open 2, or click a result.", previewLabel || "Preview");
  }

  function openEntry(entry) {
    if (!entry) return;
    rememberRecent(entry);
    setPreview(entry, "Preview");
    appendSystem("Opening " + entry.title + " ...");
    if (entry.openIn === "blank") {
      window.open(entry.url, "_blank", "noopener");
      return;
    }
    window.location.href = entry.url;
  }

  function findEntryFromQuery(query) {
    var trimmed = String(query || "").trim();
    if (!trimmed) return getPreviewEntry();

    var ordinalMatch = getResultByOrdinal(trimmed);
    if (ordinalMatch) return ordinalMatch;

    var builtInRoute = resolveBuiltInRoute(trimmed);
    if (builtInRoute) return builtInRoute;

    var normalizedQuery = normalize(trimmed);
    var exactPath = state.entries.find(function (entry) {
      return entry._pathNorm === normalizedQuery;
    });
    if (exactPath) return exactPath;

    var exactTitle = state.entries.find(function (entry) {
      return entry._titleNorm === normalizedQuery;
    });
    if (exactTitle) return exactTitle;

    var results = searchEntries(trimmed, MAX_RESULTS);
    return results.length ? results[0] : null;
  }

  function showTopicCatalog() {
    var available = TOPICS.map(function (topic) {
      return {
        topic: topic,
        count: state.topicCounts[topic.id] || 0
      };
    })
      .filter(function (item) {
        return item.count > 0;
      })
      .sort(function (a, b) {
        return b.count - a.count;
      });

    appendSystem("Available topics:");
    available.forEach(function (item) {
      appendSystem("  " + item.topic.label + " (" + item.count + ")");
    });
    appendSystem("Use: topic <name>, study <name>, or review <name>.");

    if (available.length) {
      var starter = rankTopicEntries(available[0].topic, "study")[0];
      if (starter) setPreview(starter, "Suggested start");
    }
  }

  function showTopicView(topic, mode) {
    var results = rankTopicEntries(topic, mode);
    if (!results.length) {
      appendWarning("No indexed files for " + topic.label + ".");
      return;
    }

    var titleMap = {
      topic: topic.label + " resources",
      study: "Study path for " + topic.label,
      review: "Review stack for " + topic.label
    };

    var hintMap = {
      topic: topic.intro + " Hover a result for preview, click to open.",
      study: "Start with pages or notes, then notebooks, then problems and formula sheets.",
      review: "Prioritizing formula sheets, problem sets, and concise references."
    };

    showResults(titleMap[mode], results, hintMap[mode], mode === "review" ? "Review preview" : "Study preview");
  }

  function showPinnedEntries() {
    var results = state.pinnedPaths
      .map(function (path) {
        return getEntryByPath(path);
      })
      .filter(Boolean);

    if (!results.length) {
      appendWarning("Nothing pinned yet.");
      return;
    }

    showResults("Pinned entries", results, "Preview stays on the right. Click a result to open it.", "Pinned preview");
  }

  function showRecentEntries() {
    var results = state.recentPaths
      .map(function (path) {
        return getEntryByPath(path);
      })
      .filter(Boolean);

    if (!results.length) {
      appendWarning("No recent entries yet.");
      return;
    }

    showResults("Recent entries", results, "Preview stays on the right. Click a result to open it.", "Recent preview");
  }

  function showRelated(query) {
    var base = findEntryFromQuery(query || "");
    if (!base) {
      appendWarning("No base entry available for related suggestions.");
      return;
    }

    var topic = getTopic(base._primaryTopic || base._topics[0]);
    if (!topic) {
      appendWarning("No topic signal found for " + base.title + ".");
      return;
    }

    var related = rankTopicEntries(topic, "topic").filter(function (entry) {
      return entry.path !== base.path;
    });

    if (!related.length) {
      appendWarning("No related items found for " + base.title + ".");
      return;
    }

    showResults(
      'Related to "' + base.title + '".',
      related,
      "Shared topic: " + topic.label + ".",
      "Related preview"
    );
  }

  function showHelp() {
    [
      "Commands:",
      "  help",
      "  topics | topic <name>",
      "  study <name> | review <name>",
      "  find <query> | open <query> | open 1",
      "  related [query]",
      "  pages | notes | notebooks | problems | formula | scripts | visuals",
      "  clear | close"
    ].forEach(function (line) {
      appendSystem(line);
    });
  }

  function clearConsole() {
    logNode.innerHTML = "";
    appendSystem("Console cleared. Maxwell standing by.");
  }

  function handleGreeting(normalized) {
    var helloSet = {
      hi: "Hello. Maxwell online. Ask for a topic, a study path, or a direct file.",
      hello: "Hello. Maxwell online. Ask for a topic, a study path, or a direct file.",
      hey: "Hello. Try: study electrostatics or review poisson.",
      hola: "Hola. Prueba: study electrostatics o review poisson.",
      buenas: "Hola. Maxwell listo para navegar el repositorio."
    };
    var statusSet = {
      "how are you": "Running normally. Repo index synchronized and preview panel ready.",
      "how you doing": "Running normally. Repo index synchronized and preview panel ready.",
      "how are you doing": "Running normally. Repo index synchronized and preview panel ready.",
      "como estas": "Todo bien. Maxwell listo para navegar el repositorio.",
      "como esta": "Todo bien. Maxwell listo para navegar el repositorio.",
      "que tal": "Todo bien. Maxwell listo para navegar el repositorio."
    };

    if (helloSet[normalized]) {
      appendSystem(helloSet[normalized]);
      return true;
    }

    if (statusSet[normalized]) {
      appendSystem(statusSet[normalized]);
      return true;
    }

    return false;
  }

  function tryOpenQuery(query) {
    var ordinalMatch = getResultByOrdinal(query);
    var builtInRoute = resolveBuiltInRoute(query);

    if (ordinalMatch) {
      openEntry(ordinalMatch);
      return;
    }

    if (builtInRoute) {
      openEntry(builtInRoute);
      return;
    }

    var results = searchEntries(query, MAX_RESULTS);
    if (!results.length) {
      appendWarning('No repo match for "' + query + '".');
      return;
    }

    var top = results[0];
    var second = results[1];
    var topGap = second ? top._score - second._score : 999;
    var exact = top._titleNorm === normalize(query) || top._pathNorm === normalize(query);

    if (exact || results.length === 1 || topGap >= 55) {
      openEntry(top);
      return;
    }

    showResults('Multiple matches for "' + query + '".', results, "Click a result to open it, or use open 1.", "Match preview");
  }

  function bootConsole() {
    if (state.booted) return;
    state.booted = true;

    appendSystem("MAXWELL v2 online.");
    if (state.count) {
      appendSystem("Indexed " + state.count + " files in " + state.context + " mode.");
    } else {
      appendSystem("Repository index still loading...");
    }
    appendSystem("Try: topics, study electrostatics, review poisson, open lab.");

    if (!getPreviewEntry()) {
      var homeEntry = getEntryByPath("docs/index.html") || state.entries[0];
      if (homeEntry) setPreview(homeEntry, "Suggested start");
      else setPreview(null, "Preview panel");
    }
  }

  function executeCommand(rawValue, fromShortcut) {
    var raw = String(rawValue || "").trim();
    if (!raw) return;

    if (!fromShortcut) appendUser(raw);

    var normalized = normalize(raw);
    var openMatch = normalized.match(/^(open|go|read)\s+(.+)$/);
    var findMatch = normalized.match(/^(find|search)\s+(.+)$/);
    var listMatch = normalized.match(/^list\s+(.+)$/);
    var topicMatch = normalized.match(/^topic\s*(.*)$/);
    var studyMatch = normalized.match(/^study\s+(.+)$/);
    var reviewMatch = normalized.match(/^review\s+(.+)$/);
    var previewMatch = normalized.match(/^preview\s+(.+)$/);
    var relatedMatch = normalized.match(/^related\s*(.*)$/);
    var pinMatch = normalized.match(/^pin\s*(.*)$/);
    var unpinMatch = normalized.match(/^unpin\s*(.*)$/);

    if (handleGreeting(normalized)) {
      return;
    }

    if (normalized === "help") {
      showHelp();
      return;
    }

    if (normalized === "clear") {
      clearConsole();
      return;
    }

    if (normalized === "close" || normalized === "exit") {
      setOpen(false);
      return;
    }

    if (normalized === "topics") {
      showTopicCatalog();
      return;
    }

    if (topicMatch) {
      var topicQuery = String(topicMatch[1] || "").trim();
      if (!topicQuery) {
        showTopicCatalog();
        return;
      }
      var matchedTopic = resolveTopic(topicQuery);
      if (!matchedTopic) {
        appendWarning('Unknown topic "' + topicQuery + '".');
        return;
      }
      showTopicView(matchedTopic, "topic");
      return;
    }

    if (studyMatch) {
      var studyTopic = resolveTopic(studyMatch[1]);
      if (!studyTopic) {
        appendWarning('Unknown topic "' + studyMatch[1] + '".');
        return;
      }
      showTopicView(studyTopic, "study");
      return;
    }

    if (reviewMatch) {
      var reviewTopic = resolveTopic(reviewMatch[1]);
      if (!reviewTopic) {
        appendWarning('Unknown topic "' + reviewMatch[1] + '".');
        return;
      }
      showTopicView(reviewTopic, "review");
      return;
    }

    if (previewMatch) {
      var previewEntry = findEntryFromQuery(previewMatch[1]);
      if (!previewEntry) {
        appendWarning('No preview target found for "' + previewMatch[1] + '".');
        return;
      }
      setPreview(previewEntry, "Preview");
      appendSystem("Preview updated for " + previewEntry.title + ".");
      return;
    }

    if (relatedMatch) {
      showRelated(relatedMatch[1]);
      return;
    }

    if (normalized === "recent") {
      showRecentEntries();
      return;
    }

    if (normalized === "pins" || normalized === "pinned") {
      showPinnedEntries();
      return;
    }

    if (pinMatch) {
      var pinEntry = findEntryFromQuery(pinMatch[1]);
      if (!pinEntry) {
        appendWarning("Nothing available to pin.");
        return;
      }
      appendSystem((togglePinned(pinEntry) ? "Pinned " : "Unpinned ") + pinEntry.title + ".");
      return;
    }

    if (unpinMatch) {
      var unpinEntry = findEntryFromQuery(unpinMatch[1]);
      if (!unpinEntry) {
        appendWarning("Nothing available to unpin.");
        return;
      }
      if (state.pinnedPaths.indexOf(unpinEntry.path) === -1) {
        appendWarning(unpinEntry.title + " is not pinned.");
        return;
      }
      togglePinned(unpinEntry);
      appendSystem("Unpinned " + unpinEntry.title + ".");
      return;
    }

    if (normalized === "visuals" || (listMatch && listMatch[1] === "visuals")) {
      var visualsTopic = getTopic("visuals");
      showTopicView(visualsTopic, "topic");
      return;
    }

    if (normalized === "pages" || (listMatch && listMatch[1] === "pages")) {
      listEntries(
        "Internal pages",
        function (entry) {
          return entry.kind === "page" && entry.path.indexOf(state.context + "/") === 0;
        },
        "No internal pages found.",
        "Page preview"
      );
      return;
    }

    if (normalized === "notes" || (listMatch && listMatch[1] === "notes")) {
      listEntries(
        "Notes and chapter material",
        function (entry) {
          return entry.path.indexOf("notes/") === 0 || entry.path.indexOf("notes-diego/") === 0;
        },
        "No note files found.",
        "Notes preview"
      );
      return;
    }

    if (normalized === "notebooks" || (listMatch && listMatch[1] === "notebooks")) {
      listEntries(
        "Notebooks",
        function (entry) {
          return entry.kind === "notebook";
        },
        "No notebooks found.",
        "Notebook preview"
      );
      return;
    }

    if (normalized === "problems" || (listMatch && listMatch[1] === "problems")) {
      listEntries(
        "Problem sets",
        function (entry) {
          return isProblem(entry);
        },
        "No problem sets found.",
        "Problem preview"
      );
      return;
    }

    if (
      normalized === "formula" ||
      normalized === "formulas" ||
      normalized === "formula sheets" ||
      (listMatch &&
        (listMatch[1] === "formula" || listMatch[1] === "formulas" || listMatch[1] === "formula sheets"))
    ) {
      listEntries(
        "Formula sheets",
        function (entry) {
          return isFormula(entry);
        },
        "No formula sheets found.",
        "Formula preview"
      );
      return;
    }

    if (normalized === "scripts" || (listMatch && listMatch[1] === "scripts")) {
      listEntries(
        "Scripts and code files",
        function (entry) {
          return entry.kind === "script";
        },
        "No scripts found.",
        "Script preview"
      );
      return;
    }

    if (findMatch) {
      var searchResults = searchEntries(findMatch[2], MAX_RESULTS);
      if (!searchResults.length) {
        appendWarning('No repo match for "' + findMatch[2] + '".');
        return;
      }
      showResults('Results for "' + findMatch[2] + '".', searchResults, "Hover a result for preview. Click to open it.", "Search preview");
      return;
    }

    if (normalized === "open") {
      var currentPreview = getPreviewEntry();
      if (!currentPreview) {
        appendWarning("Nothing selected to open.");
        return;
      }
      openEntry(currentPreview);
      return;
    }

    if (openMatch) {
      tryOpenQuery(openMatch[2]);
      return;
    }

    if (getResultByOrdinal(normalized)) {
      openEntry(getResultByOrdinal(normalized));
      return;
    }

    var fallbackResults = searchEntries(raw, MAX_RESULTS);
    if (!fallbackResults.length) {
      appendWarning('Unknown command or no matches for "' + raw + '".');
      appendSystem("Type help to see commands.");
      return;
    }

    showResults('Closest matches for "' + raw + '".', fallbackResults, "Hover a result for preview. Click to open it.", "Search preview");
  }

  function prepareEntries(payload) {
    state.context = payload.context || state.context;
    state.count = payload.count || 0;
    state.entryMap = {};
    state.entries = (payload.entries || []).map(function (entry) {
      var decorated = decorateEntry(entry);
      state.entryMap[decorated.path] = decorated;
      return decorated;
    });
    buildTopicCounts();
    renderTopicPulse();
    renderMemoryPanels();

    if (!getPreviewEntry()) {
      setPreview(getEntryByPath("docs/index.html") || state.entries[0] || null, "Suggested start");
    }
  }

  function setOpen(nextOpen) {
    state.open = !!nextOpen;
    panel.classList.toggle("is-open", state.open);
    panel.setAttribute("aria-hidden", state.open ? "false" : "true");
    launcher.classList.toggle("is-hidden", state.open);
    if (state.open) {
      bootConsole();
      window.setTimeout(function () {
        input.focus();
      }, 60);
    }
  }

  function loadIndex() {
    appendSystem("Booting repository index...");
    fetch("./repo-index.json")
      .then(function (response) {
        if (!response.ok) throw new Error("Index fetch failed.");
        return response.json();
      })
      .then(function (payload) {
        prepareEntries(payload);
        appendSystem("Repository index synchronized. Indexed " + state.count + " files.");
      })
      .catch(function () {
        appendWarning("Maxwell could not load repo-index.json.");
      });
  }

  launcher.addEventListener("click", function () {
    setOpen(true);
  });

  closeButton.addEventListener("click", function () {
    setOpen(false);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = input.value.trim();
    if (!value) return;

    state.history.push(value);
    state.historyIndex = state.history.length;
    executeCommand(value, false);
    input.value = "";
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "ArrowUp") {
      if (!state.history.length) return;
      event.preventDefault();
      state.historyIndex = Math.max(0, state.historyIndex - 1);
      input.value = state.history[state.historyIndex] || "";
      return;
    }

    if (event.key === "ArrowDown") {
      if (!state.history.length) return;
      event.preventDefault();
      state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
      input.value = state.history[state.historyIndex] || "";
    }
  });

  logNode.addEventListener("mouseover", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var openButton = target.closest("[data-open-path]");
    if (!openButton) return;
    var path = openButton.getAttribute("data-open-path");
    if (!path || !state.entryMap[path]) return;
    setPreview(state.entryMap[path], "Preview");
  });

  logNode.addEventListener("focusin", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var openButton = target.closest("[data-open-path]");
    if (!openButton) return;
    var path = openButton.getAttribute("data-open-path");
    if (!path || !state.entryMap[path]) return;
    setPreview(state.entryMap[path], "Preview");
  });

  logNode.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var openButton = target.closest("[data-open-path]");
    if (!openButton) return;
    var path = openButton.getAttribute("data-open-path");
    if (!path || !state.entryMap[path]) return;
    openEntry(state.entryMap[path]);
  });

  widget.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var shortcutButton = target.closest("[data-command]");
    if (shortcutButton) {
      var shortcutCommand = shortcutButton.getAttribute("data-command");
      appendUser(shortcutCommand);
      executeCommand(shortcutCommand, true);
      input.focus();
      return;
    }

    var commandButton = target.closest("[data-command-run]");
    if (commandButton) {
      var inlineCommand = commandButton.getAttribute("data-command-run");
      appendUser(inlineCommand);
      executeCommand(inlineCommand, true);
      input.focus();
      return;
    }

    var previewButton = target.closest("[data-preview-path]");
    if (previewButton) {
      var previewPath = previewButton.getAttribute("data-preview-path");
      if (previewPath && state.entryMap[previewPath]) {
        setPreview(state.entryMap[previewPath], "Preview");
      }
      return;
    }

    var openPreview = target.closest("[data-preview-open]");
    if (openPreview) {
      var openPath = openPreview.getAttribute("data-preview-open");
      if (openPath && state.entryMap[openPath]) {
        openEntry(state.entryMap[openPath]);
      }
      return;
    }

    var pinPreview = target.closest("[data-preview-pin]");
    if (pinPreview) {
      var pinPath = pinPreview.getAttribute("data-preview-pin");
      if (pinPath && state.entryMap[pinPath]) {
        var entry = state.entryMap[pinPath];
        appendSystem((togglePinned(entry) ? "Pinned " : "Unpinned ") + entry.title + ".");
      }
    }
  });

  document.addEventListener("keydown", function (event) {
    var activeTag = document.activeElement ? document.activeElement.tagName : "";
    var typing = activeTag === "INPUT" || activeTag === "TEXTAREA";

    if (event.key === "Escape" && state.open) {
      setOpen(false);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen(!state.open);
      return;
    }

    if (!typing && !state.open && event.key === "/") {
      event.preventDefault();
      setOpen(true);
    }
  });

  renderMemoryPanels();
  setPreview(null, "Preview panel");
  loadIndex();
})();
