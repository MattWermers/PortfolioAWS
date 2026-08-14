const API_BASE_URL = 'http://localhost:7071/api';

const FORMAT_PRESETS = {
  date: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MMM-YYYY'],
  phone: ['(XXX) XXX-XXXX', 'XXX-XXX-XXXX', 'Digits only'],
  gender: ['M/F', 'Male/Female', '1/0'],
  currency: ['1234.56', '$1,234.56', '$1,234'],
  ssn: ['XXX-XX-XXXX', 'Digits only'],
  zip: ['5-digit', '9-digit (ZIP+4)']
};

const FIELD_GROUPS = [
  {
    key: 'demographic', label: 'Demographic', color: 'var(--demo)', dot: 'var(--demo)', fields: [
      { key: 'lastName', label: 'Last name', req: true },
      { key: 'firstName', label: 'First name', req: true },
      { key: 'middleInitial', label: 'Middle initial' },
      { key: 'dob', label: 'Date of birth', type: 'date' },
      { key: 'sex', label: 'Sex / gender', type: 'gender' },
      { key: 'ssn', label: 'SSN', type: 'ssn' },
      { key: 'accountNumber', label: 'Account number', req: true },
      { key: 'address1', label: 'Address line 1' },
      { key: 'address2', label: 'Address line 2' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'zip', label: 'Zip code', type: 'zip' },
      { key: 'phoneHome', label: 'Phone (home)', type: 'phone' },
      { key: 'phoneMobile', label: 'Phone (mobile)', type: 'phone' },
      { key: 'phoneWork', label: 'Phone (work)', type: 'phone' },
      { key: 'email', label: 'Email' },
    ]
  },
  {
    key: 'insurance', label: 'Insurance', color: 'var(--ins)', dot: 'var(--ins)', fields: [
      { key: 'insCompanyName', label: 'Insurance company' },
      { key: 'insPayerId', label: 'Payer ID' },
      { key: 'insPolicyNumber', label: 'Policy / member ID' },
      { key: 'insGroupNumber', label: 'Group number' },
      { key: 'insSubscriberName', label: 'Subscriber name' },
      { key: 'insSubscriberDob', label: 'Subscriber DOB', type: 'date' },
      { key: 'insRelationship', label: 'Relationship to subscriber' },
      { key: 'insRank', label: 'Insurance rank (primary/secondary)' },
    ]
  },
  {
    key: 'ledger', label: 'Ledger', color: 'var(--ledger)', dot: 'var(--ledger)', fields: [
      { key: 'dos', label: 'Date of service', type: 'date' },
      { key: 'procCode', label: 'Procedure code' },
      { key: 'procDescription', label: 'Procedure description' },
      { key: 'chargeAmount', label: 'Charge amount', type: 'currency' },
      { key: 'paymentAmount', label: 'Payment amount', type: 'currency' },
      { key: 'adjustmentAmount', label: 'Adjustment amount', type: 'currency' },
      { key: 'balance', label: 'Balance', type: 'currency' },
      { key: 'providerName', label: 'Provider name' },
      { key: 'providerId', label: 'Provider ID' },
    ]
  },
];

const FIELD_INDEX = {};
FIELD_GROUPS.forEach(g => g.fields.forEach(f => FIELD_INDEX[f.key] = { ...f, group: g.key }));

let headers = [];
let previewRows = [];
let totalDataRows = 0;
// mapping[colIndex] = string[]  — zero or more field keys, or ['__ignore__']
let mapping = [];
let fieldFormats = [];       // fieldFormats[colIndex] = string (shared format for the whole column)
let fieldFormatInclusive = []; // fieldFormatInclusive[colIndex] = boolean (true = accept all formats, false = strict match only)
let currentFileName = '';
let allDataRows = [];

const dropzone   = document.getElementById('dropzone');
const fileInput  = document.getElementById('fileInput');
const sampleBtn  = document.getElementById('sampleBtn');
const toolbar    = document.getElementById('toolbar');
const workspace  = document.getElementById('workspace');
const headerRow  = document.getElementById('headerRow');
const bodyRows   = document.getElementById('bodyRows');
const outputRows = document.getElementById('outputRows');
const outputDividerCell  = document.getElementById('outputDividerCell');
const legendSidebar      = document.getElementById('legendSidebar');
const progressBadge      = document.getElementById('progressBadge');
const exportBtn  = document.getElementById('exportBtn');
const resetBtn   = document.getElementById('resetBtn');
const warnBanner = document.getElementById('warnBanner');
const warnText   = document.getElementById('warnText');
const exportPanel    = document.getElementById('exportPanel');
const mappingList    = document.getElementById('mappingList');
const stepPill       = document.getElementById('stepPill');
const statsPanel     = document.getElementById('statsPanel');
const expandedSection   = document.getElementById('expandedSection');
const expandedHeaderRow = document.getElementById('expandedHeaderRow');
const expandedBodyRows  = document.getElementById('expandedBodyRows');

const submitBackendBtn  = document.getElementById('submitBackendBtn');
const backendStatusPanel = document.getElementById('backendStatusPanel');
const jobIdVal          = document.getElementById('jobIdVal');
const jobStatusVal      = document.getElementById('jobStatusVal');
const jobProgressVal    = document.getElementById('jobProgressVal');
const jobProgressBar    = document.getElementById('jobProgressBar');
const jobConsoleLog     = document.getElementById('jobConsoleLog');
const clearLogBtn       = document.getElementById('clearLogBtn');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

