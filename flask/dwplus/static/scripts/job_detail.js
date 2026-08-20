// job_detail.js — fetch and render a single job

(function () {
  'use strict';

  const loading       = document.getElementById('detailLoading');
  const errorEl       = document.getElementById('detailError');
  const metaSection   = document.getElementById('detailMetaSection');
  const detailGrid    = document.getElementById('detailGrid');
  const detailMeta    = document.getElementById('detailMeta');
  const detailBadge   = document.getElementById('detailBadge');

  const STATUS_CLASS = {
    Pending:    'badge-pending',
    Processing: 'badge-processing',
    Completed:  'badge-completed',
    Failed:     'badge-failed',
    Cancelled:  'badge-cancelled',
  };

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function metaItem(label, value) {
    const el = document.createElement('div');
    el.className = 'detail-meta-item';
    el.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${value}</span>`;
    return el;
  }

  function renderDetail(job) {
    // Sub-header line
    detailMeta.textContent = `${job.fileName ?? '—'}  ·  submitted ${formatDate(job.submittedAt)}`;

    // Status badge
    const badgeClass = STATUS_CLASS[job.status] || 'badge-pending';
    detailBadge.textContent  = job.status ?? '—';
    detailBadge.className    = `status-badge ${badgeClass}`;

    // Metadata grid
    detailGrid.appendChild(metaItem('File',        job.fileName      ?? '—'));
    detailGrid.appendChild(metaItem('Submitted',   formatDate(job.submittedAt)));
    detailGrid.appendChild(metaItem('Total rows',  job.totalRows     != null ? job.totalRows.toLocaleString()     : '—'));
    detailGrid.appendChild(metaItem('Chunks',      job.totalChunks   != null ? job.totalChunks.toLocaleString()   : '—'));
    detailGrid.appendChild(metaItem('Status',      job.status        ?? '—'));

    metaSection.style.display = '';
  }

  async function loadJob() {
    try {
      const resp = await fetch(`/api/proxy/jobs/${encodeURIComponent(JOB_ID)}`);

      if (resp.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (resp.status === 404) {
        // Stub state — proxy not yet wired to Azure SQL
        loading.style.display  = 'none';
        detailMeta.textContent = 'Job data not yet available — backend integration pending.';
        return;
      }

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }

      const job = await resp.json();
      loading.style.display = 'none';
      renderDetail(job);

    } catch (err) {
      loading.style.display = 'none';
      errorEl.style.display  = '';
      errorEl.textContent    = `Could not load job: ${err.message}`;
    }
  }

  loadJob();
}());
