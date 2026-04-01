document.addEventListener('DOMContentLoaded', () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  // Current time
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  document.getElementById('currentTime').textContent = timeStr;

  // Timezone abbreviation
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  }).formatToParts(now);
  const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
  document.getElementById('tzName').textContent = `${tzAbbr} — ${tz.replace(/_/g, ' ')}`;

  // Local tz display
  document.getElementById('localTz').textContent = tz.replace(/_/g, ' ');

  // UTC offset
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mm = String(absMin % 60).padStart(2, '0');
  document.getElementById('utcOffset').textContent = `UTC${sign}${hh}:${mm}`;

  // DST check
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const janOff = jan.getTimezoneOffset();
  const julOff = jul.getTimezoneOffset();

  const dstEl = document.getElementById('dstStatus');
  if (janOff === julOff) {
    dstEl.innerHTML = '<span class="dst-badge dst-no">No DST</span>';
  } else {
    const isDST = now.getTimezoneOffset() !== Math.max(janOff, julOff);
    dstEl.innerHTML = isDST
      ? '<span class="dst-badge dst-yes">Active (DST)</span>'
      : '<span class="dst-badge dst-no">Inactive (Standard)</span>';
  }

  // Update time every second
  setInterval(() => {
    const t = new Date().toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    document.getElementById('currentTime').textContent = t;
  }, 1000);
});