sampleBtn.addEventListener('click', () => {
  const sampleRows = [
    ['Pat_LName', 'Pat_FName', 'DOB',        'Acct#',  'Cell Phone',  'Ins Company',  'Member ID', 'DOS',        'Proc',  'Charge'],
    ['Alvarez',  'Marco',     '04/02/1978', 'A10021', '(555) 123-4567',  'Delta Dental', 'DD-99213',  '2026-01-05', 'D0120', '62.00'],
    ['Bennett',  'Sarah',     '11/19/1990', 'A10022', '555-987-6543',  'Cigna',        'CG-44120',  '2026-01-06', 'D1110', '95.00'],
    ['Chen',     'Wei',       '07/30/1965', 'A10023', '5552223344',  'Aetna',        'AE-77321',  '2026-01-06', 'D2740', '980.00'],
    ['Diaz',     'Luis',      '02/14/2001', 'A10024', '1-555-445-5667',  'MetLife',      'ML-11029',  '2026-01-07', 'D0210', '120.00'],
    ['Williams', 'Emma',      '32/13/2001', 'A10025', '(555) 667-788',   'BlueCross',    'BC-55432',  '2026-01-08', 'D0150', '45.00'],
  ];
  loadRows(sampleRows, 'sample-patient-export.csv');
});

resetBtn.addEventListener('click', () => {
  headers = []; previewRows = []; allDataRows = []; mapping = []; fieldFormats = []; fieldFormatInclusive = []; totalDataRows = 0; currentFileName = '';
  dropzone.style.display = '';
  statsPanel.style.display = 'none';
  toolbar.style.display = 'none';
  workspace.style.display = 'none';
  exportPanel.style.display = 'none';
  backendStatusPanel.style.display = 'none';
  jobIdVal.textContent = '-';
  jobStatusVal.textContent = '-';
  jobStatusVal.className = 'value badge';
  jobProgressVal.textContent = '0 / 0 chunks';
  jobProgressBar.style.width = '0%';
  jobConsoleLog.innerHTML = '<div class="log-line system">Console initialized. Ready for submission.</div>';
  fileInput.value = '';
  stepPill.innerHTML = '<b>Step 1</b>&nbsp;— upload a file';
});

function handleFile(file) {
  currentFileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      loadRows(rows, file.name);
    } catch (err) {
      alert('Could not read that file. Make sure it is a valid CSV or XLSX export.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function loadRows(rows, fileName) {
  rows = rows.filter(r => r.length && r.some(c => String(c).trim() !== ''));
  headers = (rows[0] || []).map(h => String(h).trim());
  previewRows = rows.slice(1, 9);
  allDataRows = rows.slice(1);
  totalDataRows = Math.max(0, rows.length - 1);
  // mapping[i] is now string[] — start as empty arrays (not yet assigned)
  mapping = headers.map(() => []);
  fieldFormats = headers.map(() => '');
  fieldFormatInclusive = headers.map(() => false); // defaults to strict — toggled to true when user opts in
  currentFileName = fileName;

  document.getElementById('fileName').textContent = fileName;
  document.getElementById('fileRows').textContent = `${headers.length} columns · ${totalDataRows} data rows`;
  dropzone.style.display = 'none';
  statsPanel.style.display = 'block';
  toolbar.style.display = 'flex';
  workspace.style.display = 'flex';
  exportPanel.style.display = 'none';
  stepPill.innerHTML = '<b>Step 2</b>&nbsp;— assign each column';

  renderTable();
  renderLegend();
  updateProgress();
}

// ─── Column mapping UI ────────────────────────────────────────────────────────

/**
 * Builds the entire mapping widget for one input column:
 * one or more mapping rows (select + optional × button) plus a "+ Add field" button.
 */
function buildMappingContainer(colIndex) {
  const container = document.createElement('div');
  container.className = 'mapping-container';

  const fieldKeys  = mapping[colIndex] || [];
  const isIgnored  = fieldKeys.length === 1 && fieldKeys[0] === '__ignore__';
  const activeKeys = fieldKeys.filter(k => k && k !== '__ignore__');

  // Render at least one row (for the initial empty state)
  const renderCount = Math.max(1, fieldKeys.length);
  for (let idx = 0; idx < renderCount; idx++) {
    container.appendChild(buildMappingRow(colIndex, idx));
  }

  // "+ Add field" only when ≥1 field is mapped, not ignored, and no empty slot pending
  const hasEmptySlot = fieldKeys.some(k => !k);
  if (activeKeys.length > 0 && !isIgnored && !hasEmptySlot) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-field-btn';
    addBtn.textContent = '+ Add field';
    addBtn.addEventListener('click', () => {
      mapping[colIndex] = [...(mapping[colIndex] || []), ''];
      renderTable();
      renderLegend();
      updateProgress();
    });
    container.appendChild(addBtn);
  }

  return container;
}

/**
 * Builds one select row (the dropdown + optional remove button) for a single
 * field-key slot within a column's mapping array.
 */
