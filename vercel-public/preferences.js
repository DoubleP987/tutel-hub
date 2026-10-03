(() => {
  const categories = [
    ['public', 'วันหยุดราชการ'],
    ['substitute', 'วันหยุดชดเชย'],
    ['bank', 'วันหยุดธนาคาร'],
    ['buddhist', 'วันสำคัญทางพุทธศาสนา'],
    ['holy', 'วันพระ'],
    ['royal', 'วันสำคัญสถาบันพระมหากษัตริย์'],
    ['festival', 'เทศกาลและประเพณี'],
    ['thai', 'วันสำคัญไทย'],
    ['international', 'วันสำคัญสากล'],
    ['custom', 'กิจกรรมที่เพิ่มเอง'],
  ];
  const key = 'tutel.display.v1',
    media = matchMedia('(prefers-color-scheme: dark)');
  let prefs = { theme: 'system', filters: categories.map((c) => c[0]) };
  try {
    prefs = { ...prefs, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {}
  const safe = () => {
    if (!['system', 'light', 'dark'].includes(prefs.theme)) prefs.theme = 'system';
    if (!Array.isArray(prefs.filters)) prefs.filters = categories.map((c) => c[0]);
  };
  function theme() {
    safe();
    document.documentElement.dataset.theme =
      prefs.theme === 'system' ? (media.matches ? 'dark' : 'light') : prefs.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        document.documentElement.dataset.theme === 'dark' ? '#131314' : '#4285f4',
      );
  }
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {}
    theme();
    window.dispatchEvent(new CustomEvent('tutel:display', { detail: { ...prefs } }));
  }
  theme();
  media.addEventListener('change', theme);
  window.TutelPrefs = {
    categories,
    change: (value) => {
      prefs = { ...prefs, ...value };
      persist();
      refresh();
    },
    get: () => ({ ...prefs, filters: [...prefs.filters] }),
    set: (value) => {
      prefs = { ...prefs, ...value };
      // Keep the restored account theme available before the next login.
      try {
        localStorage.setItem(key, JSON.stringify(prefs));
      } catch {}
      theme();
      refresh();
    },
    visible: (event) =>
      (
        event.categories || [
          event.systemHoliday ? (event.publicHoliday ? 'public' : 'thai') : 'custom',
        ]
      ).some((id) => prefs.filters.includes(id)),
  };
  let promptInstall, installDialog;
  const installCooldown = 'tutel.install.dismissed';
  function hideInstall() {
    installDialog?.close();
    installDialog?.remove();
    installDialog = null;
  }
  function deferInstall() {
    try {
      localStorage.setItem(installCooldown, String(Date.now()));
    } catch {}
    hideInstall();
  }
  function showInstall() {
    if (
      !promptInstall ||
      !document.body ||
      installDialog ||
      !/Android/i.test(navigator.userAgent) ||
      matchMedia('(display-mode: standalone)').matches
    )
      return;
    try {
      if (Date.now() - Number(localStorage.getItem(installCooldown) || 0) < 7 * 86400000) return;
    } catch {}
    installDialog = document.createElement('dialog');
    installDialog.className = 'install-dialog';
    installDialog.innerHTML =
      '<img src="/app-icon.png" alt="" width="64" height="64"><h2>ติดตั้ง Tutel📅</h2><p>เปิดใช้งานจากหน้าจอหลักได้สะดวกขึ้น</p><div class="actions"><button class="ghost" data-later>ไว้ทีหลัง</button><button class="primary" data-install>ติดตั้ง</button></div>';
    document.body.append(installDialog);
    installDialog.querySelector('[data-later]').onclick = deferInstall;
    installDialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      deferInstall();
    });
    installDialog.querySelector('[data-install]').onclick = async () => {
      const pending = promptInstall;
      promptInstall = null;
      hideInstall();
      try {
        await pending.prompt();
        const choice = await pending.userChoice;
        if (choice.outcome === 'dismissed') deferInstall();
      } catch {}
    };
    installDialog.showModal();
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstall = e;
    showInstall();
  });
  window.addEventListener('appinstalled', () => {
    promptInstall = null;
    hideInstall();
  });
  function refresh() {
    document
      .querySelectorAll('[data-display-category]')
      .forEach((x) => (x.checked = prefs.filters.includes(x.dataset.displayCategory)));
    const select = document.querySelector('#device-theme');
    if (select) select.value = prefs.theme;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const installed =
      matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    let showWelcome = installed;
    try {
      if (Date.now() - Number(sessionStorage.getItem('tutel.launch') || 0) < 30000)
        showWelcome = false;
      if (showWelcome) sessionStorage.setItem('tutel.launch', String(Date.now()));
    } catch {}
    if (showWelcome) {
      const welcome = document.createElement('div');
      welcome.className = 'tutel-launch';
      welcome.setAttribute('role', 'status');
      welcome.setAttribute('aria-label', 'กำลังเปิด Tutel');
      welcome.innerHTML =
        '<div class="launch-orbit"><img src="/app-icon.png" alt=""></div><h1>Tutel📅</h1><p>ปฏิทินของคุณ พร้อมทุกวัน</p><div class="launch-dots" aria-hidden="true"><i></i><i></i><i></i></div>';
      document.body.append(welcome);
      setTimeout(
        () => {
          welcome.classList.add('launch-finished');
          setTimeout(() => welcome.remove(), 300);
        },
        matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1000,
      );
    }
    const header = document.querySelector('.topbar');
    if (!header) return;
    const scrollPositions = new WeakMap();
    let windowPosition = window.scrollY;
    document.addEventListener(
      'scroll',
      (e) => {
        if (!matchMedia('(max-width: 749px)').matches) {
          header.classList.remove('mobile-header-hidden');
          return;
        }
        const page =
          e.target === document ||
          e.target === document.documentElement ||
          e.target === document.body;
        const current = page ? window.scrollY : e.target.scrollTop,
          previous = page ? windowPosition : scrollPositions.get(e.target) || 0;
        if (page) windowPosition = current;
        else scrollPositions.set(e.target, current);
        if (current < 12 || current < previous - 3) header.classList.remove('mobile-header-hidden');
        else if (current > 32 && current > previous + 3 && !document.querySelector('dialog[open]'))
          header.classList.add('mobile-header-hidden');
      },
      { passive: true, capture: true },
    );
    const actions = document.createElement('div');
    actions.className = 'display-actions';
    actions.innerHTML =
      '<button class="ghost" id="display-settings" aria-label="ตั้งค่าการแสดงผล">⚙ แสดงผล</button>';
    header.append(actions);
    const dialog = document.createElement('dialog');
    dialog.id = 'display-dialog';
    dialog.innerHTML =
      '<div class="dialog-head"><h2>ตั้งค่าการแสดงผล</h2><button class="icon-btn" id="close-display" aria-label="ปิดการตั้งค่า">×</button></div><label>ธีม<select id="device-theme"><option value="system">ตามอุปกรณ์</option><option value="light">สว่าง</option><option value="dark">มืด</option></select></label><h3>หมวดที่แสดงบนปฏิทิน</h3><p class="muted">ตัวเลือกนี้เปลี่ยนเฉพาะการแสดงผล การส่ง Discord ตั้งแยกในหน้าแจ้งเตือน</p><div class="filter-grid">' +
      categories
        .map(
          ([id, label]) =>
            '<label class="check-row"><input type="checkbox" data-display-category="' +
            id +
            '">' +
            label +
            '</label>',
        )
        .join('') +
      '</div><div class="actions"><button class="ghost" id="show-all-categories">เลือกทั้งหมด</button><button class="ghost" id="hide-all-categories">ล้างตัวเลือก</button></div><p class="muted">จำการตั้งค่าบนอุปกรณ์นี้โดยอัตโนมัติ</p>';
    document.body.append(dialog);
    document.querySelector('#display-settings').onclick = () => {
      refresh();
      dialog.showModal();
    };
    document.querySelector('#close-display').onclick = () => dialog.close();
    document.querySelector('#device-theme').onchange = (e) => {
      prefs.theme = e.target.value;
      persist();
    };
    document.querySelectorAll('[data-display-category]').forEach(
      (x) =>
        (x.onchange = () => {
          prefs.filters = [...document.querySelectorAll('[data-display-category]:checked')].map(
            (x) => x.dataset.displayCategory,
          );
          persist();
        }),
    );
    for (const [id, all] of [
      ['show-all-categories', true],
      ['hide-all-categories', false],
    ])
      document.querySelector('#' + id).onclick = () => {
        prefs.filters = all ? categories.map((c) => c[0]) : [];
        refresh();
        persist();
      };
    refresh();
    showInstall();
    if ('serviceWorker' in navigator && window.isSecureContext)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
})();
