// dashboard.js — job list fetch and render

(function () {
  'use strict';

  const loading      = document.getElementById('jobsLoading');
  const emptyState   = document.getElementById('jobsEmpty');
  const errorState   = document.getElementById('jobsError');
  const tableWrap    = document.getElementById('jobsTableWrap');
  const tbody        = document.getElementById('jobsBody');

  // Status badge colour mapping (mirrors token variable names)
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

  function buildDetailUrl(jobId) {
    // JOB_DETAIL_BASE is injected by the Jinja2 template as a string
    // e.g.  "/dashboard/__id__"  — we swap the placeholder.
    return JOB_DETAIL_BASE.replace('__id__', encodeURIComponent(jobId));
  }

  function renderJobs(jobs) {
    tbody.innerHTML = '';
    jobs.forEach(job => {
      const tr = document.createElement('tr');
      tr.className = 'job-row';
      tr.setAttribute('role', 'link');
      tr.setAttribute('tabindex', '0');
      tr.title = 'View job details';

      const badgeClass = STATUS_CLASS[job.status] || 'badge-pending';

      tr.innerHTML = `
        <td class="job-id"><code>${job.jobId ?? '—'}</code></td>
        <td class="job-file">${job.fileName ?? '—'}</td>
        <td class="job-date">${formatDate(job.submittedAt)}</td>
        <td class="job-rows">${job.totalRows != null ? job.totalRows.toLocaleString() : '—'}</td>
        <td><span class="status-badge ${badgeClass}">${job.status ?? '—'}</span></td>
      `;

      const url = buildDetailUrl(job.jobId);
      tr.addEventListener('click', () => { window.location.href = url; });
      tr.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = url; }
      });

      tbody.appendChild(tr);
    });
  }

  async function loadJobs() {
    try {
      const resp = await fetch('/api/proxy/jobs');

      if (resp.status === 401) {
        window.location.href = '/login?next=/dashboard';
        return;
      }
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }

      const jobs = await resp.json();

      loading.style.display = 'none';

      if (!jobs.length) {
        emptyState.style.display = '';
        return;
      }

      renderJobs(jobs);
      tableWrap.style.display = '';

    } catch (err) {
      loading.style.display     = 'none';
      errorState.style.display  = '';
      errorState.textContent    = `Could not load jobs: ${err.message}`;
    }
  }

  loadJobs();
}());