function buildMappingRow(colIndex, mappingIdx) {
  const rowEl = document.createElement('div');
  rowEl.className = 'mapping-row';

  const fieldKeys  = mapping[colIndex] || [];
  const currentKey = fieldKeys[mappingIdx] !== undefined ? fieldKeys[mappingIdx] : '';

  const selWrapper = document.createElement('div');
  selWrapper.style.position = 'relative';
  selWrapper.style.flex = '1';

  const sel = document.createElement('select');
  sel.className = 'map-select';
  sel.dataset.col = colIndex;
  sel.dataset.idx = mappingIdx;
  sel.style.width = '100%';

  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = '— select a field —';
  sel.appendChild(blank);

  FIELD_GROUPS.forEach(g => {
    const og = document.createElement('optgroup');
    og.label = g.label;
    g.fields.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.key; opt.textContent = f.label + (f.req ? ' *' : '');
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  const ignoreOg = document.createElement('optgroup');
  ignoreOg.label = 'Other';
  const ig = document.createElement('option');
  ig.value = '__ignore__'; ig.textContent = 'Ignore this column';
  ignoreOg.appendChild(ig);
  sel.appendChild(ignoreOg);

  sel.value = currentKey;

  // Colour by group
  if (currentKey && currentKey !== '__ignore__' && FIELD_INDEX[currentKey]) {
    sel.classList.add(FIELD_INDEX[currentKey].group);
  }

  // Dupe highlight (same field assigned to two different columns)
  const dupeCounts = {};
  mapping.forEach(keys => {
    (keys || []).filter(k => k && k !== '__ignore__').forEach(k => {
      dupeCounts[k] = (dupeCounts[k] || 0) + 1;
    });
  });
  if (currentKey && dupeCounts[currentKey] > 1) sel.classList.add('dupe');

  sel.addEventListener('change', () => {
    const newVal = sel.value;
    if (!mapping[colIndex]) mapping[colIndex] = [];

    if (newVal === '__ignore__') {
      // Selecting "ignore" wipes all other slots for this column
      mapping[colIndex] = ['__ignore__'];
      fieldFormats[colIndex] = '';
    } else {
      // Update this slot and strip any lingering __ignore__ sentinel
      mapping[colIndex][mappingIdx] = newVal;
      mapping[colIndex] = mapping[colIndex].filter(k => k !== '__ignore__');

      // Auto-infer format if this field has a type and no format is set yet
      if (newVal) {
        const fieldMeta = FIELD_INDEX[newVal];
        if (fieldMeta && fieldMeta.type && !fieldFormats[colIndex]) {
          fieldFormats[colIndex] = inferFormat(previewRows.map(r => r[colIndex]), fieldMeta.type);
        }
      }
    }

    renderTable();
    renderLegend();
    updateProgress();

    // Scroll to and flash any errors this field assignment introduced
    if (newVal && newVal !== '__ignore__') {
      scrollToFirstColumnError(colIndex);
    }
  });

  selWrapper.appendChild(sel);

  if (currentKey && currentKey !== '__ignore__' && FIELD_INDEX[currentKey] && FIELD_INDEX[currentKey].type) {
    sel.style.paddingRight = '44px';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `strict-btn-${colIndex}`;
    btn.title = 'Include other data formats?';
    btn.style.cssText = 'position: absolute; right: 24px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; padding: 2px; background: transparent; border: none; cursor: pointer; color: var(--ink-soft); z-index: 10; display: none; align-items: center; justify-content: center; border-radius: 4px;';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
    
    if (fieldFormats[colIndex]) {
      btn.style.display = 'flex';
    }

    if (fieldFormatInclusive[colIndex] === true) {
      btn.style.color = '#fff';
      btn.style.background = 'var(--brand)';
    }

    btn.addEventListener('click', () => {
      fieldFormatInclusive[colIndex] = !fieldFormatInclusive[colIndex];
      const btns = document.querySelectorAll(`.strict-btn-${colIndex}`);
      btns.forEach(b => {
        if (fieldFormatInclusive[colIndex] === true) {
          b.style.color = '#fff';
          b.style.background = 'var(--brand)';
        } else {
          b.style.color = 'var(--ink-soft)';
          b.style.background = 'transparent';
        }
      });
      updateProgress();
      renderOutputTable();
      renderExpandedTable();
    });
    selWrapper.appendChild(btn);
  }

  rowEl.appendChild(selWrapper);

  // ── Remove button (only when there are multiple entries or this is an extra) ─
  const activeCount = fieldKeys.filter(k => k && k !== '__ignore__').length;
  if (mappingIdx > 0 || activeCount > 1) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-field-btn';
    removeBtn.title = 'Remove this field mapping';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      mapping[colIndex] = (mapping[colIndex] || []).filter((_, i) => i !== mappingIdx);
      renderTable();
      renderLegend();
      updateProgress();
    });
    rowEl.appendChild(removeBtn);
  }

  return rowEl;
}

