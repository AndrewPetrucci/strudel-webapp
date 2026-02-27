document.addEventListener('DOMContentLoaded', () => {
  console.log('Strudel embed page loaded');

  const replEl = document.getElementById('strudel-repl');
  const runBtn = document.getElementById('run-btn');
  const stopBtn = document.getElementById('stop-btn');
  const updateBtn = document.getElementById('update-btn');
  const palletButtonsContainer = document.querySelector('.pallet-buttons');

  /** Map of sample id -> { required, loaded }. Updated when code changes or samples load. Exposed as window.loadedSamplesMap. */
  const loadedSamplesMap = new Map();
  window.loadedSamplesMap = loadedSamplesMap;

  function getEditor() {
    return replEl?.editor ?? null;
  }

  /** Extract sample names from Strudel code (s("...") and .s("...") strings). */
  function extractSampleNames(code) {
    if (!code || typeof code !== 'string') return new Set();
    const names = new Set();
    // Match s("...") or s('...') or .s("...") – string may contain spaces, commas, colons, numbers
    const regex = /\.?s\s*\(\s*["']([^"']+)["']\s*\)/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      const content = m[1];
      content.split(/[\s,]+/).forEach((part) => {
        const name = part.trim();
        if (name) names.add(name);
      });
    }
    return names;
  }

  /** Sync loadedSamplesMap with required samples from current code; remove samples no longer required. */
  function checkSamples() {
    const editor = getEditor();
    const code = editor?.code ?? '';
    const required = extractSampleNames(code);

    // Remove samples no longer in code
    for (const key of loadedSamplesMap.keys()) {
      if (!required.has(key)) loadedSamplesMap.delete(key);
    }
    // Add new required samples (keep existing loaded state)
    required.forEach((name) => {
      if (!loadedSamplesMap.has(name)) {
        loadedSamplesMap.set(name, { required: true, loaded: false });
      } else {
        loadedSamplesMap.get(name).required = true;
      }
    });
    return loadedSamplesMap;
  }

  /** Call after Run/Update so we run check once the editor has the latest code. */
  function touchAndCheckSamples() {
    setTimeout(() => checkSamples(), 150);
  }

  function runPattern() {
    const editor = getEditor();
    if (!editor) return;
    editor.stop?.();
    if (editor.evaluate) editor.evaluate(true);
    touchAndCheckSamples();
  }

  function stopPattern() {
    const editor = getEditor();
    if (editor?.stop) editor.stop();
  }

  function updatePattern() {
    const editor = getEditor();
    if (editor?.evaluate) editor.evaluate();
    touchAndCheckSamples();
  }

  /**
   * Apply linter and restore cursor. Uses palletLogic.lintLeadingSpaces.
   */
  function applyLinterToEditor(useEndOfLine = false, cursorEndOfLineOffset = 0) {
    const editor = getEditor();
    const cm = editor?.editor;
    if (!cm?.state || !window.palletLogic) return;
    const code = cm.state.sliceDoc(0, cm.state.doc.length);
    const linted = window.palletLogic.lintLeadingSpaces(code);
    if (linted === code) return;
    const pos = cm.state.selection.main.head;
    const line = cm.state.doc.lineAt(pos);
    const lineNum = line.number - 1;
    const col = pos - line.from;
    const newLines = linted.split('\n');
    let newPos = 0;
    for (let i = 0; i < lineNum && i < newLines.length; i++) newPos += newLines[i].length + 1;
    const targetLine = newLines[lineNum];
    if (targetLine != null) {
      if (useEndOfLine) {
        const offset = Math.max(0, Number(cursorEndOfLineOffset) || 0);
        newPos += Math.max(0, targetLine.length - offset);
      } else {
        newPos += Math.min(col, targetLine.length);
      }
    }
    cm.dispatch({
      changes: { from: 0, to: code.length, insert: linted },
      selection: { anchor: newPos, head: newPos },
    });
  }

  /** Apply one palette row using the shared logic (palletLogic.applyPalletStep), then update the editor. */
  function applyPalletRowToEditor(row) {
    const editor = getEditor();
    const cm = editor?.editor;
    if (!cm?.state || !window.palletLogic) return;
    const code = cm.state.sliceDoc(0, cm.state.doc.length);
    const { from, to, head } = cm.state.selection.main;
    const state = window.palletLogic.applyPalletStep(
      { code, cursor: head, from, to },
      row
    );
    cm.dispatch({
      changes: { from: 0, to: code.length, insert: state.code },
      selection: { anchor: state.cursor, head: state.cursor },
    });
  }

  function selectAllInEditor() {
    if (!replEl) return;
    replEl.focus();
    setTimeout(() => {
      const ev = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
      });
      replEl.dispatchEvent(ev);
    }, 0);
  }

  // When Strudel logs "[sampler] load sound "id"... done!", mark that sample as loaded
  const origLog = console.log;
  console.log = function (...args) {
    const msg = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
    const done = /\[sampler\]\s*load sound\s+"([^"]+)"[^.]*\.\.\.\s*done!/.exec(msg);
    if (done) {
      const id = done[1].trim();
      if (loadedSamplesMap.has(id)) loadedSamplesMap.get(id).loaded = true;
      // also mark keys that match this sample (e.g. "tr909_bd" when id is "tr909_bd:0:0")
      loadedSamplesMap.forEach((val, key) => {
        if (id === key || id.startsWith(key + ':')) val.loaded = true;
      });
    }
    origLog.apply(console, args);
  };

  // Poll editor code and run checkSamples when code changes (file touched without evaluating)
  let lastCode = '';
  setInterval(() => {
    const editor = getEditor();
    const code = editor?.code ?? '';
    if (code !== lastCode) {
      lastCode = code;
      checkSamples();
    }
  }, 500);
  // Initial sync once editor is ready
  setTimeout(() => {
    const editor = getEditor();
    if (editor?.code != null) {
      lastCode = editor.code;
      checkSamples();
    }
  }, 1000);

  /** Clear all content from the Strudel editor. */
  function clearEditor() {
    const editor = getEditor();
    if (!editor) return;
    if (editor.setCode) {
      editor.setCode('');
    } else {
      const cm = editor?.editor;
      if (cm?.state) {
        const len = cm.state.doc.length;
        cm.dispatch({ changes: { from: 0, to: len, insert: '' }, selection: { anchor: 0, head: 0 } });
      }
    }
  }

  /** Load palette buttons from CSV and append to container. Uses palletLogic.parseCSV and applyPalletRowToEditor. */
  async function loadPalletButtons() {
    if (!palletButtonsContainer || !window.palletLogic) return;
    try {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.id = 'clear-btn';
      clearBtn.className = 'pallet-btn';
      clearBtn.title = 'Clear';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', clearEditor);
      palletButtonsContainer.appendChild(clearBtn);
      const res = await fetch('pallet-buttons.csv');
      const text = await res.text();
      const rows = window.palletLogic.parseCSV(text);
      for (const row of rows) {
        const id = row.id || row.name?.toLowerCase().replace(/\s+/g, '-');
        const name = row.name || id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = id + '-btn';
        btn.className = 'pallet-btn';
        btn.title = name;
        btn.textContent = name;
        btn.addEventListener('click', () => applyPalletRowToEditor(row));
        palletButtonsContainer.appendChild(btn);
      }
    } catch (e) {
      console.error('Failed to load pallet-buttons.csv', e);
    }
  }

  loadPalletButtons();
  runBtn?.addEventListener('click', runPattern);
  stopBtn?.addEventListener('click', stopPattern);
  updateBtn?.addEventListener('click', updatePattern);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      updatePattern();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      const target = e.target;
      const root = target?.getRootNode?.();
      const inEditor = target === replEl || root?.host === replEl;
      if (!inEditor) {
        e.preventDefault();
        selectAllInEditor();
      }
    }
  });
});
