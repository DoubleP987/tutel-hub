(() => {
  const output = document.querySelector('#bot-log-output');
  const status = document.querySelector('#bot-log-status');
  const live = document.querySelector('#bot-log-live');
  const page = document.querySelector('#logs-page');
  if (!output) return;
  let instance = '',
    cursor = 0,
    node = '',
    loading = false,
    lines = [];
  async function refresh() {
    if (
      loading ||
      document.hidden ||
      page.classList.contains('hidden') ||
      output.closest('.admin-only').classList.contains('hidden')
    )
      return;
    loading = true;
    try {
      const response = await fetch(
        `/api/bot/logs?after=${cursor}&instance=${encodeURIComponent(instance)}`,
        {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok)
        throw new Error(response.status === 403 ? 'เฉพาะผู้ดูแลเท่านั้น' : 'โหลด log ไม่สำเร็จ');
      const data = await response.json();
      if (
        (instance && instance !== data.instance) ||
        (node && node !== data.node) ||
        data.latest < cursor
      ) {
        lines = [];
        cursor = 0;
      }
      node = data.node;
      instance = data.instance;
      const stick = output.scrollHeight - output.scrollTop - output.clientHeight < 50;
      for (const entry of data.entries)
        lines.push(
          `${new Date(entry.at).toLocaleTimeString('th-TH')} [${entry.level}] ${entry.text}`,
        );
      lines = lines.slice(-500);
      cursor = data.latest;
      output.textContent = lines.join('\n');
      if (stick) output.scrollTop = output.scrollHeight;
      status.textContent = `เครื่อง ${node} · ${lines.length} บรรทัดล่าสุด · ${live.checked ? 'อัปเดตสดทุก 3 วินาที' : 'พักการอัปเดต'}`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      loading = false;
    }
  }
  document.querySelector('#bot-log-refresh').onclick = refresh;
  document.querySelector('#bot-log-clear').onclick = () => {
    lines = [];
    output.textContent = '';
  };
  live.onchange = () => {
    if (live.checked) void refresh();
  };
  new MutationObserver(() => {
    if (live.checked) void refresh();
  }).observe(page, { attributes: true, attributeFilter: ['class'] });
  setInterval(() => {
    if (live.checked) void refresh();
  }, 3000);
})();