function inferFormat(values, type) {
  if (!values || !values.length) return '';
  const sample = values.map(v => String(v).trim()).filter(v => v !== '');
  if (!sample.length) return '';

  const counts = {};

  if (type === 'date') {
    sample.forEach(v => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) counts['YYYY-MM-DD'] = (counts['YYYY-MM-DD'] || 0) + 1;
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
        const parts = v.split('/');
        if (parts[0] && parseInt(parts[0], 10) > 12) counts['DD/MM/YYYY'] = (counts['DD/MM/YYYY'] || 0) + 1;
        else counts['MM/DD/YYYY'] = (counts['MM/DD/YYYY'] || 0) + 1;
      }
    });
  }

  if (type === 'phone') {
    sample.forEach(v => {
      if (/^\(\d{3}\)\s*\d{3}-\d{4}$/.test(v)) counts['(XXX) XXX-XXXX'] = (counts['(XXX) XXX-XXXX'] || 0) + 1;
      else if (/^\d{3}-\d{3}-\d{4}$/.test(v)) counts['XXX-XXX-XXXX'] = (counts['XXX-XXX-XXXX'] || 0) + 1;
      else if (/^\d{10}$/.test(v)) counts['Digits only'] = (counts['Digits only'] || 0) + 1;
    });
  }

  if (type === 'ssn') {
    sample.forEach(v => {
      if (/^\d{3}-\d{2}-\d{4}$/.test(v)) counts['XXX-XX-XXXX'] = (counts['XXX-XX-XXXX'] || 0) + 1;
      else if (/^\d{9}$/.test(v)) counts['Digits only'] = (counts['Digits only'] || 0) + 1;
    });
  }

  if (type === 'zip') {
    sample.forEach(v => {
      if (/^\d{5}-\d{4}$/.test(v)) counts['9-digit (ZIP+4)'] = (counts['9-digit (ZIP+4)'] || 0) + 1;
      else if (/^\d{5}$/.test(v)) counts['5-digit'] = (counts['5-digit'] || 0) + 1;
    });
  }

  if (type === 'currency') {
    sample.forEach(v => {
      if (/^\$\d+/.test(v) || /^\$-?\d+/.test(v)) {
        if (v.includes('.')) counts['$1,234.56'] = (counts['$1,234.56'] || 0) + 1;
        else counts['$1,234'] = (counts['$1,234'] || 0) + 1;
      } else if (v.includes('.')) counts['1234.56'] = (counts['1234.56'] || 0) + 1;
    });
  }

  if (type === 'gender') {
    sample.forEach(v => {
      if (/^[MF]$/i.test(v)) counts['M/F'] = (counts['M/F'] || 0) + 1;
      else if (/^(male|female)$/i.test(v)) counts['Male/Female'] = (counts['Male/Female'] || 0) + 1;
      else if (/^[10]$/.test(v)) counts['1/0'] = (counts['1/0'] || 0) + 1;
    });
  }

  let bestFormat = '';
  let maxCount = 0;
  for (const [fmt, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestFormat = fmt;
    }
  }

  return bestFormat;
}

function buildFormatSelect(colIndex, fieldKey) {
  const fieldMeta = FIELD_INDEX[fieldKey];
  if (!fieldMeta || !fieldMeta.type) return null;

  const formats = FORMAT_PRESETS[fieldMeta.type];
  if (!formats || !formats.length) return null;

  const container = document.createElement('div');
  container.className = 'format-select-container';
  container.style.marginTop = '5px';

  const sel = document.createElement('select');
  sel.className = 'format-select ' + fieldMeta.group;
  sel.dataset.col = colIndex;

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '— select format —';
  sel.appendChild(blank);

  formats.forEach(fmt => {
    const opt = document.createElement('option');
    opt.value = fmt;
    opt.textContent = fmt;
    sel.appendChild(opt);
  });

  const customOpt = document.createElement('option');
  customOpt.value = '__custom__';
  customOpt.textContent = 'Custom...';
  sel.appendChild(customOpt);

  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'format-custom-input ' + fieldMeta.group;
  customInput.placeholder = 'Enter custom format...';
  customInput.style.display = 'none';
  customInput.style.marginTop = '4px';

  function syncStrictBtn() {
    const btns = document.querySelectorAll(`.strict-btn-${colIndex}`);
    btns.forEach(b => {
      b.style.display = (fieldFormats[colIndex] === '') ? 'none' : 'flex';
    });
  }

  // Determine initial state
  const currentVal = fieldFormats[colIndex] || '';
  if (currentVal === '') {
    sel.value = '';
  } else if (formats.includes(currentVal)) {
    sel.value = currentVal;
  } else {
    sel.value = '__custom__';
    customInput.value = currentVal;
    customInput.style.display = 'block';
  }
  syncStrictBtn();

  sel.addEventListener('change', () => {
    if (sel.value === '') {
      fieldFormatInclusive[colIndex] = false; // reset to strict when format is cleared
    }

    if (sel.value === '__custom__') {
      customInput.style.display = 'block';
      fieldFormats[colIndex] = customInput.value;
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      fieldFormats[colIndex] = sel.value;
    }
    syncStrictBtn();
    updateProgress();
    renderOutputTable();
    renderExpandedTable();
  });

  customInput.addEventListener('input', () => {
    fieldFormats[colIndex] = customInput.value;
    syncStrictBtn();
    updateProgress();
    renderOutputTable();
    renderExpandedTable();
  });

  container.appendChild(sel);
  container.appendChild(customInput);
  return container;
}

// ─── Table rendering ──────────────────────────────────────────────────────────

