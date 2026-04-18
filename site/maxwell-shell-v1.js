(function () {
  var body = document.body;
  if (!body) return;

  var state = {
    context: "docs",
    count: 0,
    entries: [],
    entryMap: {},
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
    '      <span class="maxwell-header__subtitle">repo navigator v1</span>',
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
    '        <input id="maxwellInput" class="maxwell-input" type="text" autocomplete="off" spellcheck="false" placeholder="find method of images, open notes, open 1">',
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

  function handleGreeting(normalized) {
    var helloSet = {
      hi: "Hello. Maxwell online. Ask me to open a page or find a file.",
      hello: "Hello. Maxwell online. Ask me to open a page or find a file.",
      hey: "Hello. Maxwell online. Try: open lab or find poisson.",
      hola: "Hola. Maxwell en linea. Prueba: open lab o find poisson.",
      buenas: "Hola. Maxwell en linea y listo para navegar el repositorio."
    };
    var statusSet = {
      "how are you": "Running normally. Repo index stable and ready.",
      "how you doing": "Running normally. Repo index stable and ready.",
      "how are you doing": "Running normally. Repo index stable and ready.",
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

    var results = searchEntries(query, 8);
    if (!results.length) {
      appendWarning("No repo match for \"" + query + "\".");
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
      "hello | hola",
      "help",
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
    appendSystem("Try: help, pages, notes, notebooks, open lab, find method of images");
  }

  function executeCommand(rawValue, fromShortcut) {
    var raw = String(rawValue || "").trim();
    if (!raw) return;

    if (!fromShortcut) appendUser(raw);

    var normalized = normalize(raw);
    var openMatch = normalized.match(/^(open|go|read)\s+(.+)$/);
    var findMatch = normalized.match(/^(find|search)\s+(.+)$/);
    var listMatch = normalized.match(/^list\s+(.+)$/);

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

    var fallbackResults = searchEntries(raw, 8);
    if (!fallbackResults.length) {
      appendWarning("Unknown command or no matches for \"" + raw + "\".");
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
