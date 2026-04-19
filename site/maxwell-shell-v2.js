(function () {
  var body = document.body;
  if (!body) return;

  var state = {
    context: "docs",
    count: 0,
    entries: [],
    entryMap: {},
    topicList: [],
    topicMap: {},
    topicsReady: false,
    topicsPromise: null,
    coachProblems: [],
    coachReady: false,
    coachPromise: null,
    qaChunks: [],
    qaReady: false,
    qaPromise: null,
    lastQuestion: "",
    lastResolvedQuestion: "",
    lastScope: null,
    activeHintTopicId: "",
    activeHintStep: 0,
    activeCoach: null,
    open: false,
    booted: false,
    history: [],
    historyIndex: -1,
    lastResults: []
  };

  var widget = document.createElement("div");
  widget.className = "maxwell-shell";
  widget.innerHTML = [
    '<button class="maxwell-launcher" type="button" aria-label="Open Maxwell terminal">',
    '  <span class="maxwell-launcher__label">MAXWELL</span>',
    '  <span class="maxwell-launcher__hint">Ctrl+K</span>',
    "</button>",
    '<section class="maxwell-panel" aria-hidden="true">',
    '  <div class="maxwell-panel__frame"></div>',
    '  <header class="maxwell-header">',
    '    <div class="maxwell-header__meta">',
    '      <span class="maxwell-dot"></span>',
    '      <span class="maxwell-header__title">MAXWELL TERMINAL</span>',
    '      <span class="maxwell-header__subtitle">repo navigator v2</span>',
    "    </div>",
    '    <button class="maxwell-close" type="button" aria-label="Close Maxwell">ESC</button>',
    "  </header>",
    '  <div class="maxwell-body">',
    '    <aside class="maxwell-sidecar">',
    '      <pre class="maxwell-ascii">  __\n /__\\\\\n(•‿•)\n /|∞|\\\\\n  | |\n /   \\\\\n\n Maxwell</pre>',
    '      <p class="maxwell-sidecar__text">Static terminal navigator for pages, notes, notebooks, and repo files.</p>',
    '      <div class="maxwell-shortcuts">',
    '        <button class="maxwell-chip" type="button" data-command="help">help</button>',
    '        <button class="maxwell-chip" type="button" data-command="pages">pages</button>',
    '        <button class="maxwell-chip" type="button" data-command="notes">notes</button>',
    '        <button class="maxwell-chip" type="button" data-command="notebooks">notebooks</button>',
    '        <button class="maxwell-chip" type="button" data-command="open lab">open lab</button>',
    "      </div>",
    "    </aside>",
    '    <div class="maxwell-console">',
    '      <div class="maxwell-log" aria-live="polite"></div>',
    '      <form class="maxwell-form">',
    '        <label class="maxwell-prompt" for="maxwellInput">maxwell@repo:~$</label>',
    '        <input id="maxwellInput" class="maxwell-input" type="text" autocomplete="off" spellcheck="false" placeholder="coach griffiths 3.8, first step, check my approach I will start with symmetry, ask what is Laplace\'s equation">',
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
  var shortcutButtons = widget.querySelectorAll("[data-command]");

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var COMMAND_CANONICAL = [
    "help",
    "pages",
    "notes",
    "notebooks",
    "problems",
    "formula",
    "scripts",
    "visuals",
    "topics",
    "topic",
    "study",
    "review",
    "hint",
    "coach",
    "strategy",
    "first",
    "mistakes",
    "equations",
    "sources",
    "clear",
    "close",
    "context",
    "reset context",
    "clear context",
    "exit",
    "open",
    "go",
    "read",
    "find",
    "search",
    "list",
    "ask",
    "explain"
  ];

  var COMMAND_REWRITES = {
    page: "pages",
    note: "notes",
    notebook: "notebooks",
    problem: "problems",
    problemset: "problems",
    formulae: "formula",
    formulas: "formula",
    script: "scripts",
    visual: "visuals",
    hints: "hint",
    source: "sources",
    solve: "coach",
    explain: "ask"
  };

  var QA_STOPWORDS = {
    a: 1,
    an: 1,
    and: 1,
    are: 1,
    as: 1,
    at: 1,
    be: 1,
    by: 1,
    can: 1,
    do: 1,
    does: 1,
    for: 1,
    from: 1,
    how: 1,
    i: 1,
    in: 1,
    is: 1,
    it: 1,
    of: 1,
    on: 1,
    or: 1,
    show: 1,
    tell: 1,
    that: 1,
    the: 1,
    this: 1,
    to: 1,
    what: 1,
    where: 1,
    which: 1,
    who: 1,
    why: 1,
    with: 1
  };

  var QUESTION_SCOPES = [
    {
      label: "Notes",
      aliases: ["notes", "note"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return path.indexOf("notes/") === 0 || path.indexOf("notes-diego/") === 0;
      }
    },
    {
      label: "Notebooks",
      aliases: ["notebooks", "notebook"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return path.indexOf("notebooks/") === 0;
      }
    },
    {
      label: "Slides",
      aliases: ["slides", "slide"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return path.indexOf("slides/") === 0;
      }
    },
    {
      label: "Formula Sheets",
      aliases: ["formula sheets", "formula sheet", "formulas", "formula"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return path.indexOf("formula sheet/") === 0;
      }
    },
    {
      label: "Problems",
      aliases: ["problems", "problem sets", "problem set"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return (
          path.indexOf("problems/") === 0 ||
          path.indexOf("overleaf_uploads/problems_project/") === 0 ||
          path.indexOf("jackson-problems/") === 0 ||
          path.indexOf("griffiths-problems/") === 0
        );
      }
    },
    {
      label: "Griffiths",
      aliases: ["griffiths"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return path === "griffiths_4ed.pdf" || path.indexOf("griffiths-problems/") === 0;
      }
    },
    {
      label: "Jackson",
      aliases: ["jackson"],
      test: function (path) {
        path = String(path || "").toLowerCase();
        return (
          path === "classical_electrodynamics_jackson_3rd_.pdf" ||
          path.indexOf("jackson-problems/") === 0 ||
          path.indexOf("notes-diego/") === 0
        );
      }
    }
  ];

  QUESTION_SCOPES.forEach(function (scope) {
    scope._aliases = scope.aliases
      .map(function (alias) {
        var normalizedAlias = normalize(alias);
        return {
          raw: alias,
          norm: normalizedAlias,
          words: normalizedAlias ? normalizedAlias.split(" ").length : 0
        };
      })
      .sort(function (a, b) {
        return b.norm.length - a.norm.length;
      });
  });

  function normalizePath(path) {
    return String(path || "").toLowerCase();
  }

  function isFormula(entry) {
    return normalizePath(entry && entry.path).indexOf("formula sheet/") === 0;
  }

  function isProblem(entry) {
    var path = normalizePath(entry && entry.path);
    return (
      path.indexOf("problems/") === 0 ||
      path.indexOf("griffiths-problems/") === 0 ||
      path.indexOf("jackson-problems/") === 0 ||
      path.indexOf("overleaf_uploads/problems_project/") === 0
    );
  }

  function isNote(entry) {
    var path = normalizePath(entry && entry.path);
    return path.indexOf("notes/") === 0 || path.indexOf("notes-diego/") === 0;
  }

  function isVisual(entry) {
    var path = normalizePath(entry && entry.path);
    return (
      path.indexOf("docs/visuals.html") === 0 ||
      path.indexOf("docs/lab.html") === 0 ||
      path.indexOf("docs/charge-hunt.html") === 0 ||
      path.indexOf("docs/fft-poisson.html") === 0 ||
      path.indexOf("docs/repo-mindmap.html") === 0 ||
      path.indexOf("codes/plots/") === 0 ||
      path.indexOf("docs/assets/") === 0 ||
      path.indexOf("codes/cpp/") === 0
    );
  }

  function isOverleaf(entry) {
    return normalizePath(entry && entry.path).indexOf("overleaf_uploads/") === 0;
  }

  function prepareTopics(payload) {
    state.topicMap = {};
    state.topicList = (payload.topics || []).map(function (topic) {
      topic.aliases = topic.aliases || [];
      topic.keywords = topic.keywords || [];
      topic.path_prefixes = topic.path_prefixes || [];
      topic.study_paths = topic.study_paths || [];
      topic.review_paths = topic.review_paths || [];
      topic.hints = topic.hints || [];
      topic._labelNorm = normalize(topic.label || topic.id || "");
      topic._aliasNorms = topic.aliases.map(function (alias) { return normalize(alias); });
      topic._keywordNorms = topic.keywords.map(function (keyword) { return normalize(keyword); });
      topic._pathPrefixes = topic.path_prefixes.map(function (prefix) { return normalizePath(prefix); });
      topic._studyPaths = topic.study_paths.map(function (path) { return normalizePath(path); });
      topic._reviewPaths = topic.review_paths.map(function (path) { return normalizePath(path); });
      state.topicMap[topic.id] = topic;
      return topic;
    });
    state.topicsReady = true;
    return state.topicList;
  }

  function loadTopicsManifest() {
    if (state.topicsReady) return Promise.resolve(state.topicList);
    if (state.topicsPromise) return state.topicsPromise;

    state.topicsPromise = fetch("./maxwell-topics.json")
      .then(function (response) {
        if (!response.ok) throw new Error("topics manifest fetch failed");
        return response.json();
      })
      .then(function (payload) {
        return prepareTopics(payload);
      })
      .catch(function () {
        state.topicsPromise = null;
        appendWarning("Maxwell could not load maxwell-topics.json.");
        return [];
      });

    return state.topicsPromise;
  }

  function prepareCoachProblems(payload) {
    state.coachProblems = (payload.problems || []).map(function (problem) {
      problem._idNorm = normalize(problem.problem_id || problem.id || "");
      problem._titleNorm = normalize(problem.title || "");
      problem._chapterNorm = normalize(problem.chapter_title || "");
      problem._topicNorm = normalize(problem.topic_id || "");
      problem._sourceNorm = normalize(problem.source || "");
      problem._statementNorm = normalize(problem.statement || "");
      problem._searchNorm = normalize(
        [
          problem.problem_id,
          problem.title,
          problem.chapter_title,
          problem.topic_id,
          problem.statement,
          problem.source
        ].join(" ")
      );
      return problem;
    });
    state.coachReady = true;
    return state.coachProblems;
  }

  function loadCoachManifest() {
    if (state.coachReady) return Promise.resolve(state.coachProblems);
    if (state.coachPromise) return state.coachPromise;

    state.coachPromise = fetch("./maxwell-problem-coach.json")
      .then(function (response) {
        if (!response.ok) throw new Error("coach manifest fetch failed");
        return response.json();
      })
      .then(function (payload) {
        return prepareCoachProblems(payload);
      })
      .catch(function () {
        state.coachPromise = null;
        appendWarning("Maxwell could not load maxwell-problem-coach.json.");
        return [];
      });

    return state.coachPromise;
  }

  function getTopic(topicId) {
    return state.topicMap[topicId] || null;
  }

  function getTopicLabel(topicId) {
    var topic = getTopic(topicId);
    return topic ? topic.label : "";
  }

  function resolveTopic(query) {
    var normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    var matches = state.topicList
      .map(function (topic) {
        var score = 0;
        if (topic._labelNorm === normalizedQuery) score += 120;
        if (topic._aliasNorms.indexOf(normalizedQuery) !== -1) score += 150;
        if (topic._labelNorm.indexOf(normalizedQuery) !== -1) score += 80;
        topic._aliasNorms.forEach(function (alias) {
          if (alias.indexOf(normalizedQuery) !== -1 || normalizedQuery.indexOf(alias) !== -1) score += 40;
        });
        return { topic: topic, score: score };
      })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    return matches.length ? matches[0].topic : null;
  }

  function inferTopics(entry) {
    var topics = [];
    var path = normalizePath(entry.path);
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
      if (topics.indexOf(topicId) === -1 && getTopic(topicId)) topics.push(topicId);
    }

    state.topicList.forEach(function (topic) {
      var matchedPrefix = topic._pathPrefixes.some(function (prefix) {
        return prefix && (path === prefix || path.indexOf(prefix) === 0);
      });
      var matchedKeyword = topic._keywordNorms.some(function (keyword) {
        return keyword && haystack.indexOf(keyword) !== -1;
      });
      var matchedAlias = topic._aliasNorms.some(function (alias) {
        return alias && haystack.indexOf(alias) !== -1;
      });

      if (matchedPrefix || matchedKeyword || matchedAlias) addTopic(topic.id);
    });

    if (isVisual(entry)) addTopic("visuals");
    if (entry.group === "Website" || entry.path === "README.md") addTopic("repo");
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
        .map(function (topicId) { return getTopicLabel(topicId); })
        .join(" ")
    );
    entry._searchNorm = normalize(
      [
        entry.title,
        entry.path,
        entry.kind,
        entry.group,
        entry.description,
        entry._topicNorm,
        (entry.aliases || []).join(" ")
      ].join(" ")
    );
    return entry;
  }

  function topicCounts() {
    var counts = {};
    state.entries.forEach(function (entry) {
      (entry._topics || []).forEach(function (topicId) {
        counts[topicId] = (counts[topicId] || 0) + 1;
      });
    });
    return counts;
  }

  function uniqueStrings(values) {
    var seen = {};
    return values.filter(function (value) {
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function allowedDistance(value) {
    var length = String(value || "").length;
    if (length <= 4) return 1;
    if (length <= 8) return 2;
    if (length <= 14) return 3;
    return 4;
  }

  function editDistance(a, b, maxDistance) {
    if (a === b) return 0;

    var aLength = a.length;
    var bLength = b.length;
    var limit = typeof maxDistance === "number" ? maxDistance : Infinity;
    var previous;
    var current;
    var rowMin;
    var i;
    var j;
    var cost;

    if (Math.abs(aLength - bLength) > limit) return limit + 1;

    previous = [];
    for (j = 0; j <= bLength; j += 1) previous[j] = j;

    for (i = 1; i <= aLength; i += 1) {
      current = [i];
      rowMin = current[0];

      for (j = 1; j <= bLength; j += 1) {
        cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
        if (current[j] < rowMin) rowMin = current[j];
      }

      if (rowMin > limit) return limit + 1;
      previous = current;
    }

    return previous[bLength];
  }

  function findClosestLiteral(query, candidates, maxDistance) {
    var normalizedQuery = normalize(query);
    var limit = typeof maxDistance === "number" ? maxDistance : allowedDistance(normalizedQuery);
    var best = null;
    var bestDistance = Infinity;
    var secondDistance = Infinity;

    candidates.forEach(function (candidate) {
      var distance;
      var normalizedCandidate = normalize(candidate);
      if (!normalizedCandidate) return;

      distance = editDistance(normalizedQuery, normalizedCandidate, Math.min(limit, bestDistance));
      if (distance < bestDistance) {
        secondDistance = bestDistance;
        bestDistance = distance;
        best = candidate;
      } else if (distance < secondDistance) {
        secondDistance = distance;
      }
    });

    if (!best || bestDistance > limit) return null;
    if (secondDistance === bestDistance) return null;

    return {
      value: best,
      distance: bestDistance
    };
  }

  function isInternalNonPage(entry) {
    return entry.path.indexOf(state.context + "/") === 0 && entry.kind !== "page";
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

  function formatKind(kind) {
    return String(kind || "file").toUpperCase();
  }

  function showResults(title, results, hint) {
    state.lastResults = results.slice(0, 8);

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
      button.setAttribute("data-open-path", entry.openKey || entry.path);

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

      var path = document.createElement("span");
      path.className = "maxwell-result__path";
      path.textContent = entry.path + (entry.locator ? " · " + entry.locator : "");

      meta.appendChild(label);
      meta.appendChild(path);
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
    return score;
  }

  function searchEntries(query, limit) {
    var results = state.entries
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
      .slice(0, limit || 8)
      .map(function (item) {
        item.entry._score = item.score;
        return item.entry;
      });

    return results;
  }

  function openEntry(entry) {
    if (!entry) return;
    appendSystem("Opening " + entry.title + " ...");
    if (entry.openIn === "blank") {
      window.open(entry.url, "_blank", "noopener");
      return;
    }
    window.location.href = entry.url;
  }

  function getResultByOrdinal(raw) {
    var match = String(raw || "").trim().match(/^(\d+)$/);
    if (!match) return null;
    var index = parseInt(match[1], 10) - 1;
    if (index < 0 || index >= state.lastResults.length) return null;
    return state.lastResults[index];
  }

  function listEntries(label, predicate, emptyMessage) {
    var results = state.entries.filter(predicate).slice(0, 8);
    if (!results.length) {
      appendWarning(emptyMessage);
      return;
    }
    showResults(label, results, "Use open 1, open 2, or click a result.");
  }

  function makeFallbackPage(path, title) {
    return {
      title: title,
      path: path,
      url: "../" + path,
      kind: "page",
      group: "Website",
      description: "Built-in page route.",
      aliases: [],
      openIn: "self",
      priority: 180,
      _titleNorm: normalize(title),
      _pathNorm: normalize(path),
      _aliasNorm: "",
      _aliasesNormList: [],
      _descriptionNorm: normalize("Built-in page route."),
      _searchNorm: normalize(title + " " + path + " built in page route")
    };
  }

  function getBuiltInRoutes() {
    return {
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
      game: { file: "charge-hunt.html", title: "Charge Hunt", fallbackPath: "docs/charge-hunt.html" }
    };
  }

  function resolveBuiltInRoute(query) {
    var normalizedQuery = normalize(query);
    var routes = getBuiltInRoutes();
    var route = routes[normalizedQuery];
    var localPath;
    if (!route) return null;

    localPath = state.context + "/" + route.file;
    if (state.entryMap[localPath]) return state.entryMap[localPath];
    if (route.fallbackPath) return makeFallbackPage(route.fallbackPath, route.title);
    return null;
  }

  function resolveFuzzyBuiltInRoute(query) {
    var normalizedQuery = normalize(query);
    var routes = getBuiltInRoutes();
    var match = findClosestLiteral(normalizedQuery, Object.keys(routes), allowedDistance(normalizedQuery));
    var route;
    var localPath;

    if (!match || normalize(match.value) === normalizedQuery) return null;

    route = routes[match.value];
    localPath = state.context + "/" + route.file;
    if (state.entryMap[localPath]) return state.entryMap[localPath];
    if (route.fallbackPath) return makeFallbackPage(route.fallbackPath, route.title);
    return null;
  }

  function rewriteApproximateCommand(normalized) {
    var parts = normalized.split(" ").filter(Boolean);
    var head;
    var match;

    if (!parts.length) return "";
    head = COMMAND_REWRITES[parts[0]] || parts[0];

    if (parts.length === 1) {
      match = findClosestLiteral(head, COMMAND_CANONICAL, allowedDistance(head));
      if (match && normalize(match.value) !== head) return match.value;
      return COMMAND_REWRITES[head] || "";
    }

    match = findClosestLiteral(head, COMMAND_CANONICAL, allowedDistance(head));
    if (!match || normalize(match.value) === head) return "";

    parts[0] = match.value;
    return parts.join(" ");
  }

  function entryFuzzyCandidates(entry) {
    return uniqueStrings(
      [entry._titleNorm]
        .concat(entry._aliasesNormList)
        .concat(entry._topicNorm ? [entry._topicNorm] : [])
        .concat(entry._titleNorm.split(" ").filter(function (token) { return token.length >= 4; }))
        .concat(entry._aliasNorm.split(" ").filter(function (token) { return token.length >= 4; }))
        .concat(entry._topicNorm.split(" ").filter(function (token) { return token.length >= 4; }))
    );
  }

  function fuzzySearchEntries(query, limit) {
    var normalizedQuery = normalize(query);
    var maxDistance = allowedDistance(normalizedQuery);
    var results;

    if (!normalizedQuery) return [];

    results = state.entries
      .map(function (entry) {
        var bestDistance = Infinity;
        var candidates = entryFuzzyCandidates(entry);

        candidates.forEach(function (candidate) {
          var candidateLimit = maxDistance + (candidate.indexOf(" ") !== -1 ? 1 : 0);
          var distance = editDistance(
            normalizedQuery,
            candidate,
            Math.min(candidateLimit, bestDistance)
          );
          if (distance < bestDistance) bestDistance = distance;
        });

        if (!isFinite(bestDistance)) return null;
        if (bestDistance > maxDistance + (normalizedQuery.indexOf(" ") !== -1 ? 1 : 0)) return null;

        entry._score = 220 - bestDistance * 40 + entry.priority * 0.2 + (entry.kind === "page" ? 8 : 0);
        entry._fuzzyDistance = bestDistance;
        return {
          entry: entry,
          score: entry._score,
          distance: bestDistance
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.title.localeCompare(b.entry.title);
      })
      .slice(0, limit || 8)
      .map(function (item) {
        return item.entry;
      });

    return results;
  }

  function hasConfidentFuzzyWinner(results) {
    var top = results[0];
    var second = results[1];
    if (!top) return false;
    if (top._fuzzyDistance > 2) return false;
    if (!second) return true;
    return top._fuzzyDistance + 2 <= second._fuzzyDistance;
  }

  function tokenizeQuestion(text) {
    return uniqueStrings(
      normalize(text)
        .split(" ")
        .filter(function (token) {
          return token.length >= 3 && !QA_STOPWORDS[token];
        })
    );
  }

  function escapeRegex(text) {
    return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function canonicalizeQuestionText(text) {
    return String(text || "")
      .replace(/\bwhat'?s\b/gi, "what is")
      .replace(/\bwhats\b/gi, "what is")
      .replace(/\bhow'?s\b/gi, "how is");
  }

  function parseScopedQuestion(question) {
    var raw = canonicalizeQuestionText(String(question || "").trim());
    var normalizedQuestion = normalize(raw);
    var remainderNorm;
    var rawWords;
    var matchScope = null;
    var matchAlias = null;

    if (normalizedQuestion.indexOf("from ") !== 0) {
      return {
        query: raw,
        scope: null
      };
    }

    remainderNorm = normalizedQuestion.slice(5).trim();
    rawWords = raw.split(/\s+/);

    QUESTION_SCOPES.some(function (scope) {
      return scope._aliases.some(function (alias) {
        if (remainderNorm === alias.norm || remainderNorm.indexOf(alias.norm + " ") === 0) {
          matchScope = scope;
          matchAlias = alias;
          return true;
        }
        return false;
      });
    });

    if (!matchScope || !matchAlias) {
      return {
        query: raw,
        scope: null
      };
    }

    return {
      query: canonicalizeQuestionText(rawWords.slice(1 + matchAlias.words).join(" ").trim()),
      scope: matchScope
    };
  }

  function isDefinitionQuestionNormalized(normalizedQuestion) {
    return /^(what is|define|explain)\b/.test(normalizedQuestion);
  }

  function conceptPattern(questionTokens) {
    if (!questionTokens.length) return null;
    return new RegExp(
      questionTokens
        .slice(0, Math.min(4, questionTokens.length))
        .map(escapeRegex)
        .join("(?:\\s+[a-z0-9]+)?\\s+")
    );
  }

  function definitionPatternScore(textNorm, questionTokens) {
    var concept = conceptPattern(questionTokens);
    var score = 0;

    if (!concept || !textNorm) return 0;

    if (concept.test(textNorm)) score += 12;
    if (new RegExp(concept.source + "\\s+(is|are|means|denotes|expresses|describes)\\b").test(textNorm)) score += 40;
    if (new RegExp("\\b(is|are|means|denotes|expresses|describes)\\b.{0,40}" + concept.source).test(textNorm)) score += 28;
    if (/\bcentral\b|\bfoundation\b|\blocal differential form\b|\bsource free limit\b/.test(textNorm)) score += 10;

    return score;
  }

  function chunkSourceBias(chunk, definitionQuestion) {
    var path = chunk._pathNorm;
    var text = chunk._textNorm;
    var score = 0;

    if (/^notes\b/.test(path) || /^notes diego\b/.test(path)) score += 34;
    if (/^notebooks\b/.test(path)) score += 32;
    if (/^slides\b/.test(path)) score += 12;
    if (path === "readme md") score += 12;
    if (/^formula sheet\b/.test(path)) score += 8;

    if (definitionQuestion) {
      if (/^problems\b/.test(path) || /^jackson problems\b/.test(path) || /^griffiths problems\b/.test(path) || /^overleaf uploads problems project\b/.test(path)) {
        score -= 40;
      }
      if (/\bcontents\b|\bproblem statement\b|\bsolution\b|\bsource notebook\b/.test(text)) score -= 24;
      if (/\bproblem\b/.test(text)) score -= 12;
    } else {
      if (/^problems\b/.test(path) || /^jackson problems\b/.test(path) || /^griffiths problems\b/.test(path) || /^overleaf uploads problems project\b/.test(path)) {
        score -= 8;
      }
    }

    return score;
  }

  function sentenceLooksNoisy(normalizedSentence) {
    if (!normalizedSentence) return true;
    if (/^(problem|contents|usage notes|source notebook)\b/.test(normalizedSentence)) return true;
    if (/\bcontents\b|\bproblem statement\b/.test(normalizedSentence)) return true;
    return false;
  }

  function prepareQaChunks(payload) {
    state.qaChunks = (payload.chunks || []).map(function (chunk) {
      chunk._titleNorm = normalize(chunk.title || "");
      chunk._pathNorm = normalize(chunk.path || "");
      chunk._textNorm = normalize(chunk.text || "");
      return chunk;
    });
    state.qaReady = true;
    return state.qaChunks;
  }

  function loadQaIndex() {
    if (state.qaReady) return Promise.resolve(state.qaChunks);
    if (state.qaPromise) return state.qaPromise;

    appendSystem("Loading local knowledge index...");
    state.qaPromise = fetch("./maxwell-qa-index.json")
      .then(function (response) {
        if (!response.ok) throw new Error("QA index fetch failed.");
        return response.json();
      })
      .then(function (payload) {
        prepareQaChunks(payload);
        appendSystem("Local knowledge index ready. " + state.qaChunks.length + " passages loaded.");
        return state.qaChunks;
      })
      .catch(function (error) {
        state.qaPromise = null;
        appendWarning("Maxwell could not load maxwell-qa-index.json.");
        throw error;
      });

    return state.qaPromise;
  }

  function scoreQaChunk(chunk, normalizedQuestion, questionTokens) {
    var score = 0;
    var matched = 0;
    var matchedTokens = {};
    var requiredMatches = questionTokens.length >= 4 ? 3 : questionTokens.length >= 2 ? 2 : 1;
    var definitionQuestion = isDefinitionQuestionNormalized(normalizedQuestion);
    var phraseHit = chunk._textNorm.indexOf(normalizedQuestion) !== -1;
    var index;
    var phrase;

    if (chunk._titleNorm.indexOf(normalizedQuestion) !== -1) score += 90;
    if (chunk._pathNorm.indexOf(normalizedQuestion) !== -1) score += 70;
    if (phraseHit) score += 120;

    questionTokens.forEach(function (token) {
      var tokenMatched = false;
      if (chunk._titleNorm.indexOf(token) !== -1) {
        score += 20;
        tokenMatched = true;
      }
      if (chunk._pathNorm.indexOf(token) !== -1) {
        score += 12;
      }
      if (chunk._textNorm.indexOf(token) !== -1) {
        score += 14;
        tokenMatched = true;
      }
      if (tokenMatched && !matchedTokens[token]) {
        matchedTokens[token] = true;
        matched += 1;
      }
    });

    for (index = 0; index < questionTokens.length - 1; index += 1) {
      phrase = questionTokens[index] + " " + questionTokens[index + 1];
      if (chunk._textNorm.indexOf(phrase) !== -1) score += 18;
    }

    if (!phraseHit && matched < requiredMatches) return 0;
    if (definitionQuestion) score += definitionPatternScore(chunk._textNorm, questionTokens);
    score += chunkSourceBias(chunk, definitionQuestion);
    score += Math.max(0, 20 - Math.floor((chunk.text || "").length / 140));
    return score;
  }

  function retrieveQaMatches(question, limit, scope) {
    var normalizedQuestion = normalize(question);
    var questionTokens = tokenizeQuestion(question);

    if (!normalizedQuestion) return [];

    return state.qaChunks
      .map(function (chunk) {
        if (scope && !scope.test(chunk.path)) return null;
        var score = scoreQaChunk(chunk, normalizedQuestion, questionTokens);
        if (!score) return null;
        chunk._qaScore = score;
        return chunk;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (b._qaScore !== a._qaScore) return b._qaScore - a._qaScore;
        return a.path.localeCompare(b.path);
      })
      .slice(0, limit || 5);
  }

  function splitSentences(text) {
    return (text || "")
      .replace(/\s+/g, " ")
      .match(/[^.!?]+[.!?]?/g) || [];
  }

  function chunkLocator(chunk) {
    if (!chunk) return "";
    if (chunk.locator) return chunk.locator;
    if (chunk.page_start) return "p. " + chunk.page_start;
    if (chunk.cell_start) return "cell " + chunk.cell_start;
    if (chunk.chunk_index) return "chunk " + chunk.chunk_index;
    return "";
  }

  function normalizeAnswerText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\*+/g, "")
      .trim();
  }

  function findEquationItem(matches, questionTokens) {
    var best = null;

    matches.slice(0, 4).forEach(function (chunk) {
      String(chunk.text || "")
        .split(/\n+/)
        .forEach(function (line) {
          var cleaned = normalizeAnswerText(line);
          var normalizedLine = normalize(cleaned);
          var score = 0;

          if (cleaned.length < 12 || cleaned.length > 220) return;
          if (!/(=|\\nabla|∇|rho|phi|varepsilon|epsilon|laplace|laplacian)/i.test(cleaned)) return;

          questionTokens.forEach(function (token) {
            if (normalizedLine.indexOf(token) !== -1) score += 10;
          });

          if (/[=]/.test(cleaned)) score += 18;
          if (/(poisson|laplace|phi|rho|epsilon|varepsilon|nabla|∇)/i.test(cleaned)) score += 18;
          score += Math.min(30, chunk._qaScore || 0);

          if (!best || score > best.score) {
            best = {
              kind: "equation",
              text: cleaned,
              score: score,
              chunk: chunk
            };
          }
        });
    });

    return best;
  }

  function buildAnswerItems(matches, question) {
    var normalizedQuestion = normalize(question);
    var questionTokens = tokenizeQuestion(question);
    var definitionQuestion = isDefinitionQuestionNormalized(normalizedQuestion);
    var seen = {};
    var sentenceCandidates = [];
    var items = [];
    var equationItem;

    matches.slice(0, 4).forEach(function (chunk) {
      splitSentences(chunk.text).forEach(function (sentence) {
        var cleaned = normalizeAnswerText(sentence);
        var normalizedSentence = normalize(cleaned);
        var sentenceScore = 0;

        if (cleaned.length < 50) return;
        if (sentenceLooksNoisy(normalizedSentence)) return;

        if (normalizedSentence.indexOf(normalizedQuestion) !== -1) sentenceScore += 90;
        questionTokens.forEach(function (token) {
          if (normalizedSentence.indexOf(token) !== -1) sentenceScore += 12;
        });
        if (definitionQuestion) sentenceScore += definitionPatternScore(normalizedSentence, questionTokens);
        if (/\bsolution\b|\bproblem\b|\bcontents\b/.test(normalizedSentence)) sentenceScore -= 18;
        if (chunk._pathNorm.indexOf("problems") === 0 || chunk._pathNorm.indexOf("jackson problems") === 0 || chunk._pathNorm.indexOf("griffiths problems") === 0) {
          sentenceScore -= 10;
        }
        sentenceScore += Math.min(40, chunk._qaScore || 0);

        sentenceCandidates.push({
          kind: "summary",
          text: cleaned,
          score: sentenceScore,
          chunk: chunk
        });
      });
    });

    sentenceCandidates.sort(function (a, b) {
      return b.score - a.score;
    });

    sentenceCandidates.forEach(function (candidate) {
      var key = normalize(candidate.text);
      if (seen[key]) return;
      if (items.length >= 2) return;
      seen[key] = true;
      items.push(candidate);
    });

    equationItem = findEquationItem(matches, questionTokens);
    if (equationItem && !seen[normalize(equationItem.text)]) {
      if (items.length >= 2) {
        items.splice(1, 0, equationItem);
      } else {
        items.push(equationItem);
      }
    }

    return items.slice(0, 3);
  }

  function selectAnswerLines(matches, question) {
    var normalizedQuestion = normalize(question);
    var questionTokens = tokenizeQuestion(question);
    var definitionQuestion = isDefinitionQuestionNormalized(normalizedQuestion);
    var chosen = [];
    var seen = {};

    matches.slice(0, 3).forEach(function (chunk) {
      var bestSentence = "";
      var bestScore = 0;

      splitSentences(chunk.text).forEach(function (sentence) {
        var normalizedSentence = normalize(sentence);
        var sentenceScore = 0;

        if (sentence.length < 50) return;
        if (sentenceLooksNoisy(normalizedSentence)) return;
        if (normalizedSentence.indexOf(normalizedQuestion) !== -1) sentenceScore += 90;
        questionTokens.forEach(function (token) {
          if (normalizedSentence.indexOf(token) !== -1) sentenceScore += 12;
        });
        if (definitionQuestion) sentenceScore += definitionPatternScore(normalizedSentence, questionTokens);
        if (/\bsolution\b|\bproblem\b|\bcontents\b/.test(normalizedSentence)) sentenceScore -= 18;
        if (chunk._pathNorm.indexOf("problems") === 0 || chunk._pathNorm.indexOf("jackson problems") === 0 || chunk._pathNorm.indexOf("griffiths problems") === 0) {
          sentenceScore -= 10;
        }

        if (sentenceScore > bestScore) {
          bestScore = sentenceScore;
          bestSentence = sentence.trim();
        }
      });

      if (!bestSentence) {
        bestSentence = (chunk.text || "").split("\n")[0].trim();
      }

      if (!bestSentence) return;
      if (seen[normalize(bestSentence)]) return;
      seen[normalize(bestSentence)] = true;
      chosen.push(bestSentence);
    });

    return chosen.slice(0, 3);
  }

  function inferKindFromPath(path) {
    if (/\.pdf$/i.test(path)) return "pdf";
    if (/\.ipynb$/i.test(path)) return "notebook";
    if (/\.md$/i.test(path)) return "markdown";
    if (/\.tex$/i.test(path)) return "latex";
    if (/\.html$/i.test(path)) return "page";
    return "file";
  }

  function makeSourceEntry(path, title, locator, pageStart, ref) {
    var isDocsPage = path.indexOf("docs/") === 0 && /\.html$/i.test(path);
    var url;
    var openIn = "blank";
    var entry;
    var openKey = path + (locator ? "::" + locator : "");

    if (isDocsPage) {
      url = "./" + path.replace(/^docs\//, "");
      openIn = "self";
    } else {
      url = "../" + path;
    }

    if (/\.pdf$/i.test(path) && pageStart) {
      url += "#page=" + pageStart;
    }

    entry = {
      title: (ref ? "[" + ref + "] " : "") + (title || path.split("/").slice(-1)[0]),
      path: path,
      locator: locator || "",
      openKey: openKey,
      url: url,
      kind: inferKindFromPath(path),
      group: "Source",
      description: "Local retrieval source.",
      aliases: [],
      openIn: openIn,
      priority: 120
    };

    entry._titleNorm = normalize(entry.title);
    entry._pathNorm = normalize(entry.path);
    entry._aliasNorm = "";
    entry._aliasesNormList = [];
    entry._descriptionNorm = normalize(entry.description);
    entry._searchNorm = normalize(entry.title + " " + entry.path + " " + entry.description);
    state.entryMap[openKey] = entry;
    if (!state.entryMap[path]) state.entryMap[path] = entry;
    return entry;
  }

  function sourceEntriesFromAnswerItems(items, matches) {
    var seen = {};
    var entries = [];

    items.forEach(function (item, index) {
      var chunk = item.chunk;
      var key = chunk.path + "::" + chunkLocator(chunk);
      if (seen[key]) return;
      seen[key] = true;
      entries.push(
        makeSourceEntry(
          chunk.path,
          chunk.title,
          chunkLocator(chunk),
          chunk.page_start,
          index + 1
        )
      );
    });

    matches.forEach(function (chunk) {
      var key = chunk.path + "::" + chunkLocator(chunk);
      if (seen[key] || entries.length >= 5) return;
      seen[key] = true;
      entries.push(
        makeSourceEntry(
          chunk.path,
          chunk.title,
          chunkLocator(chunk),
          chunk.page_start,
          null
        )
      );
    });

    return entries.slice(0, 5);
  }

  function answerQuestion(question) {
    var parsed = parseScopedQuestion(question);
    var baseQuestion = parsed.query;
    var followUp = isFollowUpQuestion(normalize(baseQuestion));
    var effectiveScope = parsed.scope || (followUp ? state.lastScope : null);
    var resolvedQuestion = resolveQuestionWithContext(baseQuestion);

    if (!baseQuestion) {
      appendWarning("Add a question after the source filter.");
      return;
    }

    loadQaIndex()
      .then(function () {
        var matches = retrieveQaMatches(resolvedQuestion, 5, effectiveScope);
        var items;
        var sources;

        if (!matches.length) {
          if (effectiveScope) {
            appendWarning('No grounded local answer in ' + effectiveScope.label + ' for "' + baseQuestion + '".');
          } else {
            appendWarning('No grounded local answer for "' + baseQuestion + '".');
          }
          appendSystem("Try a narrower question or use find <topic>.");
          return;
        }

        items = buildAnswerItems(matches, baseQuestion);
        if (!items.length) {
          items = selectAnswerLines(matches, baseQuestion).map(function (line, index) {
            return {
              kind: "summary",
              text: line,
              chunk: matches[index] || matches[0]
            };
          });
        }
        sources = sourceEntriesFromAnswerItems(items, matches);

        if (resolvedQuestion !== baseQuestion) {
          appendSystem('Using context from "' + state.lastQuestion + '".');
        }
        if (effectiveScope) {
          appendSystem("Source filter: " + effectiveScope.label + ".");
        }

        appendSystem("Local answer from your repo:");
        items.forEach(function (item, index) {
          var prefix = item.kind === "equation" ? "Key relation: " : "";
          appendSystem("  [" + (index + 1) + "] " + prefix + item.text);
        });

        state.lastQuestion = baseQuestion;
        state.lastResolvedQuestion = resolvedQuestion;
        state.lastScope = effectiveScope;

        if (sources.length) {
          showResults(
            'Sources for "' + baseQuestion + '".',
            sources,
            effectiveScope
              ? "Grounded in local " + effectiveScope.label.toLowerCase() + " sources."
              : "Grounded in local notes, notebooks, slides, and repo text."
          );
        }
      })
      .catch(function () {
        appendWarning("Local retrieval is unavailable right now.");
      });
  }

  function isFollowUpQuestion(normalizedQuestion) {
    return /^(and|also|what about|how about|why|when|where|compare|same for|same with|does that|does it|can it|can you expand|go deeper|more on)\b/.test(normalizedQuestion);
  }

  function resolveQuestionWithContext(question) {
    var normalizedQuestion = normalize(question);
    if (!state.lastResolvedQuestion) return question;
    if (!isFollowUpQuestion(normalizedQuestion)) return question;
    return state.lastResolvedQuestion + " " + question;
  }

  function showContext() {
    if (!state.lastQuestion) {
      appendSystem("No active question context.");
      return;
    }
    appendSystem('Current context: "' + state.lastQuestion + '"');
  }

  function clearContext() {
    state.lastQuestion = "";
    state.lastResolvedQuestion = "";
    state.lastScope = null;
    appendSystem("Question context cleared.");
  }

  function startsWithAny(normalized, candidates) {
    return candidates.some(function (candidate) {
      return normalized === candidate || normalized.indexOf(candidate + " ") === 0;
    });
  }

  function handleSmallTalk(raw, normalized) {
    var greetingTerms = [
      "hi",
      "hello",
      "hey",
      "hola",
      "buenas",
      "good morning",
      "good afternoon",
      "good evening"
    ];
    var thanksTerms = ["thanks", "thank you", "gracias", "thx"];
    var byeTerms = ["bye", "goodbye", "see you", "nos vemos"];
    var statusTerms = [
      "how are you",
      "how you doing",
      "how are you doing",
      "como estas",
      "como esta",
      "que tal"
    ];

    if (startsWithAny(normalized, greetingTerms)) {
      if (normalized.indexOf("back") !== -1) {
        appendSystem("Hello back. Maxwell online and ready.");
      } else if (normalized.indexOf("maxwell") !== -1) {
        appendSystem("Hello. Maxwell online. Ask for a page, note, notebook, or file.");
      } else if (normalized === "hola" || normalized === "buenas") {
        appendSystem("Hola. Maxwell en linea. Pide una pagina, nota, notebook o archivo.");
      } else {
        appendSystem("Hello. Maxwell online. Ask me to open a page or find a file.");
      }
      return true;
    }

    if (startsWithAny(normalized, thanksTerms)) {
      appendSystem("You're welcome. Ask for help, pages, notes, or a direct search when ready.");
      return true;
    }

    if (startsWithAny(normalized, byeTerms)) {
      appendSystem("See you. Use close if you want to hide the terminal.");
      return true;
    }

    if (statusTerms.some(function (term) { return normalized.indexOf(term) !== -1; })) {
      appendSystem("Running normally. Repo index stable and ready.");
      return true;
    }

    if (
      normalized === "who are you" ||
      normalized === "what are you" ||
      normalized === "quien eres"
    ) {
      appendSystem("I am Maxwell, the repo terminal for pages, notes, notebooks, and files.");
      return true;
    }

    if (
      normalized === "what can you do" ||
      normalized === "what do you do" ||
      normalized === "que puedes hacer"
    ) {
      appendSystem("I can answer from local repo sources, show topic study paths, coach problems step by step, check your setup, step through hint ladders, search the repo, and open matches.");
      appendSystem("Try: coach griffiths 3.8, first step, common mistakes, check my approach I will place the image charge first, or from jackson boundary conditions.");
      return true;
    }

    if (normalized === "nice" || normalized === "cool" || normalized === "great") {
      appendSystem("Ready for the next command.");
      return true;
    }

    return false;
  }

  function tryOpenQuery(query) {
    var ordinalMatch = getResultByOrdinal(query);
    var builtInRoute = resolveBuiltInRoute(query);
    var fuzzyRoute;
    var fuzzyResults;
    if (ordinalMatch) {
      openEntry(ordinalMatch);
      return;
    }

    if (builtInRoute) {
      openEntry(builtInRoute);
      return;
    }

    var results = searchEntries(query, 8);
    if (!results.length) {
      fuzzyRoute = resolveFuzzyBuiltInRoute(query);
      if (fuzzyRoute) {
        appendSystem("Assuming you meant \"" + fuzzyRoute.title + "\".");
        openEntry(fuzzyRoute);
        return;
      }

      fuzzyResults = fuzzySearchEntries(query, 8);
      if (!fuzzyResults.length) {
        appendWarning("No repo match for \"" + query + "\".");
        return;
      }

      if (hasConfidentFuzzyWinner(fuzzyResults)) {
        appendSystem("Assuming you meant \"" + fuzzyResults[0].title + "\".");
        openEntry(fuzzyResults[0]);
        return;
      }

      showResults(
        "Closest matches for \"" + query + "\".",
        fuzzyResults,
        "No exact repo match. Use open 1, open 2, or click a result."
      );
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

    showResults(
      "Multiple matches for \"" + query + "\".",
      results,
      "Use open 1, open 2, or click a result."
    );
  }

  function scoreTopicEntry(entry, mode, topic) {
    var score = entry.priority + 20;
    var normalizedPath = normalizePath(entry.path);

    if (entry._primaryTopic === topic.id) score += 50;
    if ((entry._topics || []).indexOf(topic.id) !== -1) score += 30;
    if (topic._studyPaths.indexOf(normalizedPath) !== -1) score += mode === "study" ? 140 : 45;
    if (topic._reviewPaths.indexOf(normalizedPath) !== -1) score += mode === "review" ? 160 : 40;

    if (mode === "study") {
      if (entry.kind === "page") score += 55;
      if (isNote(entry)) score += 46;
      if (entry.kind === "notebook") score += 38;
      if (isProblem(entry)) score += 22;
      if (isFormula(entry)) score += 26;
      if (isVisual(entry)) score += 20;
    } else if (mode === "review") {
      if (isFormula(entry)) score += 95;
      if (isProblem(entry)) score += 78;
      if (isNote(entry)) score += 36;
      if (entry.kind === "pdf") score += 28;
      if (entry.kind === "page") score += 16;
      if (isVisual(entry)) score -= 8;
    } else {
      if (entry.kind === "page") score += 34;
      if (isNote(entry)) score += 26;
      if (entry.kind === "notebook") score += 24;
      if (isFormula(entry)) score += 20;
      if (isProblem(entry)) score += 18;
      if (isVisual(entry)) score += 18;
    }

    if (topic.id === "visuals") {
      if (isVisual(entry)) score += 70;
      if (entry.kind === "image") score += 20;
    }

    if (topic.id === "repo") {
      if (entry.group === "Website") score += 45;
      if (entry.path === "README.md") score += 30;
    }

    if (isOverleaf(entry)) score -= 60;
    return score;
  }

  function rankTopicEntries(topic, mode) {
    var seen = {};
    return state.entries
      .filter(function (entry) {
        return (entry._topics || []).indexOf(topic.id) !== -1;
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
      })
      .filter(function (item) {
        var key = normalize(item.entry.title + " " + item.entry.path);
        if (seen[key]) return false;
        seen[key] = true;
        item.entry._score = item.score;
        return true;
      })
      .map(function (item) { return item.entry; })
      .slice(0, 8);
  }

  function showTopicCatalog() {
    var counts = topicCounts();
    var available = state.topicList
      .map(function (topic) {
        return { topic: topic, count: counts[topic.id] || 0 };
      })
      .filter(function (item) { return item.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });

    if (!available.length) {
      appendWarning("No topic manifest data is available yet.");
      return;
    }

    appendSystem("Available topics:");
    available.forEach(function (item) {
      appendSystem("  " + item.topic.label + " (" + item.count + ")");
    });
    appendSystem("Use: topic <name>, study <name>, review <name>, or hint <name>.");
  }

  function showTopicView(topic, mode) {
    var results = rankTopicEntries(topic, mode);
    var titleMap = {
      topic: topic.label + " resources",
      study: "Study path for " + topic.label,
      review: "Review stack for " + topic.label
    };
    var hintMap = {
      topic: topic.intro,
      study: "Start with notes and pages, then notebooks, then problems and formula sheets.",
      review: "Prioritizing compact references, formula sheets, and problem material."
    };

    if (!results.length) {
      appendWarning("No indexed files found for " + topic.label + ".");
      return;
    }

    showResults(titleMap[mode], results, hintMap[mode]);
  }

  function showHintCatalog() {
    var hintTopics = state.topicList.filter(function (topic) {
      return topic.hints && topic.hints.length;
    });

    if (!hintTopics.length) {
      appendWarning("No hint ladders are loaded.");
      return;
    }

    appendSystem("Hint ladders:");
    hintTopics.forEach(function (topic) {
      appendSystem("  " + topic.label + " (" + topic.hints.length + " steps)");
    });
    appendSystem("Use hint <topic>, hint next, hint back, or hint reset.");
  }

  function showHintStep(topic, step) {
    var total = (topic.hints || []).length;
    var clampedStep = Math.max(0, Math.min(step, total - 1));
    var topResults;

    if (!total) {
      appendWarning("No hint ladder exists for " + topic.label + ".");
      return;
    }

    state.activeHintTopicId = topic.id;
    state.activeHintStep = clampedStep;

    appendSystem("Hint ladder for " + topic.label + " (" + (clampedStep + 1) + "/" + total + ").");
    appendSystem("  " + topic.hints[clampedStep]);
    appendSystem("Use hint next, hint back, or hint reset.");

    if (clampedStep === 0) {
      topResults = rankTopicEntries(topic, "review").slice(0, 3);
      if (topResults.length) {
        showResults(
          "Helpful sources for " + topic.label + ".",
          topResults,
          "Use these only as guidance. The hint ladder stays non-spoiler."
        );
      }
    }
  }

  function handleHintCommand(argument) {
    var value = String(argument || "").trim();
    var normalizedValue = normalize(value);
    var activeTopic = getTopic(state.activeHintTopicId);
    var activeCoach = state.activeCoach;

    if (
      activeCoach &&
      (
        !value ||
        normalizedValue === "list" ||
        normalizedValue === "next" ||
        normalizedValue === "more" ||
        normalizedValue === "back" ||
        normalizedValue === "prev" ||
        normalizedValue === "previous" ||
        normalizedValue === "reset"
      )
    ) {
      if (!value || normalizedValue === "list") {
        showCoachHintStep(activeCoach.hintStep || 0);
        return;
      }
      if (normalizedValue === "next" || normalizedValue === "more") {
        showCoachHintStep((activeCoach.hintStep || 0) + 1);
        return;
      }
      if (normalizedValue === "back" || normalizedValue === "prev" || normalizedValue === "previous") {
        showCoachHintStep((activeCoach.hintStep || 0) - 1);
        return;
      }
      if (normalizedValue === "reset") {
        showCoachHintStep(0);
        return;
      }
    }

    if (!value || normalizedValue === "list") {
      if (activeTopic) {
        showHintStep(activeTopic, state.activeHintStep);
      } else {
        showHintCatalog();
      }
      return;
    }

    if (normalizedValue === "next" || normalizedValue === "more") {
      if (!activeTopic) {
        appendWarning("No active hint ladder. Use hint <topic> first.");
        return;
      }
      showHintStep(activeTopic, state.activeHintStep + 1);
      return;
    }

    if (normalizedValue === "back" || normalizedValue === "prev" || normalizedValue === "previous") {
      if (!activeTopic) {
        appendWarning("No active hint ladder. Use hint <topic> first.");
        return;
      }
      showHintStep(activeTopic, state.activeHintStep - 1);
      return;
    }

    if (normalizedValue === "reset") {
      if (!activeTopic) {
        appendWarning("No active hint ladder. Use hint <topic> first.");
        return;
      }
      showHintStep(activeTopic, 0);
      return;
    }

    var topic = resolveTopic(value);
    if (!topic) {
      appendWarning('Unknown hint topic "' + value + '".');
      return;
    }
    showHintStep(topic, 0);
  }

  function scoreCoachProblem(problem, query) {
    var rawQuery = String(query || "").trim();
    var normalizedQuery = normalize(rawQuery);
    var explicitId = rawQuery.match(/(\d+\.\d+)/);
    var score = 0;
    var matched = 0;

    if (!normalizedQuery) return 0;
    if (explicitId && explicitId[1] === problem.problem_id) score += 400;
    if (problem._idNorm === normalizedQuery) score += 350;
    if (problem._titleNorm === normalizedQuery) score += 300;
    if (problem._searchNorm.indexOf(normalizedQuery) !== -1) score += 100;

    tokenizeQuestion(rawQuery).forEach(function (token) {
      var tokenMatched = false;
      if (problem._idNorm.indexOf(token) !== -1) {
        score += 120;
        tokenMatched = true;
      }
      if (problem._titleNorm.indexOf(token) !== -1) {
        score += 40;
        tokenMatched = true;
      }
      if (problem._chapterNorm.indexOf(token) !== -1) {
        score += 24;
        tokenMatched = true;
      }
      if (problem._statementNorm.indexOf(token) !== -1) {
        score += 18;
        tokenMatched = true;
      }
      if (problem._topicNorm.indexOf(token) !== -1) {
        score += 12;
        tokenMatched = true;
      }
      if (tokenMatched) matched += 1;
    });

    if (!score && !matched) return 0;
    return score;
  }

  function resolveCoachProblem(query) {
    var results = state.coachProblems
      .map(function (problem) {
        return {
          problem: problem,
          score: scoreCoachProblem(problem, query)
        };
      })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    return results.length ? results[0].problem : null;
  }

  function methodHintFromTopic(problem, topic) {
    var statement = String(problem.statement || "").toLowerCase();
    if (topic && topic.id === "method-of-images") {
      return "Choose the image configuration first, then verify the conducting boundary before computing any force or charge density.";
    }
    if (topic && topic.id === "green-functions") {
      return "Identify the operator, the source term, and the boundary condition before writing the Green-function representation.";
    }
    if (topic && topic.id === "laplace") {
      return "This is mainly a boundary-value problem: solve the source-free equation in the right coordinates and kill terms that violate the region geometry.";
    }
    if (topic && topic.id === "poisson") {
      return "Write the source cleanly, solve for the potential with the stated boundary conditions, and only then differentiate if the field is requested.";
    }
    if (topic && topic.id === "multipole") {
      return "Decide which moment is the first nonzero one at the chosen origin before expanding further.";
    }
    if (topic && topic.id === "dielectrics") {
      return "Separate free charge, bound charge, and boundary conditions before choosing whether to work with E, V, D, or P.";
    }
    if (topic && topic.id === "magnetostatics") {
      return "Choose the cleanest route among Biot-Savart, Ampere's law, vector potential, or magnetization currents before calculating.";
    }
    if (topic && topic.id === "radiation") {
      return "Separate near-field intuition from propagation or conservation-law structure before deciding what to compute.";
    }
    if (/force|work|energy|torque|flux/.test(statement)) {
      return "Solve the field or potential first; the requested force, work, torque, or flux should come only after the field description is under control.";
    }
    return "Start by classifying the geometry, the unknown, and the governing equation before writing any algebra.";
  }

  function buildCoachStrategy(problem, topic) {
    var strategy = [];
    strategy.push("Map the geometry and state exactly what the unknown is: field, potential, induced charge, force, energy, or flux.");
    strategy.push(methodHintFromTopic(problem, topic));
    strategy.push("Write the boundary conditions or symmetry constraints explicitly before solving.");
    strategy.push("Once the intermediate field or potential is known, extract only the final quantity requested and check limiting behavior.");
    return strategy;
  }

  function buildCoachHints(problem, topic) {
    var hints = [];
    hints.push("Do not compute yet. Sketch the geometry and label the source points, observation points, conductors, and symmetry axes.");
    hints.push(methodHintFromTopic(problem, topic));
    hints.push("Write down the exact boundary condition or constitutive relation that makes this problem different from a free-space calculation.");
    hints.push("After the main field or potential is found, use that result to compute the requested derived quantity and check units or limits.");
    return hints;
  }

  function buildCoachFirstStep(problem, topic) {
    var statement = String(problem.statement || "").toLowerCase();
    if (topic && topic.id === "method-of-images") {
      return "Start by drawing the real source, the conductor, and the image configuration you expect to enforce the boundary condition.";
    }
    if (topic && topic.id === "green-functions") {
      return "Start by identifying the differential operator, the source term, and the boundary condition the Green function must satisfy.";
    }
    if (topic && topic.id === "laplace") {
      return "Start by writing the source-free equation in the coordinate system adapted to the geometry and listing the boundary data.";
    }
    if (topic && topic.id === "poisson") {
      return "Start by writing the source density and the exact Poisson equation, together with the region and boundary conditions.";
    }
    if (topic && topic.id === "multipole") {
      return "Start by choosing the expansion origin and deciding which multipole moment could be the first nonzero one.";
    }
    if (topic && topic.id === "dielectrics") {
      return "Start by separating free charge, bound charge, and the interface conditions before deciding whether to use E, V, D, or P.";
    }
    if (topic && topic.id === "magnetostatics") {
      return "Start by deciding whether symmetry suggests Ampere's law, Biot-Savart, or a bound-current description.";
    }
    if (/force|work|energy|torque/.test(statement)) {
      return "Start by identifying the intermediate field or potential you need before trying to compute the requested force, work, energy, or torque.";
    }
    return "Start by sketching the geometry and stating the unknown quantity and governing equation explicitly.";
  }

  function buildCoachMistakes(problem, topic) {
    var statement = String(problem.statement || "").toLowerCase();
    var mistakes = [
      "Jumping into algebra before the geometry, unknown, and boundary conditions are fully labeled.",
      "Using a convenient formula without first checking that its symmetry assumptions actually hold.",
      "Skipping a limiting-case or units check after the final expression is obtained."
    ];

    if (topic && topic.id === "method-of-images") {
      mistakes = [
        "Placing image charges inside the physical region instead of outside it.",
        "Using image charges to compute the field but never checking the conductor boundary condition explicitly.",
        "Forgetting that forces are computed on real charges only; image charges are mathematical devices, not physical sources."
      ];
    } else if (topic && topic.id === "poisson") {
      mistakes = [
        "Treating Poisson's equation alone as enough to determine the solution without boundary data.",
        "Dropping the source term too early and accidentally solving Laplace's equation instead.",
        "Differentiating for the field before the potential solution is consistent across all regions."
      ];
    } else if (topic && topic.id === "laplace") {
      mistakes = [
        "Keeping separated solutions that violate regularity or blow up in the region of interest.",
        "Applying the wrong boundary condition on a conducting surface or symmetry plane.",
        "Forgetting that uniqueness is the main check on whether the final form is physically acceptable."
      ];
    } else if (topic && topic.id === "multipole") {
      mistakes = [
        "Expanding about a bad origin and creating unnecessary lower multipole terms.",
        "Keeping more terms than needed before identifying the first nonzero moment.",
        "Using a far-field expansion outside its regime of validity."
      ];
    } else if (topic && topic.id === "dielectrics") {
      mistakes = [
        "Mixing free charge and bound charge into one undifferentiated source term.",
        "Applying boundary conditions to the wrong field component at an interface.",
        "Using D, E, and P interchangeably without fixing which quantity is primary in the problem."
      ];
    } else if (topic && topic.id === "magnetostatics") {
      mistakes = [
        "Starting from Biot-Savart when symmetry would make Ampere's law much cleaner.",
        "Ignoring bound currents or magnetization when matter is present.",
        "Computing a final force or energy before the magnetic field structure is pinned down."
      ];
    } else if (topic && topic.id === "radiation") {
      mistakes = [
        "Mixing near-field intuition with radiation-zone approximations.",
        "Ignoring time dependence when the problem is really about induction or propagation.",
        "Using conservation-law formulas without first identifying the relevant fields and region."
      ];
    } else if (/surface charge density|induced/.test(statement)) {
      mistakes[1] = "Forgetting to compute the field derivative normal to the surface when the problem asks for induced charge density.";
    }

    return mistakes;
  }

  function coachApproachSignals(text, problem, topic) {
    var normalizedText = normalize(text);
    var positives = [];
    var cautions = [];
    var score = 0;

    function hasAny(words) {
      return words.some(function (word) {
        return normalizedText.indexOf(normalize(word)) !== -1;
      });
    }

    if (hasAny(["geometry", "sketch", "draw", "region", "boundary", "boundary condition", "symmetry"])) {
      positives.push("You are grounding the setup in geometry or boundary conditions, which is usually the right opening move.");
      score += 2;
    }

    if (hasAny(["potential", "field", "image", "green function", "gauss", "ampere", "biot savart", "laplace", "poisson"])) {
      positives.push("You are naming a governing method or intermediate quantity rather than jumping directly to the final numeric target.");
      score += 2;
    }

    if (hasAny(["force", "energy", "work", "torque"]) && !hasAny(["potential", "field", "image", "boundary", "symmetry"])) {
      cautions.push("You are aiming at the final derived quantity immediately; first pin down the field or potential structure that produces it.");
      score -= 2;
    }

    if (topic && topic.id === "method-of-images") {
      if (hasAny(["image", "conducting", "grounded", "boundary"])) {
        positives.push("That is consistent with an image-charge setup.");
        score += 2;
      } else {
        cautions.push("For a method-of-images problem, your plan should explicitly mention the image configuration or the conductor boundary.");
        score -= 2;
      }
      if (hasAny(["gauss"])) {
        cautions.push("Gauss's law may help with checks, but it is usually not the main engine in an image-charge boundary problem.");
        score -= 1;
      }
    }

    if (topic && topic.id === "poisson" && !hasAny(["rho", "source", "charge density", "boundary", "poisson"])) {
      cautions.push("For a Poisson problem, say what the source is and what boundary data close the problem.");
      score -= 1;
    }

    if (topic && topic.id === "laplace" && hasAny(["charge density", "rho"]) && !hasAny(["source free", "laplace", "boundary"])) {
      cautions.push("Be careful: Laplace problems are source-free in the region being solved.");
      score -= 1;
    }

    if (topic && topic.id === "multipole" && !hasAny(["origin", "dipole", "quadrupole", "first nonzero"])) {
      cautions.push("For a multipole problem, your plan should mention the expansion origin and the first nonzero moment.");
      score -= 1;
    }

    if (topic && topic.id === "dielectrics" && !hasAny(["free charge", "bound charge", "d field", "polarization", "interface"])) {
      cautions.push("For dielectrics, separate free and bound effects or mention the interface conditions explicitly.");
      score -= 1;
    }

    if (topic && topic.id === "magnetostatics" && hasAny(["electric potential", "coulomb"])) {
      cautions.push("That sounds like an electrostatics tool for a magnetic problem; check that your method matches the chapter physics.");
      score -= 1;
    }

    return {
      score: score,
      positives: positives,
      cautions: cautions
    };
  }

  function collectEquationItems(matches, limit) {
    var seen = {};
    var items = [];

    matches.forEach(function (chunk) {
      String(chunk.text || "")
        .split(/\n+/)
        .forEach(function (line) {
          var cleaned = normalizeAnswerText(line);
          var key = normalize(cleaned);
          if (!cleaned || cleaned.length < 10 || cleaned.length > 220) return;
          if (seen[key]) return;
          if (!/(=|\\nabla|∇|int|oint|sum|epsilon|varepsilon|rho|phi|mathbf|partial|delta)/i.test(cleaned)) return;
          seen[key] = true;
          items.push({
            text: cleaned,
            chunk: chunk
          });
        });
    });

    return items.slice(0, limit || 4);
  }

  function fallbackCoachEquations(problem, topic) {
    var topicId = topic ? topic.id : "";
    var map = {
      "vector-analysis": [
        "Use the relevant differential operator directly: gradient, divergence, curl, or Laplacian.",
        "Apply the corresponding integral theorem only after the geometry and orientation are fixed."
      ],
      "electrostatics": [
        "Coulomb/Gauss route: ∇·E = rho/epsilon_0,  ∇×E = 0.",
        "Potential route: E = -∇V."
      ],
      "poisson": [
        "Poisson equation: ∇^2 V = -rho/epsilon_0.",
        "Electric field from potential: E = -∇V."
      ],
      "laplace": [
        "Laplace equation: ∇^2 V = 0.",
        "Use the coordinate system adapted to the boundary geometry."
      ],
      "method-of-images": [
        "Superpose the real source with image sources so that the boundary condition is satisfied exactly.",
        "If surface charge is requested, use sigma = -epsilon_0 (∂V/∂n)_outside on the conductor."
      ],
      "green-functions": [
        "Green-function structure: solve the response to a point source with the correct boundary conditions.",
        "Build the full solution by superposition over the source distribution."
      ],
      "multipole": [
        "Far-field expansion: keep the first nonzero multipole moment.",
        "Choose the origin carefully before evaluating monopole, dipole, or higher moments."
      ],
      "dielectrics": [
        "Use D when free charge is the clean input and P when bound charge is the focus.",
        "Interface condition: n·(D2-D1) = sigma_f."
      ],
      "magnetostatics": [
        "Choose between Biot-Savart, Ampere's law, or bound-current methods.",
        "In matter, relate B, H, and M with the appropriate constitutive description."
      ],
      "radiation": [
        "Identify whether the question is about field transport, induction, energy, momentum, or radiation-zone behavior.",
        "Use Maxwell's equations plus the relevant conservation law or retarded-field structure."
      ]
    };

    return (map[topicId] || map.electrostatics).map(function (text) {
      return { text: text, chunk: null };
    });
  }

  function buildCoachEquations(problem, topic) {
    var query = problem.statement + " " + (topic ? topic.label : "");
    var matches = retrieveQaMatches(query, 8, null).filter(function (chunk) {
      return chunk.path !== problem.path;
    });
    var equations = collectEquationItems(matches, 3);

    if (!equations.length) {
      equations = fallbackCoachEquations(problem, topic);
    }

    return {
      equations: equations.slice(0, 3),
      matches: matches
    };
  }

  function buildCoachSourceEntries(problem, topic, matches) {
    var entries = [];
    var seen = {};

    function pushEntry(entry) {
      var key = entry.path + "::" + (entry.locator || "");
      if (seen[key]) return;
      seen[key] = true;
      entries.push(entry);
    }

    pushEntry(makeSourceEntry(problem.path, problem.title, problem.locator, null, 1));

    matches.slice(0, 2).forEach(function (chunk, index) {
      pushEntry(makeSourceEntry(chunk.path, chunk.title, chunkLocator(chunk), chunk.page_start, index + 2));
    });

    if (topic) {
      rankTopicEntries(topic, "review").slice(0, 2).forEach(function (entry) {
        pushEntry(entry);
      });
    }

    return entries.slice(0, 5);
  }

  function showCoachStrategy() {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }
    appendSystem("Strategy:");
    state.activeCoach.strategy.forEach(function (line, index) {
      appendSystem("  " + (index + 1) + ". " + line);
    });
  }

  function showCoachFirstStep() {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }
    appendSystem("First step:");
    appendSystem("  " + state.activeCoach.firstStep);
    appendSystem("After that, use strategy or hint next if you want a little more structure.");
  }

  function showCoachMistakes() {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }
    appendSystem("Common mistakes:");
    state.activeCoach.mistakes.forEach(function (line, index) {
      appendSystem("  " + (index + 1) + ". " + line);
    });
  }

  function showCoachEquations() {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }
    appendSystem("Key equations or relations:");
    state.activeCoach.equations.forEach(function (item, index) {
      appendSystem("  " + (index + 1) + ". " + item.text);
    });
  }

  function showCoachSources() {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }
    showResults(
      'Coach sources for "' + state.activeCoach.problem.title + '".',
      state.activeCoach.sources,
      "Statement first, then nearby notes and compact review sources."
    );
  }

  function showCoachHintStep(step) {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }

    var hints = state.activeCoach.hints || [];
    var total = hints.length;
    var clampedStep = Math.max(0, Math.min(step, total - 1));
    state.activeCoach.hintStep = clampedStep;
    appendSystem(
      "Problem hint for " +
      state.activeCoach.problem.title +
      " (" +
      (clampedStep + 1) +
      "/" +
      total +
      ")."
    );
    appendSystem("  " + hints[clampedStep]);
    appendSystem("Use hint next, hint back, strategy, equations, or sources.");
  }

  function checkCoachApproach(text) {
    if (!state.activeCoach) {
      appendWarning("No active coached problem. Use coach <problem> first.");
      return;
    }

    var approach = String(text || "").trim();
    var signals;

    if (!approach || normalize(approach).split(" ").length < 3) {
      appendWarning("Give me a short plan to check. Example: check my approach I will place the image charge first and enforce the boundary.");
      return;
    }

    signals = coachApproachSignals(approach, state.activeCoach.problem, state.activeCoach.topic);

    if (signals.score >= 3) {
      appendSystem("Approach check: strong direction.");
    } else if (signals.score >= 0) {
      appendSystem("Approach check: partly right, but tighten the setup.");
    } else {
      appendSystem("Approach check: needs adjustment before you compute.");
    }

    if (signals.positives.length) {
      signals.positives.slice(0, 2).forEach(function (line) {
        appendSystem("  Good: " + line);
      });
    }

    if (signals.cautions.length) {
      signals.cautions.slice(0, 3).forEach(function (line) {
        appendWarning("  Watch: " + line);
      });
    } else {
      appendSystem("  No major red flags from the plan you gave.");
    }

    appendSystem("I am checking method, not giving the full solution.");
  }

  function clearCoach() {
    state.activeCoach = null;
    appendSystem("Problem coach cleared.");
  }

  function handleCoachCommand(argument) {
    var query = String(argument || "").trim();

    if (normalize(query) === "clear") {
      clearCoach();
      return;
    }

    if (!query) {
      if (!state.activeCoach) {
        appendWarning("Use coach <problem>. Example: coach griffiths 3.8");
        return;
      }
      appendSystem("Current coached problem: " + state.activeCoach.problem.title + ".");
      showCoachStrategy();
      return;
    }

    Promise.all([loadCoachManifest(), loadTopicsManifest(), loadQaIndex()])
      .then(function () {
        var problem = resolveCoachProblem(query);
        var topic;
        var coachData;

        if (!problem) {
          appendWarning('No coached problem match for "' + query + '".');
          appendSystem("Try: coach 3.8, coach griffiths 5.12, or coach grounded conducting sphere.");
          return;
        }

        topic = getTopic(problem.topic_id);
        coachData = buildCoachEquations(problem, topic);

        state.activeCoach = {
          problem: problem,
          topic: topic,
          firstStep: buildCoachFirstStep(problem, topic),
          strategy: buildCoachStrategy(problem, topic),
          equations: coachData.equations,
          mistakes: buildCoachMistakes(problem, topic),
          hints: buildCoachHints(problem, topic),
          hintStep: 0,
          sources: buildCoachSourceEntries(problem, topic, coachData.matches)
        };

        appendSystem("Coach mode: " + problem.title + ".");
        appendSystem("Problem statement:");
        appendSystem("  " + problem.statement);
        if (topic) {
          appendSystem("Topic: " + topic.label + ".");
        }
        showCoachFirstStep();
        showCoachStrategy();
        showCoachEquations();
        appendSystem("Use first step, common mistakes, check my approach <text>, hint next, strategy, equations, sources, or coach clear.");
      })
      .catch(function () {
        appendWarning("Problem coach is unavailable right now.");
      });
  }

  function clearConsole() {
    logNode.innerHTML = "";
    appendSystem("Console cleared. Maxwell standing by.");
  }

  function showHelp() {
    var lines = [
      "Commands:",
      "hello | hi | hey | hola",
      "help",
      "topics | topic <name>",
      "study <name> | review <name>",
      "coach <problem> | coach clear",
      "first step | strategy | equations | sources",
      "common mistakes | check my approach <text>",
      "hint <name> | hint next | hint reset",
      "ask <question>",
      "from <source> <question>",
      "context | clear context",
      "pages | notes | notebooks | problems | formula | scripts",
      "find <query>",
      "open <query>",
      "open 1  (after a search)",
      "clear | close"
    ];
    lines.forEach(function (line, index) {
      appendSystem(index === 0 ? line : "  " + line);
    });
  }

  function bootConsole() {
    if (state.booted) return;
    state.booted = true;

    appendSystem("MAXWELL terminal online.");
    if (state.count) {
      appendSystem("Indexed " + state.count + " files in " + state.context + " mode.");
    } else {
      appendSystem("Repository index still loading...");
    }
    appendSystem("Try: coach griffiths 3.8, first step, common mistakes, or ask what is Laplace's equation.");
  }

  function executeCommand(rawValue, fromShortcut) {
    var raw = String(rawValue || "").trim();
    if (!raw) return;

    if (!fromShortcut) appendUser(raw);

    var normalized = normalize(raw);
    var askMatch = raw.match(/^(ask|explain)\s+(.+)$/i);
    var openMatch = normalized.match(/^(open|go|read)\s+(.+)$/);
    var findMatch = normalized.match(/^(find|search)\s+(.+)$/);
    var listMatch = normalized.match(/^list\s+(.+)$/);
    var topicMatch = normalized.match(/^topic\s+(.+)$/);
    var studyMatch = normalized.match(/^study\s+(.+)$/);
    var reviewMatch = normalized.match(/^review\s+(.+)$/);
    var coachMatch = raw.match(/^coach(?:\s+(.+))?$/i);
    var hintMatch = raw.match(/^hint(?:\s+(.+))?$/i);
    var checkApproachMatch = raw.match(/^(?:check my approach|check this approach|my approach is|does this make sense|is this approach ok(?:ay)?)(?:\s*[:,-]?\s*)(.+)$/i);

    if (handleSmallTalk(raw, normalized)) {
      return;
    }

    if (askMatch) {
      answerQuestion(askMatch[2].trim());
      return;
    }

    if (/^from\s+/i.test(raw)) {
      answerQuestion(raw);
      return;
    }

    var correctedCommand = rewriteApproximateCommand(normalized);
    if (correctedCommand) {
      appendSystem("Assuming you meant \"" + correctedCommand + "\".");
      executeCommand(correctedCommand, true);
      return;
    }

    if (normalized === "help") {
      showHelp();
      return;
    }

    if (normalized === "topics") {
      showTopicCatalog();
      return;
    }

    if (topicMatch) {
      var topic = resolveTopic(topicMatch[1]);
      if (!topic) {
        appendWarning('Unknown topic "' + topicMatch[1] + '".');
        return;
      }
      showTopicView(topic, "topic");
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

    if (coachMatch) {
      handleCoachCommand(coachMatch[1] || "");
      return;
    }

    if (
      normalized === "first step" ||
      normalized === "what should i solve first" ||
      normalized === "what should i do first" ||
      normalized === "where should i start" ||
      normalized === "how should i start" ||
      normalized === "start me"
    ) {
      showCoachFirstStep();
      return;
    }

    if (
      normalized === "common mistakes" ||
      normalized === "common mistake" ||
      normalized === "mistakes"
    ) {
      showCoachMistakes();
      return;
    }

    if (checkApproachMatch) {
      checkCoachApproach(checkApproachMatch[1] || "");
      return;
    }

    if (normalized === "strategy") {
      showCoachStrategy();
      return;
    }

    if (normalized === "equations") {
      showCoachEquations();
      return;
    }

    if (normalized === "sources") {
      showCoachSources();
      return;
    }

    if (hintMatch) {
      handleHintCommand(hintMatch[1] || "");
      return;
    }

    if (normalized === "clear") {
      clearConsole();
      return;
    }

    if (normalized === "context") {
      showContext();
      return;
    }

    if (normalized === "clear context" || normalized === "reset context") {
      clearContext();
      return;
    }

    if (normalized === "close" || normalized === "exit") {
      setOpen(false);
      return;
    }

    if (normalized === "pages" || (listMatch && listMatch[1] === "pages")) {
      listEntries(
        "Internal pages",
        function (entry) {
          return entry.kind === "page" && entry.path.indexOf(state.context + "/") === 0;
        },
        "No internal pages found."
      );
      return;
    }

    if (normalized === "notes" || (listMatch && listMatch[1] === "notes")) {
      listEntries(
        "Notes and chapter material",
        function (entry) {
          return entry.path.indexOf("notes/") === 0 || entry.path.indexOf("notes-diego/") === 0;
        },
        "No note files found."
      );
      return;
    }

    if (normalized === "notebooks" || (listMatch && listMatch[1] === "notebooks")) {
      listEntries(
        "Notebooks",
        function (entry) {
          return entry.kind === "notebook";
        },
        "No notebooks found."
      );
      return;
    }

    if (normalized === "visuals" || (listMatch && listMatch[1] === "visuals")) {
      var visualsTopic = getTopic("visuals");
      if (visualsTopic) {
        showTopicView(visualsTopic, "topic");
      } else {
        appendWarning("Visual topic manifest is unavailable.");
      }
      return;
    }

    if (normalized === "problems" || (listMatch && listMatch[1] === "problems")) {
      listEntries(
        "Problem sets",
        function (entry) {
          return entry.path.indexOf("problems/") === 0;
        },
        "No problem sets found."
      );
      return;
    }

    if (
      normalized === "formula" ||
      normalized === "formulas" ||
      normalized === "formula sheets" ||
      (listMatch && (listMatch[1] === "formula" || listMatch[1] === "formulas" || listMatch[1] === "formula sheets"))
    ) {
      listEntries(
        "Formula sheets",
        function (entry) {
          return entry.path.indexOf("Formula Sheet/") === 0;
        },
        "No formula sheets found."
      );
      return;
    }

    if (normalized === "scripts" || (listMatch && listMatch[1] === "scripts")) {
      listEntries(
        "Scripts and code files",
        function (entry) {
          return entry.kind === "script";
        },
        "No scripts found."
      );
      return;
    }

    if (findMatch) {
      var searchResults = searchEntries(findMatch[2], 8);
      if (!searchResults.length) {
        var fuzzySearchResults = fuzzySearchEntries(findMatch[2], 8);
        if (fuzzySearchResults.length) {
          showResults(
            "Closest matches for \"" + findMatch[2] + "\".",
            fuzzySearchResults,
            "No exact repo match. Use open 1, open 2, or click a result."
          );
          return;
        }
        appendWarning("No repo match for \"" + findMatch[2] + "\".");
        return;
      }
      showResults(
        "Results for \"" + findMatch[2] + "\".",
        searchResults,
        "Use open 1, open 2, or click a result."
      );
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

    if (/\?$/.test(raw) || /^(what|why|how|where|when|explain|define)\b/i.test(raw)) {
      answerQuestion(raw);
      return;
    }

    var fallbackResults = searchEntries(raw, 8);
    if (!fallbackResults.length) {
      var fuzzyFallbackResults = fuzzySearchEntries(raw, 8);
      var commandSuggestion = findClosestLiteral(normalized, COMMAND_CANONICAL, allowedDistance(normalized));
      if (fuzzyFallbackResults.length) {
        showResults(
          "Closest matches for \"" + raw + "\".",
          fuzzyFallbackResults,
          "No exact repo match. Use open 1, open 2, or click a result."
        );
        return;
      }
      appendWarning("Unknown command or no matches for \"" + raw + "\".");
      if (commandSuggestion && normalize(commandSuggestion.value) !== normalized) {
        appendSystem("Did you mean \"" + commandSuggestion.value + "\"?");
        return;
      }
      appendSystem("Type help to see commands.");
      return;
    }

    showResults(
      "Closest matches for \"" + raw + "\".",
      fallbackResults,
      "Use open 1, open 2, or click a result."
    );
  }

  function prepareEntries(payload) {
    state.context = payload.context || state.context;
    state.count = payload.count || 0;
    state.entries = (payload.entries || []).map(function (entry) {
      decorateEntry(entry);
      state.entryMap[entry.path] = entry;
      return entry;
    });
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
    Promise.all([
      fetch("./repo-index.json").then(function (response) {
        if (!response.ok) throw new Error("Index fetch failed.");
        return response.json();
      }),
      loadTopicsManifest(),
      loadCoachManifest()
    ])
      .then(function (values) {
        var payload = values[0];
        prepareEntries(payload);
        appendSystem("Repository index synchronized. Indexed " + state.count + " files.");
        if (state.topicList.length) {
          appendSystem("Topic manifest ready. Loaded " + state.topicList.length + " topics.");
        }
        if (state.coachProblems.length) {
          appendSystem("Problem coach ready. Loaded " + state.coachProblems.length + " problems.");
        }
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

  shortcutButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var command = button.getAttribute("data-command");
      appendUser(command);
      executeCommand(command, true);
      input.focus();
    });
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

  logNode.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var openButton = target.closest("[data-open-path]");
    if (!openButton) return;
    var path = openButton.getAttribute("data-open-path");
    if (!path || !state.entryMap[path]) return;
    openEntry(state.entryMap[path]);
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

  loadIndex();
})();