function renderTable() {
  headerRow.innerHTML = '';

  // Compute dupe counts across all columns' field arrays
  const dupeCounts = {};
  mapping.forEach(keys => {
    (keys || []).filter(k => k && k !== '__ignore__').forEach(k => {
      dupeCounts[k] = (dupeCounts[k] || 0) + 1;
    });
  });

  headers.forEach((h, i) => {
    const th = document.createElement('th');
    const inner = document.createElement('div');
    inner.className = 'th-inner';

    const label = document.createElement('div');
    label.className = 'orig-label';
    label.textContent = h || '(blank header)';
    inner.appendChild(label);

    // Tab: reflects mapped group(s)
    const tab = document.createElement('div');
    const fieldKeys  = mapping[i] || [];
    const isIgnored  = fieldKeys.length === 1 && fieldKeys[0] === '__ignore__';
    const activeKeys = fieldKeys.filter(k => k && k !== '__ignore__');

    if (isIgnored) {
      tab.className = 'tab';
      tab.textContent = 'ignored';
    } else if (activeKeys.length === 0) {
      tab.className = 'tab unmapped';
      tab.textContent = 'unfiled';
    } else {
      const groups = [...new Set(activeKeys.map(k => FIELD_INDEX[k]?.group).filter(Boolean))];
      if (groups.length === 1) {
        tab.className = 'tab mapped ' + groups[0];
        tab.textContent = groups[0];
      } else {
        // Multiple field groups → "multi" tab
        tab.className = 'tab mapped multi';
        tab.textContent = 'multi';
      }
    }
    inner.appendChild(tab);

    // Stacked mapping selects
    inner.appendChild(buildMappingContainer(i));

    // Format select: appears if any active field has a format type
    const firstTypedKey = activeKeys.find(k => FIELD_INDEX[k] && FIELD_INDEX[k].type);
    if (firstTypedKey) {
      const fmtSel = buildFormatSelect(i, firstTypedKey);
      if (fmtSel) inner.appendChild(fmtSel);
    }

    th.appendChild(inner);
    headerRow.appendChild(th);
  });

  bodyRows.innerHTML = '';
  previewRows.forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach((h, i) => {
      const td = document.createElement('td');
      td.textContent = row[i] !== undefined ? row[i] : '';
      tr.appendChild(td);
    });
    bodyRows.appendChild(tr);
  });

  const dupeKeys = Object.keys(dupeCounts).filter(k => dupeCounts[k] > 1);
  if (dupeKeys.length) {
    warnBanner.style.display = 'flex';
    const names = dupeKeys.map(k => FIELD_INDEX[k].label).join(', ');
    warnText.textContent = `More than one column is mapped to the same field: ${names}. Fix this before exporting.`;
  } else {
    warnBanner.style.display = 'none';
  }

  renderOutputTable();
  renderExpandedTable();
}

/**
 * Middle section: mirrors input columns, showing the first mapped field's
 * transformed value for each column (same column layout as the source rows).
 */
function renderOutputTable() {
  outputDividerCell.colSpan = headers.length || 1;
  outputRows.innerHTML = '';

  previewRows.forEach(row => {
    const tr = document.createElement('tr');

    headers.forEach((h, colIdx) => {
      const td = document.createElement('td');
      // First active field key drives this cell
      const fieldKey = (mapping[colIdx] || []).find(k => k && k !== '__ignore__') || null;

      if (!fieldKey) {
        td.textContent = '—';
        td.className = 'out-null';
      } else {
        const raw    = row[colIdx] !== undefined ? row[colIdx] : '';
        const format = fieldFormats[colIdx] || '';
        const strict = !fieldFormatInclusive[colIdx]; // inclusive=true → strict=false
        const fn     = ImportPipeline.FIELD_TRANSFORMERS[fieldKey];

        if (!fn) {
          td.textContent = raw;
          td.className   = 'out-mapped';
        } else {
          const result = fn(raw, format, strict);
          if (result.error) {
            td.textContent = '\u26A0 ' + (result.value !== null ? result.value : raw);
            td.className   = 'out-error';
            td.title       = result.error;
          } else if (result._stub) {
            td.textContent = result.value !== null ? String(result.value) : '—';
            td.className   = 'out-stub';
            td.title       = 'Stub — SQL destination not yet confirmed';
          } else {
            td.textContent = result.value !== null ? String(result.value) : '—';
            td.className   = result.value !== null ? 'out-mapped' : 'out-null';
          }
        }
      }

      tr.appendChild(td);
    });

    outputRows.appendChild(tr);
  });
}

/**
 * Third section: one column per mapped output field in FIELD_GROUPS order,
 * showing the fully-transformed value for every preview row.
 * This is the schema-shaped view of what will actually be imported.
 */
