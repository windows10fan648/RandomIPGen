(() => {
  const versionButtons = document.querySelectorAll('.toggle-btn');
  const countInput = document.getElementById('count');
  const rangeSelect = document.getElementById('range');
  const rangeHint = document.getElementById('rangeHint');
  const portsToggle = document.getElementById('portsToggle');
  const copyJsonlBtn = document.getElementById('copyJsonlBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const historyBox = document.getElementById('history');
  const historyList = document.getElementById('historyList');
  const generateBtn = document.getElementById('generateBtn');
  const spinner = generateBtn.querySelector('.spinner');
  const btnText = generateBtn.querySelector('.btn-text');
  const resultsList = document.getElementById('resultsList');
  const emptyState = document.getElementById('emptyState');
  const globalControls = document.getElementById('globalControls');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const resultsMeta = document.getElementById('resultsMeta');
  const versionBadge = document.getElementById('versionBadge');
  const totalCount = document.getElementById('totalCount');
  const toast = document.getElementById('toast');
  const themeToggle = document.getElementById('themeToggle');

  // Theme handling (works on all pages)
  (function initTheme() {
    const saved = localStorage.getItem('ripTheme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefersLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  })();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ripTheme', next);
    });
  }

  // Only run generator logic on pages that contain the generator UI
  if (!generateBtn || !countInput || !rangeSelect) {
    return;
  }

  const RANGES = {
    ipv4: ['any', 'private', 'public', 'loopback', 'link-local', 'multicast'],
    ipv6: ['any', 'global', 'unique-local', 'link-local', 'multicast'],
  };

  const RANGE_HINTS = {
    any: 'Any random address.',
    private: 'Private ranges (RFC1918).',
    public: 'Likely public (excludes special ranges).',
    loopback: 'Loopback (127.0.0.0/8).',
    'link-local': 'Link-local (169.254.0.0/16 / fe80::/10).',
    multicast: 'Multicast addresses.',
    global: 'Global unicast (2000::/3).',
    'unique-local': 'Unique local (fc00::/7).',
  };
  let selectedVersion = 'ipv4';
  let addresses = [];
  let ports = [];
  let generating = false;

  function updatePortsToggleState() {
    // Ports supported for both IPv4 and IPv6 (IPv6 uses brackets).
    portsToggle.disabled = false;
  }

  function updateRangeHint() {
    if (rangeHint) rangeHint.textContent = RANGE_HINTS[rangeSelect.value] || '';
  }

  function populateRanges(version) {
    rangeSelect.innerHTML = '';
    RANGES[version].forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      rangeSelect.appendChild(opt);
    });
    updateRangeHint();
  }

  rangeSelect.addEventListener('change', () => {
    updateRangeHint();
    saveSettings();
  });
  populateRanges(selectedVersion);
  updatePortsToggleState();

  // Restore saved settings
  try {
    const saved = JSON.parse(localStorage.getItem('ripSettings') || '{}');
    if (saved.version === 'ipv4' || saved.version === 'ipv6') {
      selectedVersion = saved.version;
      versionButtons.forEach((b) => {
        const active = b.dataset.version === selectedVersion;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      populateRanges(selectedVersion);
      updatePortsToggleState();
    }
    if (typeof saved.count === 'number') countInput.value = saved.count;
    if (saved.range) rangeSelect.value = saved.range;
    if (typeof saved.ports === 'boolean') portsToggle.checked = saved.ports;
  } catch (e) {}

  function saveSettings() {
    try {
      localStorage.setItem('ripSettings', JSON.stringify({
        version: selectedVersion,
        count: Number(countInput.value),
        range: rangeSelect.value,
        ports: portsToggle.checked,
      }));
    } catch (e) {}
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('ripHistory') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveHistory(version, addresses, portsArr) {
    try {
      const history = loadHistory();
      history.unshift({ version, addresses: addresses.slice(), ports: portsArr.slice(), ts: Date.now() });
      localStorage.setItem('ripHistory', JSON.stringify(history.slice(0, 5)));
    } catch (e) {}
  }

  function renderHistory() {
    if (!historyBox || !historyList) return;
    const history = loadHistory();
    if (history.length === 0) {
      historyBox.hidden = true;
      return;
    }
    historyBox.hidden = false;
    historyList.innerHTML = '';
    history.forEach((h, idx) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const label = document.createElement('span');
      label.textContent = `${h.version.toUpperCase()} · ${h.addresses.length} addresses`;
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(h.addresses.join('\\n'));
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy'), 1200);
        } catch (e) {}
      });
      li.appendChild(label);
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  function randomPort() {
    return Math.floor(Math.random() * 65535) + 1;
  }

  function displayAddress(i) {
    const base = addresses[i];
    if (!base) return '';
    if (!portsToggle.checked || !ports[i]) return base;
    if (selectedVersion === 'ipv6') {
      return `[${base}]:${ports[i]}`;
    }
    return `${base}:${ports[i]}`;
  }

  function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.className = 'toast';
    }, 2200);
  }

  function setLoading(isLoading) {
    generating = isLoading;
    spinner.hidden = !isLoading;
    btnText.textContent = isLoading ? 'Generating...' : 'Generate IPs';
    updateGenerateButton();
  }

  function validateCount() {
    const raw = countInput.value.trim();
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return null;
    }
    return n;
  }

  versionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      versionButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      selectedVersion = btn.dataset.version;
      populateRanges(selectedVersion);
      updatePortsToggleState();
      saveSettings();
    });
  });

  function updateGenerateButton() {
    const v = validateCount();
    const invalid = v === null;
    countInput.style.borderColor = invalid ? '#ff6b6b' : '';
    generateBtn.disabled = invalid || generating;
    const hasResults = addresses.length > 0;
    regenerateBtn.disabled = invalid || generating || !hasResults;
  }

  countInput.addEventListener('input', () => {
    updateGenerateButton();
    saveSettings();
  });

  // saveSettings already called in range change handler above

  portsToggle.addEventListener('change', () => {
    renderResults();
    saveSettings();
  });

  if (copyJsonlBtn) {
    copyJsonlBtn.addEventListener('click', async () => {
      if (addresses.length === 0) return;
      try {
        await navigator.clipboard.writeText(addresses.map((a, i) => JSON.stringify({ ip: a, port: portsToggle.checked ? ports[i] : null })).join('\\n'));
        showToast('Copied JSONL', 'success');
      } catch (e) {
        showToast('Copy failed', 'error');
      }
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (addresses.length === 0) return;
      const rows = ['ip,port'];
      addresses.forEach((a, i) => {
        rows.push(`${a},${portsToggle.checked ? ports[i] : ''}`);
      });
      const blob = new Blob([rows.join('\\n') + '\\n'], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedVersion}-addresses.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Exported CSV file', 'success');
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
    if (e.key === 'Escape') {
      addresses = [];
      ports = [];
      renderResults();
    }
  });

  function renderResults() {
    resultsList.innerHTML = '';
    if (addresses.length === 0) {
      emptyState.hidden = false;
      resultsList.hidden = true;
      globalControls.hidden = true;
      totalCount.hidden = true;
      resultsMeta.textContent = 'No addresses generated yet.';
      versionBadge.hidden = true;
      updateGenerateButton();
      return;
    }
    emptyState.hidden = true;
    resultsList.hidden = false;
    globalControls.hidden = false;
    totalCount.hidden = false;

    addresses.forEach((addr, i) => {
      const li = document.createElement('li');
      li.className = 'result-item';
      const code = document.createElement('code');
      code.className = 'result-addr';
      code.textContent = displayAddress(i);
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(displayAddress(i));
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy'), 1200);
          showToast('Copied to clipboard', 'success');
        } catch (e) {
          showToast('Copy failed', 'error');
        }
      });
      li.appendChild(code);
      li.appendChild(btn);
      resultsList.appendChild(li);
    });

    resultsMeta.textContent = `${addresses.length} address${addresses.length === 1 ? '' : 'es'} generated.`;
    versionBadge.hidden = false;
    versionBadge.textContent = selectedVersion === 'ipv4' ? 'IPv4' : 'IPv6';
    totalCount.textContent = `Total generated: ${addresses.length}`;
    updateGenerateButton();
  }

  async function generate() {
    if (generating) return;
    const count = validateCount();
    if (count === null) {
      showToast('Enter a quantity between 1 and 100.', 'error');
      countInput.focus();
      return;
    }

    setLoading(true);
    // Show loading skeleton
    if (resultsList) {
      resultsList.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const li = document.createElement('li');
        li.className = 'result-item skeleton';
        li.innerHTML = '<span class="result-addr skeleton-bar"></span>';
        resultsList.appendChild(li);
      }
      resultsList.hidden = false;
      emptyState.hidden = true;
    }
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: selectedVersion, count, range: rangeSelect.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Request failed.');
      }
      addresses = Array.isArray(data.addresses) ? data.addresses : [];
      ports = addresses.map(() => randomPort());
      selectedVersion = data.version || selectedVersion;
      if (data.range) {
        // keep dropdown in sync if server normalized
      }
      renderResults();
      saveHistory(selectedVersion, addresses, ports);
      renderHistory();
      showToast(`Generated ${addresses.length} addresses`, 'success');
    } catch (err) {
      renderResults();
      showToast(err.message || 'Failed to generate addresses.', 'error');
    } finally {
      setLoading(false);
    }
  }

  generateBtn.addEventListener('click', generate);
  regenerateBtn.addEventListener('click', generate);

  function displayList() {
    return addresses.map((_, i) => displayAddress(i));
  }

  copyAllBtn.addEventListener('click', async () => {
    if (addresses.length === 0) return;
    try {
      await navigator.clipboard.writeText(displayList().join('\n'));
      const original = copyAllBtn.textContent;
      copyAllBtn.textContent = 'Copied!';
      setTimeout(() => (copyAllBtn.textContent = original), 1200);
      showToast('All addresses copied', 'success');
    } catch (e) {
      showToast('Copy failed', 'error');
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (addresses.length === 0) return;
    const blob = new Blob([displayList().join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedVersion}-addresses.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded TXT file', 'success');
  });

  exportJsonBtn.addEventListener('click', () => {
    if (addresses.length === 0) return;
    const blob = new Blob([JSON.stringify(displayList(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedVersion}-addresses.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported JSON file', 'success');
  });

  // Keyboard: Enter on count triggers generate
  countInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });

  updateGenerateButton();
  renderHistory();
  renderResults();
})();