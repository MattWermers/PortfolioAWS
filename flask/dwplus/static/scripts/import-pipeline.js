/**
 * import-pipeline.js
 *
 * Transforms and validates mapped import rows into SQL-ready payloads.
 * Runs entirely in the browser before data is chunked and sent to Azure.
 *
 * Pattern:
 *   FIELD_TRANSFORMERS[fieldKey](rawValue, format) → { value, error [, _stub] }
 *   processRow(rawRow, headers, mapping, fieldFormats, rowIndex) → structured payload
 *   processAllRows(allDataRows, headers, mapping, fieldFormats)  → { valid, invalid, stubFields }
 *
 * Dev testing from the browser console:
 *   ImportPipeline.testField('dob', '04/02/1978', 'MM/DD/YYYY')
 *   ImportPipeline.testField('dob', '02-Apr-1978', 'DD-MMM-YYYY')
 *   ImportPipeline.testField('email', 'Test@Example.COM')
 */

'use strict';

// ─── Schema map ───────────────────────────────────────────────────────────────
// Maps each import fieldKey to its confirmed SQL destination.
// _stub: true  → transformer may be implemented but target table/column is not yet confirmed.
//               These fields pass through as-is in the `pending` output bucket.

const SCHEMA_MAP = {

  // ── Contact table ─────────────────────────────────────────────────────────
  lastName:      { table: 'Contact', column: 'LastName',   type: 'nvarchar', maxLength: 64,  nullable: true  },
  firstName:     { table: 'Contact', column: 'FirstName',  type: 'nvarchar', maxLength: 30,  nullable: true  },
  middleInitial: { table: 'Contact', column: 'MiddleInit', type: 'nvarchar', maxLength: 1,   nullable: true  },
  address1:      { table: 'Contact', column: 'Address1',   type: 'nvarchar', maxLength: 50,  nullable: true  },
  address2:      { table: 'Contact', column: 'Address2',   type: 'nvarchar', maxLength: 50,  nullable: true  },
  city:          { table: 'Contact', column: 'City',       type: 'nvarchar', maxLength: 30,  nullable: true  },
  state:         { table: 'Contact', column: 'State',      type: 'nvarchar', maxLength: 3,   nullable: true  },
  zip:           { table: 'Contact', column: 'PostalCode', type: 'nvarchar', maxLength: 12,  nullable: true  },
  email:         { table: 'Contact', column: 'Email',      type: 'nvarchar', maxLength: 80,  nullable: true  },

  // ── ContactTelephone table (each phone = separate SQL row) ────────────────
  phoneHome:   { table: 'ContactTelephone', column: 'PhoneNumber', caption: 'Home',   type: 'varchar', maxLength: 50, nullable: false },
  phoneMobile: { table: 'ContactTelephone', column: 'PhoneNumber', caption: 'Mobile', type: 'varchar', maxLength: 50, nullable: false },
  phoneWork:   { table: 'ContactTelephone', column: 'PhoneNumber', caption: 'Work',   type: 'varchar', maxLength: 50, nullable: false },

  // ── STUB: Patient table — target table/column not yet confirmed ───────────
  dob:           { table: 'UNKNOWN', column: 'UNKNOWN', type: 'date',    nullable: true, _stub: true },
  ssn:           { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  sex:           { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  accountNumber: { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },

  // ── STUB: Insurance tables — schema not yet confirmed ─────────────────────
  insCompanyName:    { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  insPayerId:        { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  insPolicyNumber:   { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  insGroupNumber:    { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  insSubscriberName: { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  insSubscriberDob:  { table: 'UNKNOWN', column: 'UNKNOWN', type: 'date',    nullable: true, _stub: true },
  insRelationship:   { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  insRank:           { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },

  // ── STUB: Ledger tables — schema not yet confirmed ────────────────────────
  dos:              { table: 'UNKNOWN', column: 'UNKNOWN', type: 'date',    nullable: true, _stub: true },
  procCode:         { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  procDescription:  { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  chargeAmount:     { table: 'UNKNOWN', column: 'UNKNOWN', type: 'decimal', nullable: true, _stub: true },
  paymentAmount:    { table: 'UNKNOWN', column: 'UNKNOWN', type: 'decimal', nullable: true, _stub: true },
  adjustmentAmount: { table: 'UNKNOWN', column: 'UNKNOWN', type: 'decimal', nullable: true, _stub: true },
  balance:          { table: 'UNKNOWN', column: 'UNKNOWN', type: 'decimal', nullable: true, _stub: true },
  providerName:     { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
  providerId:       { table: 'UNKNOWN', column: 'UNKNOWN', type: 'varchar', nullable: true, _stub: true },
};


// ─── Primitive transformers ───────────────────────────────────────────────────
// Each returns { value, error }.
// value: SQL-ready value, or null if blank/unparseable.
// error: human-readable string, or null if ok.

function transformText(raw, { maxLength } = {}) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { value: null, error: null };
  }
  let s = String(raw).trim();
  if (maxLength && s.length > maxLength) {
    // Truncate silently — the column constraint determines what's acceptable.
    // Callers may promote this to an error if needed.
    s = s.substring(0, maxLength);
  }
  return { value: s, error: null };
}

/**
 * Normalises a date string to ISO 8601 (YYYY-MM-DD) using the user-selected format.
 * Supported formats match the FORMAT_PRESETS['date'] list in app.js.
 */
function transformDate(raw, format, strict = true) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { value: null, error: null };
  }
  const s = String(raw).trim();
  const MONTH_ABBR = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  let year, month, day;
  let formatMatched = false;
  let formatError = null;

  try {
    if (format === 'YYYY-MM-DD') {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) { [, year, month, day] = m; formatMatched = true; }
      else formatError = `Cannot parse "${s}" as YYYY-MM-DD`;
    } else if (format === 'MM/DD/YYYY') {
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) { [, month, day, year] = m; formatMatched = true; }
      else formatError = `Cannot parse "${s}" as MM/DD/YYYY`;
    } else if (format === 'DD/MM/YYYY') {
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) { [, day, month, year] = m; formatMatched = true; }
      else formatError = `Cannot parse "${s}" as DD/MM/YYYY`;
    } else if (format === 'DD-MMM-YYYY') {
      const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (m) {
        day = m[1];
        month = MONTH_ABBR[m[2].toLowerCase()];
        year = m[3];
        if (month) formatMatched = true;
        else formatError = `Unknown month abbreviation "${m[2]}"`;
      } else {
        formatError = `Cannot parse "${s}" as DD-MMM-YYYY`;
      }
    }

    if (format && !formatMatched) {
      if (strict) return { value: null, error: formatError };
    }

    if (!formatMatched) {
      // Date only — database requires YYYY-MM-DD; never append artificial time data
      const dateOnlyStr = s.includes('T') ? s.split('T')[0] : (s.includes(' ') && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.split(' ')[0] : s);
      const d = new Date(dateOnlyStr);
      if (isNaN(d.getTime())) {
        return { value: null, error: formatError || `Cannot parse date "${s}" — no matching format` };
      }
      year = d.getUTCFullYear(); month = d.getUTCMonth() + 1; day = d.getUTCDate();
    }

    const y = parseInt(year, 10), mo = parseInt(month, 10), d = parseInt(day, 10);
    if (y < 1900 || y > 2100) return { value: null, error: `Year ${y} is out of range (1900\u20132100)` };
    if (mo < 1   || mo > 12)  return { value: null, error: `Month ${mo} is out of range (1\u201312)` };

    const maxDay = new Date(y, mo, 0).getDate();
    if (d < 1 || d > maxDay) {
      const monthName = new Date(y, mo - 1).toLocaleString('en-US', { month: 'long' });
      return { value: null, error: `Day ${d} is invalid for ${monthName} ${y} (max ${maxDay})` };
    }

    const iso = `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return { value: iso, error: null };

  } catch (e) {
    return { value: null, error: `Date parse exception: ${e.message}` };
  }
}

function transformPhone(raw, format, strict = true) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { value: null, error: null };
  }
  const s = String(raw).trim();

  if (format) {
    let matched = false;
    let formatError = null;
    if (format === '(XXX) XXX-XXXX') {
      if (/^\(\d{3}\)\s*\d{3}-\d{4}$/.test(s)) matched = true;
      else formatError = `Cannot parse "${s}" as (XXX) XXX-XXXX`;
    } else if (format === 'XXX-XXX-XXXX') {
      if (/^\d{3}-\d{3}-\d{4}$/.test(s)) matched = true;
      else formatError = `Cannot parse "${s}" as XXX-XXX-XXXX`;
    } else if (format === 'Digits only') {
      if (/^\d+$/.test(s)) matched = true;
      else formatError = `Cannot parse "${s}" as Digits only`;
    }

    if (!matched && strict && formatError) {
      return { value: null, error: formatError };
    }
  }

  let digits = s.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }

  if (digits.length !== 10) {
    return { value: null, error: `Phone "${raw}" must contain exactly 10 digits (got ${digits.length})` };
  }
  
  return { value: digits, error: null };
}

/**
 * Strips $ and , and returns a JS number (2 decimal places).
 *
 * TODO: Return to this logic when finalizing accounting/ledger schemas (e.g. handle
 * accounting parenthesis notation `($100.00)`, rounding, and ledger database constraints).
 */
function transformCurrency(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { value: null, error: null };
  }
  const cleaned = String(raw).replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return { value: null, error: `Cannot parse "${raw}" as a currency amount` };
  return { value: Math.round(n * 100) / 100, error: null };
}

/**
 * Pass-through placeholder for fields whose SQL column is not yet confirmed.
 * Trims whitespace, preserves the raw value, and marks the result as a stub.
 *
 * TODO: Replace with a real transformer once the schema is known.
 */
function stubTransformer(fieldKey, raw) {
  const trimmed = (raw === null || raw === undefined || String(raw).trim() === '')
    ? null
    : String(raw).trim();
  return { value: trimmed, error: null, _stub: true };
}


// ─── Field transformer map ────────────────────────────────────────────────────
// Signature: (rawValue: string, format: string) → { value, error [, _stub] }

const FIELD_TRANSFORMERS = {

  // Contact — IMPLEMENTED ────────────────────────────────────────────────────
  lastName:      (v)       => transformText(v, { maxLength: 64 }),
  firstName:     (v)       => transformText(v, { maxLength: 30 }),
  middleInitial: (v)       => transformText(v, { maxLength: 1  }),
  address1:      (v)       => transformText(v, { maxLength: 50 }),
  address2:      (v)       => transformText(v, { maxLength: 50 }),
  city:          (v)       => transformText(v, { maxLength: 30 }),
  state:         (v)       => {
    const r = transformText(v, { maxLength: 3 });
    if (r.value) r.value = r.value.toUpperCase();
    return r;
  },
  zip:           (v)       => transformText(v, { maxLength: 12 }),
  email:         (v)       => {
    const r = transformText(v, { maxLength: 80 });
    if (r.value) r.value = r.value.toLowerCase();
    return r;
  },

  // ContactTelephone — IMPLEMENTED ──────────────────────────────────────────
  phoneHome:   (v, fmt, strict) => transformPhone(v, fmt, strict),
  phoneMobile: (v, fmt, strict) => transformPhone(v, fmt, strict),
  phoneWork:   (v, fmt, strict) => transformPhone(v, fmt, strict),

  // Patient table — transformer IMPLEMENTED, schema STUB ────────────────────
  dob: (v, fmt, strict) => {
    const result = transformDate(v, fmt, strict);
    if (result.error || result.value === null) return result;
    // DOB-specific rule: must not be in the future
    const todayIso = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    if (result.value > todayIso) {
      return { value: null, error: `Date of birth "${result.value}" cannot be in the future` };
    }
    return result;
  },
  ssn:           (v)      => stubTransformer('ssn', v),           // TODO: normalize/mask when schema confirmed
  sex:           (v)      => stubTransformer('sex', v),           // TODO: normalize to M/F/U
  accountNumber: (v)      => stubTransformer('accountNumber', v), // TODO: map to correct column

  // Insurance — STUB ────────────────────────────────────────────────────────
  insCompanyName:    (v)      => stubTransformer('insCompanyName', v),
  insPayerId:        (v)      => stubTransformer('insPayerId', v),
  insPolicyNumber:   (v)      => stubTransformer('insPolicyNumber', v),
  insGroupNumber:    (v)      => stubTransformer('insGroupNumber', v),
  insSubscriberName: (v)      => stubTransformer('insSubscriberName', v),
  insSubscriberDob:  (v, fmt, strict) => transformDate(v, fmt, strict),  // ✓ transformer done; SQL column TBD
  insRelationship:   (v)      => stubTransformer('insRelationship', v),
  insRank:           (v)      => stubTransformer('insRank', v),

  // Ledger — STUB (currency/date transformers implemented) ──────────────────
  dos:              (v, fmt, strict) => transformDate(v, fmt, strict),   // ✓ transformer done; SQL column TBD
  procCode:         (v)      => stubTransformer('procCode', v),
  procDescription:  (v)      => stubTransformer('procDescription', v),
  chargeAmount:     (v)      => transformCurrency(v),    // ✓ transformer done; SQL column TBD
  paymentAmount:    (v)      => transformCurrency(v),
  adjustmentAmount: (v)      => transformCurrency(v),
  balance:          (v)      => transformCurrency(v),
  providerName:     (v)      => stubTransformer('providerName', v),
  providerId:       (v)      => stubTransformer('providerId', v),
};


// ─── Row & batch processors ───────────────────────────────────────────────────

/**
 * Transforms a single raw row into a structured SQL-ready payload.
 *
 * Output shape:
 * {
 *   contact:    { LastName, FirstName, ... }             — confirmed Contact columns
 *   telephones: [{ Caption, PhoneNumber, IsPrimary }]    — ContactTelephone rows
 *   pending:    { dob, accountNumber, ssn, ... }         — stub fields (schema TBD)
 *   errors:     ['Row 3 [DOB]: Cannot parse ...']        — transform errors
 *   hasStubs:   true | false
 * }
 */
function processRow(rawRow, headers, mapping, fieldFormats, fieldFormatStrict, rowIndex) {
  const contact    = {};
  const telephones = [];
  const pending    = {};
  const errors     = [];

  mapping.forEach((fieldKeys, colIdx) => {
    // Accept both the legacy single-string format and the new string[] format
    const keys = Array.isArray(fieldKeys)
      ? fieldKeys.filter(k => k && k !== '__ignore__')
      : (fieldKeys && fieldKeys !== '__ignore__' ? [fieldKeys] : []);

    if (keys.length === 0) return;

    const raw    = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
    const format = fieldFormats[colIdx] || '';

    keys.forEach(fieldKey => {
      const schema = SCHEMA_MAP[fieldKey];
      const fn     = FIELD_TRANSFORMERS[fieldKey];

      if (!fn) {
        errors.push(`Row ${rowIndex + 1}: no transformer registered for field "${fieldKey}"`);
        return;
      }

      const strict = fieldFormatStrict && fieldFormatStrict[colIdx] !== false;
      const result = fn(raw, format, strict);

      if (result.error) {
        errors.push(`Row ${rowIndex + 1} [${headers[colIdx] || fieldKey}]: ${result.error}`);
      }

      // Stub fields → pending bucket regardless of whether the transformer ran
      if (schema && schema._stub) {
        pending[fieldKey] = result.value;
        return;
      }

      // Route to the correct output bucket
      if (schema && schema.table === 'ContactTelephone') {
        if (result.value !== null) {
          telephones.push({
            Caption:     schema.caption,
            PhoneNumber: result.value,
            IsPrimary:   schema.caption === 'Home',  // TODO: confirm primary logic with schema
          });
        }
      } else if (schema) {
        contact[schema.column] = result.value;
      }
    });
  });

  return { contact, telephones, pending, errors, hasStubs: Object.keys(pending).length > 0 };
}

/**
 * Processes all data rows.
 *
 * @returns {{
 *   valid:      Array,   — rows with no transform errors
 *   invalid:    Array,   — rows with at least one error
 *   stubFields: string[] — fieldKeys that are still stubs (for reporting)
 * }}
 */
function processAllRows(allDataRows, headers, mapping, fieldFormats, fieldFormatStrict) {
  const valid   = [];
  const invalid = [];

  const stubFields = [...new Set(
    mapping.flat().filter(k => k && k !== '__ignore__' && SCHEMA_MAP[k] && SCHEMA_MAP[k]._stub)
  )];

  allDataRows.forEach((rawRow, i) => {
    const result = processRow(rawRow, headers, mapping, fieldFormats, fieldFormatStrict, i);
    if (result.errors.length > 0) {
      invalid.push({ rowIndex: i, ...result });
    } else {
      valid.push({ rowIndex: i, ...result });
    }
  });

  if (stubFields.length > 0) {
    console.warn(
      `[ImportPipeline] ${stubFields.length} stub field(s) passed through without SQL mapping:`,
      stubFields
    );
  }

  return { valid, invalid, stubFields };
}

/**
 * Splits processed rows into fixed-size chunks for Azure queue submission.
 * Each chunk becomes one blob + one queue message.
 */
function chunkRows(rows, chunkSize = 500) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  return chunks;
}


// ─── Dev / test helper ────────────────────────────────────────────────────────

/**
 * Tests a single field transformer from the browser console.
 * Returns the result object so it can be inspected further.
 *
 * Examples:
 *   ImportPipeline.testField('dob', '04/02/1978', 'MM/DD/YYYY')
 *   ImportPipeline.testField('dob', '02-Apr-1978', 'DD-MMM-YYYY')
 *   ImportPipeline.testField('dob', '1978-04-02', 'YYYY-MM-DD')
 *   ImportPipeline.testField('phoneHome', '(555) 123-4567')
 *   ImportPipeline.testField('chargeAmount', '$1,234.56')
 *   ImportPipeline.testField('firstName', 'A very long first name that exceeds thirty chars')
 */
function testField(fieldKey, rawValue, format = '') {
  const fn = FIELD_TRANSFORMERS[fieldKey];
  if (!fn) {
    console.error(`[ImportPipeline] No transformer registered for field: "${fieldKey}"`);
    return undefined;
  }

  const result = fn(rawValue, format);
  const schema = SCHEMA_MAP[fieldKey] || {};
  const dest   = schema._stub
    ? '⚠ UNKNOWN — SQL destination not yet confirmed'
    : `${schema.table}.${schema.column} (${schema.type}${schema.maxLength ? `(${schema.maxLength})` : ''})`;

  console.group(
    `%c[ImportPipeline] testField("${fieldKey}", "${rawValue}"${format ? `, "${format}"` : ''})`,
    'color:#2C5282;font-weight:bold'
  );
  console.log('Input :', rawValue);
  if (format) console.log('Format:', format);
  console.log('Output:', result.value);
  if (result.error)  console.warn ('Error :', result.error);
  if (result._stub)  console.info ('Note  :', 'Stub transformer — value passes through as-is');
  console.log('SQL   :', dest);
  console.groupEnd();

  return result;
}


// ─── Public API ───────────────────────────────────────────────────────────────

const ImportPipeline = {
  // Main entry points
  processAllRows,
  processRow,
  chunkRows,

  // Dev tooling
  testField,

  // Exposed for inspection / extension
  SCHEMA_MAP,
  FIELD_TRANSFORMERS,
};

// Support both browser global and CommonJS (Node test runner)
if (typeof module !== 'undefined' && module.exports) module.exports = ImportPipeline;
else window.ImportPipeline = ImportPipeline;