function renderExpandedTable() {
  // Collect (fieldKey, sourceColIndex) pairs in schema order
  const entries = [];
  FIELD_GROUPS.forEach(g => {
    g.fields.forEach(f => {
      headers.forEach((h, colIdx) => {
        const activeKeys = (mapping[colIdx] || []).filter(k => k && k !== '__ignore__');
        if (activeKeys.includes(f.key)) {
          entries.push({ fieldKey: f.key, colIndex: colIdx, label: f.label, group: g.key });
        }
      });
    });
  });

  if (!expandedSection) return;
  if (entries.length === 0) {
    expandedSection.style.display = 'none';
    return;
  }
  expandedSection.style.display = 'block';

  // Header row
  expandedHeaderRow.innerHTML = '';
  entries.forEach(entry => {
    const th = document.createElement('th');
    const inner = document.createElement('div');
    inner.className = 'th-inner';
    const lbl = document.createElement('div');
    lbl.className = 'orig-label';
    lbl.textContent = entry.label;
    inner.appendChild(lbl);
    const tab = document.createElement('div');
    tab.className = `tab mapped ${entry.group}`;
    tab.textContent = entry.group;
    inner.appendChild(tab);
    th.appendChild(inner);
    expandedHeaderRow.appendChild(th);
  });

  // Data rows
  expandedBodyRows.innerHTML = '';
  previewRows.forEach(row => {
    const tr = document.createElement('tr');
    entries.forEach(entry => {
      const td = document.createElement('td');
      const raw    = row[entry.colIndex] !== undefined ? row[entry.colIndex] : '';
      const format = fieldFormats[entry.colIndex] || '';
      const strict = !fieldFormatInclusive[entry.colIndex];
      const fn     = ImportPipeline.FIELD_TRANSFORMERS[entry.fieldKey];

      if (!fn) {
        td.textContent = raw;
        td.className   = 'out-mapped';
      } else {
        const result = fn(raw, format, strict);
        if (result.error) {
          td.textContent = '\u26A0 ' + (result.value !== null ? result.value : raw);
          td.className   = 'out-error';
          td.title       = result.error;
        } else if (result._stub) {
          td.textContent = result.value !== null ? String(result.value) : '—';
          td.className   = 'out-stub';
          td.title       = 'Stub — SQL destination not yet confirmed';
        } else {
          td.textContent = result.value !== null ? String(result.value) : '—';
          td.className   = result.value !== null ? 'out-mapped' : 'out-null';
        }
      }
      tr.appendChild(td);
    });
    expandedBodyRows.appendChild(tr);
  });
}

function renderLegend() {
  legendSidebar.innerHTML = '';
  const mappedKeys = new Set(mapping.flat().filter(k => k && k !== '__ignore__'));

  FIELD_GROUPS.forEach(g => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'legend-bar-group';

    const groupTitle = document.createElement('div');
    groupTitle.className = 'legend-group-title';
    groupTitle.innerHTML = `<span class="legend-dot" style="background:${g.color}"></span>${g.label}`;
    groupDiv.appendChild(groupTitle);

    const fieldsList = document.createElement('div');
    fieldsList.className = 'legend-fields-list' + (g.fields.length > 8 ? ' two-col' : '');

    g.fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'legend-field' + (mappedKeys.has(f.key) ? ' done' : '');
      row.innerHTML = `
        <span class="name">${f.req ? '<span class="req-dot"></span>' : ''}${f.label}</span>
        <svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      `;
      fieldsList.appendChild(row);
    });

    groupDiv.appendChild(fieldsList);
    legendSidebar.appendChild(groupDiv);
  });
}

function updateProgress() {
  const mappedColCount    = mapping.filter(keys => (keys || []).some(k => k && k !== '__ignore__')).length;
  const uniqueFieldCount  = new Set(mapping.flat().filter(k => k && k !== '__ignore__')).size;

  progressBadge.textContent = `${uniqueFieldCount} field${uniqueFieldCount !== 1 ? 's' : ''} mapped across ${mappedColCount} column${mappedColCount !== 1 ? 's' : ''}`;
  progressBadge.classList.toggle('complete', uniqueFieldCount > 0);

  const dupeCounts = {};
  mapping.forEach(keys => {
    (keys || []).filter(k => k && k !== '__ignore__').forEach(k => {
      dupeCounts[k] = (dupeCounts[k] || 0) + 1;
    });
  });
  const hasDupes = Object.values(dupeCounts).some(c => c > 1);
  const disabled = uniqueFieldCount === 0 || hasDupes;
  exportBtn.disabled = disabled;
  submitBackendBtn.disabled = disabled;
  renderStats();
}

/**
 * Recomputes and updates the three stats in the stats panel.
 * Runs ImportPipeline.processAllRows across every data row so the error count
 * reflects the full file, not just the 8-row preview.
 */
function renderStats() {
  if (!statsPanel || statsPanel.style.display === 'none') return;

  const uniqueFieldCount = new Set(mapping.flat().filter(k => k && k !== '__ignore__')).size;
  document.getElementById('statRows').textContent   = totalDataRows.toLocaleString();
  document.getElementById('statMapped').textContent = uniqueFieldCount;

  const statErrorsBlock = document.getElementById('statErrorsBlock');
  let errorCount = 0;
  if (uniqueFieldCount > 0 && allDataRows.length > 0) {
    const result = ImportPipeline.processAllRows(allDataRows, headers, mapping, fieldFormats, fieldFormatInclusive.map(v => !v));
    errorCount = result.invalid.length;
  }
  document.getElementById('statErrors').textContent = errorCount.toLocaleString();
  statErrorsBlock.classList.toggle('has-errors', errorCount > 0);
}

/**
 * After a column is mapped, finds every preview output row where that column
 * produced an error, flashes both the input and output rows, and scrolls
 * the first error row into view.
 */
