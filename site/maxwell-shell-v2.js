(function () {
  var body = document.body;
  if (!body) return;

  var state = {
    context: "docs",
    count: 0,
    entries: [],
    entryMap: {},
    qaChunks: [],
    qaReady: false,
    qaPromise: null,
    lastQuestion: "",
    lastResolvedQuestion: "",
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
    '        <input id="maxwellInput" class="maxwell-input" type="text" autocomplete="off" spellcheck="false" placeholder="ask what is the method of images, find notes, open 1">',
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

      var path = document.createElement("span");
      path.className = "maxwell-result__path";
      path.textContent = entry.path;

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
        .concat(entry._titleNorm.split(" ").filter(function (token) { return token.length >= 4; }))
        .concat(entry._aliasNorm.split(" ").filter(function (token) { return token.length >= 4; }))
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
    score += Math.max(0, 20 - Math.floor((chunk.text || "").length / 140));
    return score;
  }

  function retrieveQaMatches(question, limit) {
    var normalizedQuestion = normalize(question);
    var questionTokens = tokenizeQuestion(question);

    if (!normalizedQuestion) return [];

    return state.qaChunks
      .map(function (chunk) {
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

  function selectAnswerLines(matches, question) {
    var normalizedQuestion = normalize(question);
    var questionTokens = tokenizeQuestion(question);
    var chosen = [];
    var seen = {};

    matches.slice(0, 3).forEach(function (chunk) {
      var bestSentence = "";
      var bestScore = 0;

      splitSentences(chunk.text).forEach(function (sentence) {
        var normalizedSentence = normalize(sentence);
        var sentenceScore = 0;

        if (sentence.length < 50) return;
        if (normalizedSentence.indexOf(normalizedQuestion) !== -1) sentenceScore += 90;
        questionTokens.forEach(function (token) {
          if (normalizedSentence.indexOf(token) !== -1) sentenceScore += 12;
        });

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

  function makeSourceEntry(path, title) {
    var isDocsPage = path.indexOf("docs/") === 0 && /\.html$/i.test(path);
    var url;
    var openIn = "blank";
    var entry;

    if (isDocsPage) {
      url = "./" + path.replace(/^docs\//, "");
      openIn = "self";
    } else {
      url = "../" + path;
    }

    entry = {
      title: title || path.split("/").slice(-1)[0],
      path: path,
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
    state.entryMap[path] = entry;
    return entry;
  }

  function sourceEntriesFromMatches(matches) {
    var seen = {};
    return matches
      .map(function (chunk) {
        return state.entryMap[chunk.path] || makeSourceEntry(chunk.path, chunk.title);
      })
      .filter(function (entry) {
        if (!entry || seen[entry.path]) return false;
        seen[entry.path] = true;
        return true;
      })
      .slice(0, 5);
  }

  function answerQuestion(question) {
    var resolvedQuestion = resolveQuestionWithContext(question);

    loadQaIndex()
      .then(function () {
        var matches = retrieveQaMatches(resolvedQuestion, 5);
        var lines;
        var sources;

        if (!matches.length) {
          appendWarning("No grounded local answer for \"" + question + "\".");
          appendSystem("Try a narrower question or use find <topic>.");
          return;
        }

        lines = selectAnswerLines(matches, question);
        sources = sourceEntriesFromMatches(matches);

        if (resolvedQuestion !== question) {
          appendSystem('Using context from "' + state.lastQuestion + '".');
        }

        appendSystem("Local answer from your repo:");
        lines.forEach(function (line) {
          appendSystem("  " + line);
        });

        state.lastQuestion = question;
        state.lastResolvedQuestion = resolvedQuestion;

        if (sources.length) {
          showResults(
            "Sources for \"" + question + "\".",
            sources,
            "Grounded in local notes, notebooks, slides, and repo text."
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
      appendSystem("I can answer from local repo sources, list pages, notes, notebooks, formulas, scripts, search the repo, and open matches.");
      appendSystem("Try: ask what is the method of images, then ask and when does it work?");
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

  function clearConsole() {
    logNode.innerHTML = "";
    appendSystem("Console cleared. Maxwell standing by.");
  }

  function showHelp() {
    var lines = [
      "Commands:",
      "hello | hi | hey | hola",
      "help",
      "ask <question>",
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
    appendSystem("Try: ask what is the method of images, pages, notes, open lab");
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

    if (handleSmallTalk(raw, normalized)) {
      return;
    }

    if (askMatch) {
      answerQuestion(askMatch[2].trim());
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
      entry.priority = Number(entry.priority || 0);
      entry._titleNorm = normalize(entry.title);
      entry._pathNorm = normalize(entry.path);
      entry._aliasesNormList = (entry.aliases || []).map(function (alias) {
        return normalize(alias);
      });
      entry._aliasNorm = normalize((entry.aliases || []).join(" "));
      entry._descriptionNorm = normalize(entry.description || "");
      entry._searchNorm = normalize(
        [
          entry.title,
          entry.path,
          entry.kind,
          entry.group,
          entry.description,
          (entry.aliases || []).join(" ")
        ].join(" ")
      );
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