function scrollToFirstColumnError(colIndex) {
  const outputTrs = Array.from(outputRows.querySelectorAll('tr'));
  const inputTrs  = Array.from(bodyRows.querySelectorAll('tr'));
  let firstErrorTr = null;

  outputTrs.forEach((tr, rowIdx) => {
    const cell = tr.querySelectorAll('td')[colIndex];
    if (cell && cell.classList.contains('out-error')) {
      if (!firstErrorTr) firstErrorTr = tr;
      flashRow(tr);
      if (inputTrs[rowIdx]) flashRow(inputTrs[rowIdx]);
    }
  });

  if (firstErrorTr) {
    firstErrorTr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/** Restarts the error-flash CSS animation on a table row. */
function flashRow(tr) {
  tr.classList.remove('error-flash');
  void tr.offsetWidth; // Force reflow so the animation restarts cleanly
  tr.classList.add('error-flash');
  tr.addEventListener('animationend', () => tr.classList.remove('error-flash'), { once: true });
}

exportBtn.addEventListener('click', () => {
  exportPanel.style.display = 'block';
  mappingList.innerHTML = '';

  headers.forEach((h, i) => {
    const keys       = mapping[i] || [];
    const isIgnored  = keys.length === 1 && keys[0] === '__ignore__';
    const activeKeys = keys.filter(k => k && k !== '__ignore__');

    if (keys.length === 0) return; // completely unassigned — skip

    if (isIgnored) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${h}</span><span class="arrow">→</span><span style="color:var(--ink-soft)">ignored</span>`;
      mappingList.appendChild(row);
    } else {
      // One summary row per mapped field
      activeKeys.forEach(fieldKey => {
        const row = document.createElement('div');
        row.className = 'row';
        const fieldMeta = FIELD_INDEX[fieldKey];
        row.innerHTML = `<span>${h}</span><span class="arrow">→</span><span class="to ${fieldMeta.group}">${fieldMeta.label}</span>`;
        mappingList.appendChild(row);
      });
    }
  });

  // Remove any previously rendered action buttons to prevent duplicates (B4)
  document.getElementById('exportActions')?.remove();
  const actions = document.createElement('div');
  actions.id = 'exportActions';
  actions.style.cssText = 'display:flex; gap:10px; margin-top:16px;';
  actions.innerHTML = `
    <button class="btn primary" id="dlJson">Download mapping.json</button>
    <button class="btn" id="dlCsv">Download remapped CSV</button>
  `;
  mappingList.after(actions);
  document.getElementById('dlJson').onclick = downloadJson;
  document.getElementById('dlCsv').onclick = downloadCsv;

  stepPill.innerHTML = '<b>Step 3</b>&nbsp;— export and hand off to the import routine';
});

function downloadJson() {
  const out = [];
  headers.forEach((h, i) => {
    const activeKeys = (mapping[i] || []).filter(k => k && k !== '__ignore__');
    activeKeys.forEach(fieldKey => {
      out.push({
        sourceHeader: h,
        mappedField:  fieldKey,
        format:       fieldFormats[i] || null,
        strict:       !fieldFormatInclusive[i],
      });
    });
  });
  const blob = new Blob([JSON.stringify({ file: currentFileName, mapping: out }, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'column-mapping.json');
}

function downloadCsv() {
  // Build entries in FIELD_GROUPS order — same as the expanded preview table
  const entries = [];
  FIELD_GROUPS.forEach(g => {
    g.fields.forEach(f => {
      headers.forEach((h, colIdx) => {
        const activeKeys = (mapping[colIdx] || []).filter(k => k && k !== '__ignore__');
        if (activeKeys.includes(f.key)) {
          entries.push({ fieldKey: f.key, colIndex: colIdx });
        }
      });
    });
  });

  if (entries.length === 0) return;

  const newHeader = entries.map(e => e.fieldKey);
  const lines = [newHeader.join(',')];

  // Use allDataRows (full file) — previewRows only holds the first 8 lines
  allDataRows.forEach(row => {
    const line = entries.map(e => {
      const raw    = row[e.colIndex] !== undefined ? row[e.colIndex] : '';
      const format = fieldFormats[e.colIndex] || '';
      const strict = !fieldFormatInclusive[e.colIndex];
      const fn     = ImportPipeline.FIELD_TRANSFORMERS[e.fieldKey];
      if (!fn) return csvEscape(raw);
      const result = fn(raw, format, strict);
      return csvEscape(result.value !== null ? String(result.value) : '');
    });
    lines.push(line.join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  triggerDownload(blob, 'remapped-export.csv');
}

function csvEscape(val) {
  const s = String(val);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Backend submission integration ───────────────────────────────────────────

function logToConsole(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${timestamp}] ${message}`;
  jobConsoleLog.appendChild(line);
  jobConsoleLog.scrollTop = jobConsoleLog.scrollHeight;
}

if (clearLogBtn) {
  clearLogBtn.addEventListener('click', () => {
    jobConsoleLog.innerHTML = '<div class="log-line system">Console cleared.</div>';
  });
}

function updateStatusBadge(status) {
  if (!jobStatusVal) return;
  jobStatusVal.textContent = status || '-';
  jobStatusVal.className = 'value badge ' + (status ? status.toLowerCase() : '');
}

function finishSubmission() {
  submitBackendBtn.disabled = false;
  resetBtn.disabled = false;
  updateProgress();
}

if (submitBackendBtn) {
  submitBackendBtn.addEventListener('click', async () => {
    // 1. Setup UI
    backendStatusPanel.style.display = 'block';
    submitBackendBtn.disabled = true;
    resetBtn.disabled = true;
    exportBtn.disabled = true;
    backendStatusPanel.scrollIntoView({ behavior: 'smooth' });

    logToConsole('Starting backend submission...', 'system');

    // 2. Prepare mapping and chunks
    const outMapping = [];
    headers.forEach((h, i) => {
      const activeKeys = (mapping[i] || []).filter(k => k && k !== '__ignore__');
      activeKeys.forEach(fieldKey => {
        outMapping.push({
          sourceHeader: h,
          mappedField:  fieldKey,
          format:       fieldFormats[i] || null,
          strict:       !fieldFormatInclusive[i]
        });
      });
    });

    const CHUNK_SIZE = 500;
    const processedRows = allDataRows.map((row, idx) => {
      const processed = ImportPipeline.processRow(row, headers, mapping, fieldFormats, idx);
      return {
        rowIndex: idx,
        contact: processed.contact,
        telephones: processed.telephones,
        pending: processed.pending,
        errors: processed.errors,
        hasStubs: processed.hasStubs
      };
    });

    const chunks = [];
    for (let i = 0; i < processedRows.length; i += CHUNK_SIZE) {
      chunks.push(processedRows.slice(i, i + CHUNK_SIZE));
    }
    const totalChunks = chunks.length;

    logToConsole(`Processed ${processedRows.length} rows into ${totalChunks} chunk(s).`, 'info');

    try {
      // 3. POST /api/jobs (CreateJob)
      logToConsole('Creating import job on backend...', 'info');
      const createRes = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: currentFileName,
          totalRows: totalDataRows,
          totalChunks: totalChunks,
          mapping: outMapping
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create job: ${createRes.status} ${errText}`);
      }

      const jobData = await createRes.json();
      const jobId = jobData.jobId;

      jobIdVal.textContent = jobId;
      updateStatusBadge(jobData.status);
      jobProgressVal.textContent = `0 / ${totalChunks} chunks`;
      jobProgressBar.style.width = '0%';

      logToConsole(`Job created successfully. Job ID: ${jobId}`, 'info');

      // 4. Sequential Chunk Upload
      for (let idx = 0; idx < totalChunks; idx++) {
        logToConsole(`Uploading chunk ${idx + 1} of ${totalChunks}...`, 'info');
        
        const chunkRes = await fetch(`${API_BASE_URL}/jobs/${jobId}/chunks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chunkIndex: idx,
            rows: chunks[idx]
          })
        });

        if (!chunkRes.ok) {
          const errText = await chunkRes.text();
          throw new Error(`Failed to upload chunk ${idx}: ${chunkRes.status} ${errText}`);
        }

        const chunkStatus = await chunkRes.json();
        logToConsole(`Chunk ${idx + 1} uploaded successfully. Chunks received by backend: ${chunkStatus.chunksReceived}/${totalChunks}`, 'info');
        
        // Update UI progress
        const percent = Math.round(((idx + 1) / totalChunks) * 100);
        jobProgressBar.style.width = `${percent}%`;
        jobProgressVal.textContent = `${idx + 1} / ${totalChunks} chunks`;
        updateStatusBadge(chunkStatus.status);
      }

      logToConsole('All chunks uploaded. Polling for processing completion...', 'system');

      // 5. Poll GET /api/jobs/{jobId}
      let pollAttempts = 0;
      const maxPollAttempts = 100; // ~3.3 minutes max
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        try {
          const statusRes = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
          if (!statusRes.ok) {
            throw new Error(`Failed to fetch job status: ${statusRes.status}`);
          }

          const statusData = await statusRes.json();
          updateStatusBadge(statusData.status);
          jobProgressVal.textContent = `${statusData.chunksReceived} / ${totalChunks} chunks`;
          
          if (statusData.status === 'Completed') {
            clearInterval(pollInterval);
            logToConsole('Job completed successfully! All records imported.', 'info');
            finishSubmission();
          } else if (statusData.status === 'Failed') {
            clearInterval(pollInterval);
            logToConsole(`Job failed. ${statusData.failedChunkCount} chunk(s) had errors.`, 'error');
            if (statusData.chunkErrors && statusData.chunkErrors.length > 0) {
              statusData.chunkErrors.forEach(ce => {
                logToConsole(
                  `  Chunk ${ce.chunkIndex}: ${ce.failedRowCount}/${ce.totalRowCount} rows failed`,
                  'error'
                );
                ce.rowErrors.forEach(e => logToConsole(`    • ${e}`, 'error'));
              });
            } else if (statusData.errorMessage) {
              logToConsole(`  Error: ${statusData.errorMessage}`, 'error');
            }
            finishSubmission();
          } else if (pollAttempts >= maxPollAttempts) {
            clearInterval(pollInterval);
            logToConsole('Polling timed out before job completion.', 'warn');
            finishSubmission();
          } else {
            logToConsole(`Backend status: ${statusData.status}...`, 'info');
          }
        } catch (err) {
          clearInterval(pollInterval);
          logToConsole(`Error during polling: ${err.message}`, 'error');
          finishSubmission();
        }
      }, 2000);

    } catch (err) {
      logToConsole(`Submission failed: ${err.message}`, 'error');
      updateStatusBadge('Failed');
      finishSubmission();
    }
  });
}
