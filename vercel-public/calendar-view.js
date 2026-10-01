(() => {
  const TZ = 'Asia/Bangkok',
    DAY = 86400000;
  const escape = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const parts = (value) =>
    Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(value))
        .map((x) => [x.type, x.value]),
    );
  const key = (value) => {
    const p = parts(value);
    return p.year + '-' + p.month + '-' + p.day;
  };
  const date = (day) => new Date(day + 'T12:00:00Z'),
    shift = (day, n) => new Date(date(day).getTime() + n * DAY).toISOString().slice(0, 10);
  const startWeek = (day) => shift(day, -(date(day).getUTCDay() + 6) % 7);
  const monthFirst = (day) => day.slice(0, 7) + '-01';
  const monthShift = (day, n) => {
    const d = date(monthFirst(day));
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  };
  const format = (day, opts) =>
    new Intl.DateTimeFormat('th-TH', { timeZone: TZ, ...opts }).format(date(day));
  const overlaps = (event, day) =>
    new Date(event.occurrence_at).getTime() < new Date(day + 'T00:00:00+07:00').getTime() + DAY &&
    new Date(event.occurrence_end).getTime() > new Date(day + 'T00:00:00+07:00').getTime();
  const color = (event) => (/^#[\da-f]{6}$/i.test(event.color || '') ? event.color : '#4285f4');
  const foreground = (hex) => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((x) => {
        const v = parseInt(x, 16) / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#101010' : '#ffffff';
  };
  const time = (value) =>
    new Intl.DateTimeFormat('th-TH', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(value));
  class CalendarView {
    constructor(root, options = {}) {
      this.root = root;
      this.suppressClickUntil = 0;
      this.wheelTotal = 0;
      this.wheelLast = 0;
      this.wheelLockedUntil = 0;
      root.addEventListener(
        'click',
        (e) => {
          if (performance.now() < this.suppressClickUntil) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        true,
      );
      this.options = options;
      this.day = options.day || key(new Date());
      this.events = [];
      this.search = '';
      this.miniMonth = monthFirst(this.day);
      this.collapsed = innerWidth < 750;
      try {
        this.view = localStorage.getItem('tutel.calendar.view') || 'month';
        const sidebar = localStorage.getItem('tutel.calendar.sidebar');
        if (sidebar !== null) this.collapsed = sidebar === '1';
      } catch {}
      if (!['month', 'week', 'day', 'agenda'].includes(this.view)) this.view = 'month';
      root.classList.add('calendar-workspace');
      this.keyboard = (e) => {
        if (
          root.offsetParent === null ||
          e.altKey ||
          e.ctrlKey ||
          e.metaKey ||
          document.querySelector('dialog[open]') ||
          /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
        )
          return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.move(-1);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.move(1);
        }
        if (e.key.toLowerCase() === 't') {
          this.navigate(key(new Date()));
        }
      };
      document.addEventListener('keydown', this.keyboard);
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.calendar-view-picker')) {
          const menu = root.querySelector('.calendar-view-menu');
          if (menu) menu.hidden = true;
          root.querySelector('.calendar-view-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
    }
    update({ events, day } = {}) {
      if (events) this.events = events;
      if (day && day !== this.day) {
        this.day = day;
        this.miniMonth = monthFirst(day);
      }
      this.render();
    }
    visible() {
      return this.events.filter(
        (e) =>
          TutelPrefs.visible(e) &&
          (!this.search ||
            (e.title + ' ' + (e.description || ''))
              .toLocaleLowerCase()
              .includes(this.search.toLocaleLowerCase())),
      );
    }
    navigate(day) {
      this.day = day;
      this.miniMonth = monthFirst(day);
      this.render();
      this.options.onNavigate?.(day);
    }
    move(direction) {
      this.navigate(
        this.view === 'month' || this.view === 'agenda'
          ? monthShift(this.day, direction)
          : shift(this.day, direction * (this.view === 'week' ? 7 : 1)),
      );
    }
    open(event) {
      this.options.onOpen?.(event);
    }
    choose(day, minute = null) {
      this.day = day;
      this.options.onSelect?.(day);
      if (this.options.onCreate) this.options.onCreate(day, minute);
      else {
        this.view = 'day';
        this.navigate(day);
      }
    }
    eventButton(event, extra = '', classes = '') {
      const c = color(event);
      return (
        '<button type="button" class="calendar-event ' +
        classes +
        '" data-event="' +
        escape(String(event.id) + '|' + event.occurrence_at) +
        '" title="' +
        escape(event.title) +
        '" aria-label="' +
        escape(event.title + (event.all_day ? ' · ทั้งวัน' : ' · ' + time(event.occurrence_at))) +
        '" ' +
        extra +
        ' data-color="' +
        c +
        '"><span>' +
        escape(event.all_day ? '' : time(event.occurrence_at) + ' ') +
        escape(event.title) +
        '</span></button>'
      );
    }
    mini() {
      const first = startWeek(this.miniMonth);
      let html =
        '<div class="mini-heading"><b>' +
        format(this.miniMonth, { month: 'long', year: 'numeric' }) +
        '</b><button data-mini="-1" aria-label="เดือนก่อนหน้าในปฏิทินย่อ">‹</button><button data-mini="1" aria-label="เดือนถัดไปในปฏิทินย่อ">›</button></div><div class="mini-calendar">' +
        ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((x) => '<span>' + x + '</span>').join('');
      for (let i = 0; i < 42; i++) {
        const d = shift(first, i);
        html +=
          '<button data-mini-day="' +
          d +
          '" class="' +
          (d === this.day ? 'active ' : '') +
          (d === key(new Date()) ? 'is-today ' : '') +
          (d.slice(0, 7) !== this.miniMonth.slice(0, 7) ? 'muted' : '') +
          '" aria-label="เลือกวันที่ ' +
          d +
          '">' +
          Number(d.slice(-2)) +
          '</button>';
      }
      return html + '</div>';
    }
    bars(events, days, maxLanes = null) {
      const entries = events
        .map((event) => {
          const matches = days.map((d, n) => (overlaps(event, d) ? n : -1)).filter((n) => n >= 0);
          return matches.length ? { event, start: matches[0], end: matches.at(-1) } : null;
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.start - b.start ||
            b.end - b.start - (a.end - a.start) ||
            a.event.occurrence_at.localeCompare(b.event.occurrence_at) ||
            a.event.title.localeCompare(b.event.title),
        );
      const lanes = [];
      for (const entry of entries) {
        let lane = lanes.findIndex((row) =>
          row.every((x) => entry.start > x.end || entry.end < x.start),
        );
        if (lane < 0) {
          lane = lanes.length;
          lanes.push([]);
        }
        entry.lane = lane;
        lanes[lane].push(entry);
      }
      const allowed = maxLanes === null ? lanes.length : Math.min(maxLanes, lanes.length);
      let html = '';
      for (const entry of entries.filter((e) => e.lane < allowed))
        html += this.eventButton(
          entry.event,
          'data-start="' +
            entry.start +
            '" data-span="' +
            (entry.end - entry.start + 1) +
            '" data-lane="' +
            entry.lane +
            '"',
          'month-bar',
        );
      if (maxLanes !== null && lanes.length > allowed)
        for (let i = 0; i < days.length; i++) {
          const hidden = entries.filter(
            (e) => e.lane >= allowed && e.start <= i && e.end >= i,
          ).length;
          if (hidden)
            html +=
              '<button class="calendar-more" data-more="' +
              days[i] +
              '" data-start="' +
              i +
              '" data-lane="' +
              allowed +
              '">อีก ' +
              hidden +
              ' รายการ</button>';
        }
      return { html, lanes: allowed + (lanes.length > allowed ? 1 : 0) };
    }
    month(events) {
      const first = startWeek(monthFirst(this.day)),
        last = shift(monthShift(this.day, 1), -1),
        weeks = Math.ceil((date(last) - date(first) + DAY) / DAY / 7);
      let html =
        '<div class="month-weekdays">' +
        ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
          .map((x) => '<span>' + x + '</span>')
          .join('') +
        '</div><div class="month-weeks">';
      for (let w = 0; w < weeks; w++) {
        const days = Array.from({ length: 7 }, (_, n) => shift(first, w * 7 + n)),
          limit = innerWidth < 650 ? 3 : 5,
          bars = this.bars(events, days, limit);
        html +=
          '<div class="calendar-week" data-week-lanes="' +
          bars.lanes +
          '"><div class="month-days">' +
          days
            .map(
              (d) =>
                '<div class="month-day ' +
                (d === this.day ? 'selected ' : '') +
                (d === key(new Date()) ? 'today ' : '') +
                (d.slice(0, 7) !== this.day.slice(0, 7) ? 'outside' : '') +
                '" data-create-day="' +
                d +
                '" role="button" tabindex="0" aria-label="วันที่ ' +
                d +
                '"><button class="calendar-date" data-open-day="' +
                d +
                '" aria-label="ดูวันที่ ' +
                d +
                '">' +
                Number(d.slice(-2)) +
                '</button></div>',
            )
            .join('') +
          '</div><div class="month-event-lanes">' +
          bars.html +
          '</div></div>';
      }
      return html + '</div>';
    }
    timeline(events) {
      const days =
          this.view === 'day'
            ? [this.day]
            : Array.from({ length: 7 }, (_, i) => shift(startWeek(this.day), i)),
        all = events.filter((e) => e.all_day),
        bars = this.bars(all, days);
      let html =
        '<div class="time-view ' +
        (days.length === 1 ? 'single-day' : '') +
        '"><div class="time-day-head"><span>GMT+7</span>' +
        days
          .map(
            (d) =>
              '<button data-open-day="' +
              d +
              '" class="' +
              (d === key(new Date()) ? 'today' : '') +
              '"><small>' +
              format(d, { weekday: 'short' }) +
              '</small><b>' +
              Number(d.slice(-2)) +
              '</b></button>',
          )
          .join('') +
        '</div><div class="all-day-wrap"><span>ทั้งวัน</span><div class="all-day-lanes" data-lanes="' +
        Math.max(1, bars.lanes) +
        '">' +
        bars.html +
        '</div></div><div class="time-scroll"><div class="time-body"><div class="time-labels">' +
        Array.from(
          { length: 24 },
          (_, h) => '<span>' + String(h).padStart(2, '0') + ':00</span>',
        ).join('') +
        '</div>';
      for (const day of days) {
        const midnight = new Date(day + 'T00:00:00+07:00').getTime(),
          items = events
            .filter((e) => !e.all_day && overlaps(e, day))
            .map((event) => ({
              event,
              start: Math.max(0, (new Date(event.occurrence_at) - midnight) / 60000),
              end: Math.min(1440, (new Date(event.occurrence_end) - midnight) / 60000),
            }))
            .sort((a, b) => a.start - b.start || b.end - a.end);
        let group = [],
          ends = [],
          groupEnd = 0;
        const groups = [];
        for (const item of items) {
          if (group.length && item.start >= groupEnd) {
            groups.push({ items: group, columns: ends.length });
            group = [];
            ends = [];
            groupEnd = 0;
          }
          let lane = ends.findIndex((end) => end <= item.start);
          if (lane < 0) lane = ends.length;
          ends[lane] = Math.max(item.end, item.start + 20);
          item.lane = lane;
          group.push(item);
          groupEnd = Math.max(groupEnd, ends[lane]);
        }
        if (group.length) groups.push({ items: group, columns: ends.length });
        html +=
          '<div class="time-column" data-time-day="' +
          day +
          '">' +
          Array.from(
            { length: 48 },
            (_, n) =>
              '<button class="time-slot" data-slot="' +
              day +
              '|' +
              n * 30 +
              '" tabindex="-1" aria-label="' +
              day +
              ' ' +
              String(Math.floor(n / 2)).padStart(2, '0') +
              ':' +
              (n % 2 ? '30' : '00') +
              '"></button>',
          ).join('');
        for (const cluster of groups)
          for (const item of cluster.items)
            html += this.eventButton(
              item.event,
              'data-minute="' +
                item.start +
                '" data-duration="' +
                Math.max(20, item.end - item.start) +
                '" data-column="' +
                item.lane +
                '" data-columns="' +
                cluster.columns +
                '"',
              'time-event',
            );
        if (day === key(new Date())) {
          const p = parts(new Date());
          html +=
            '<div class="now-line" data-now="' + (+p.hour * 60 + +p.minute) + '"><i></i></div>';
        }
        html += '</div>';
      }
      return html + '</div></div></div>';
    }
    agenda(events) {
      const first = monthFirst(this.day),
        last = monthShift(this.day, 1),
        items = events.filter(
          (e) =>
            e.occurrence_at < new Date(last + 'T00:00:00+07:00').toISOString() &&
            e.occurrence_end > new Date(first + 'T00:00:00+07:00').toISOString(),
        );
      let html = '<div class="calendar-agenda">';
      for (let day = first; day < last; day = shift(day, 1)) {
        const rows = items.filter((e) => overlaps(e, day));
        if (!rows.length) continue;
        html +=
          '<section><button class="agenda-date" data-open-day="' +
          day +
          '"><b>' +
          Number(day.slice(-2)) +
          '</b><span>' +
          format(day, { weekday: 'short', month: 'short' }) +
          '</span></button><div>' +
          rows
            .map(
              (e) =>
                '<div class="agenda-row"><span>' +
                escape(
                  e.all_day ? 'ทั้งวัน' : time(e.occurrence_at) + ' – ' + time(e.occurrence_end),
                ) +
                '</span>' +
                this.eventButton(e) +
                '</div>',
            )
            .join('') +
          '</div></section>';
      }
      return (
        html +
        (items.length ? '' : '<p class="muted">ไม่มีรายการตรงกับหมวดหรือคำค้นในเดือนนี้</p>') +
        '</div>'
      );
    }
    render() {
      const oldScroll = this.root.querySelector('.time-scroll')?.scrollTop,
        events = this.visible();
      const title =
        this.view === 'day'
          ? format(this.day, { day: 'numeric', month: 'long', year: 'numeric' })
          : this.view === 'week'
            ? format(startWeek(this.day), { day: 'numeric', month: 'short' }) +
              ' – ' +
              format(shift(startWeek(this.day), 6), {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : format(this.day, { month: 'long', year: 'numeric' });
      this.root.innerHTML =
        '<div class="calendar-header"><button class="ghost calendar-toggle" aria-label="เปิดปิดแถบข้าง">☰</button><button class="ghost" data-action="today">วันนี้</button><button class="icon-btn" data-action="previous" aria-label="ช่วงก่อนหน้า">‹</button><button class="icon-btn" data-action="next" aria-label="ช่วงถัดไป">›</button><h2>' +
        title +
        '</h2><div class="calendar-tools"><label class="calendar-search"><svg class="toolbar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg><input type="search" placeholder="ค้นหากิจกรรม" aria-label="ค้นหากิจกรรม" value="' +
        escape(this.search) +
        '"></label><div class="calendar-view-picker"><button type="button" class="calendar-view-trigger" aria-label="มุมมองปฏิทิน" aria-haspopup="menu" aria-expanded="false"><span>' +
        { month: 'เดือน', week: 'สัปดาห์', day: 'วัน', agenda: 'รายการ' }[this.view] +
        '</span><svg class="view-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button><div class="calendar-view-menu" role="menu" aria-label="เลือกมุมมองปฏิทิน" hidden>' +
        [
          ['month', 'เดือน'],
          ['week', 'สัปดาห์'],
          ['day', 'วัน'],
          ['agenda', 'รายการ'],
        ]
          .map(
            ([v, l]) =>
              '<button type="button" role="menuitemradio" aria-checked="' +
              (v === this.view) +
              '" data-view="' +
              v +
              '"><span class="view-check" aria-hidden="true">' +
              (v === this.view ? '✓' : '') +
              '</span><span>' +
              l +
              '</span><span class="view-symbol" aria-hidden="true">' +
              { month: '▦', week: '▥', day: '▤', agenda: '☷' }[v] +
              '</span></button>',
          )
          .join('') +
        '</div></div><button class="ghost" data-action="fullscreen" aria-label="เต็มจอ"><svg class="toolbar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"></path></svg></button></div></div><div class="calendar-main ' +
        (this.collapsed ? 'sidebar-collapsed' : '') +
        '"><aside class="calendar-side">' +
        (this.options.onCreate
          ? '<button class="primary calendar-create">＋ สร้างกิจกรรม</button>'
          : '') +
        this.mini() +
        '<h3>หมวดที่แสดง</h3><div class="calendar-filters">' +
        TutelPrefs.categories
          .map(
            ([id, label]) =>
              '<label class="check-row"><input type="checkbox" data-calendar-filter="' +
              id +
              '" ' +
              (TutelPrefs.get().filters.includes(id) ? 'checked' : '') +
              '>' +
              label +
              '</label>',
          )
          .join('') +
        '</div><p class="subtle">เวลาไทย · by Double_P</p></aside><div class="calendar-canvas view-' +
        this.view +
        '">' +
        (this.view === 'month'
          ? this.month(events)
          : this.view === 'agenda'
            ? this.agenda(events)
            : this.timeline(events)) +
        '</div></div>' +
        (this.options.onCreate
          ? '<button type="button" class="mobile-create-event" aria-label="เพิ่มกิจกรรม">＋</button>'
          : '');
      const root = this.root;
      const canvas = root.querySelector('.calendar-canvas');
      let swipe = null;
      canvas.addEventListener(
        'wheel',
        (e) => {
          if (
            this.view !== 'month' ||
            !matchMedia('(min-width: 750px) and (hover: hover) and (pointer: fine)').matches ||
            e.ctrlKey ||
            e.metaKey ||
            Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
            !e.deltaY
          )
            return;
          e.preventDefault();
          const now = performance.now();
          const delta =
            e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1);
          if (now < this.wheelLockedUntil) {
            this.wheelLast = now;
            this.wheelLockedUntil = now + 240;
            return;
          }
          if (now - this.wheelLast > 220 || Math.sign(delta) !== Math.sign(this.wheelTotal))
            this.wheelTotal = 0;
          this.wheelLast = now;
          this.wheelTotal += delta;
          if (Math.abs(this.wheelTotal) >= 45) {
            const direction = Math.sign(this.wheelTotal);
            this.wheelTotal = 0;
            this.wheelLockedUntil = now + 450;
            this.move(direction);
          }
        },
        { passive: false },
      );
      canvas.addEventListener(
        'touchstart',
        (e) => {
          if (
            e.touches.length !== 1 ||
            ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)
          ) {
            swipe = null;
            return;
          }
          const t = e.touches[0];
          swipe = { x: t.clientX, y: t.clientY, at: performance.now() };
        },
        { passive: true },
      );
      canvas.addEventListener(
        'touchcancel',
        () => {
          swipe = null;
        },
        { passive: true },
      );
      canvas.addEventListener(
        'touchend',
        (e) => {
          if (!swipe || e.touches.length) {
            swipe = null;
            return;
          }
          const t = e.changedTouches[0],
            dx = t.clientX - swipe.x,
            dy = t.clientY - swipe.y,
            duration = performance.now() - swipe.at;
          swipe = null;
          // On narrow week views horizontal swipes scroll the seven-day timeline.
          if (this.view === 'week' && canvas.scrollWidth > canvas.clientWidth + 2) return;
          if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5 || duration > 800) return;
          this.suppressClickUntil = performance.now() + 350;
          this.move(dx < 0 ? 1 : -1);
        },
        { passive: true },
      );
      root.querySelector('.calendar-toggle').onclick = () => {
        this.collapsed = !this.collapsed;
        try {
          localStorage.setItem('tutel.calendar.sidebar', this.collapsed ? '1' : '0');
        } catch {}
        this.render();
      };
      root.querySelector('[data-action=today]').onclick = () => this.navigate(key(new Date()));
      root.querySelector('[data-action=previous]').onclick = () => this.move(-1);
      root.querySelector('[data-action=next]').onclick = () => this.move(1);
      root.querySelector('[data-action=fullscreen]').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else root.requestFullscreen?.().catch(() => {});
      };
      const viewTrigger = root.querySelector('.calendar-view-trigger'),
        viewMenu = root.querySelector('.calendar-view-menu');
      const closeMenu = () => {
        viewMenu.hidden = true;
        viewTrigger.setAttribute('aria-expanded', 'false');
      };
      const openMenu = () => {
        viewMenu.hidden = false;
        viewTrigger.setAttribute('aria-expanded', 'true');
      };
      viewTrigger.onclick = () => {
        if (viewMenu.hidden) openMenu();
        else closeMenu();
      };
      viewTrigger.onkeydown = (e) => {
        if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();
          openMenu();
          viewMenu.querySelector('[aria-checked=true]').focus();
        } else if (e.key === 'Escape') closeMenu();
      };
      const viewItems = [...viewMenu.querySelectorAll('[data-view]')];
      viewItems.forEach((item, index) => {
        item.onclick = () => {
          this.view = item.dataset.view;
          try {
            localStorage.setItem('tutel.calendar.view', this.view);
          } catch {}
          this.render();
          root.querySelector('.calendar-view-trigger').focus();
        };
        item.onkeydown = (e) => {
          let next;
          if (e.key === 'ArrowDown') next = (index + 1) % viewItems.length;
          if (e.key === 'ArrowUp') next = (index + viewItems.length - 1) % viewItems.length;
          if (e.key === 'Home') next = 0;
          if (e.key === 'End') next = viewItems.length - 1;
          if (next !== undefined) {
            e.preventDefault();
            e.stopPropagation();
            viewItems[next].focus();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            viewTrigger.focus();
          }
        };
      });
      const search = root.querySelector('input[type=search]');
      search.oninput = (e) => {
        const pos = e.target.selectionStart;
        this.search = e.target.value;
        this.render();
        const field = root.querySelector('input[type=search]');
        field.focus();
        try {
          field.setSelectionRange(pos, pos);
        } catch {}
      };
      root
        .querySelector('.calendar-create')
        ?.addEventListener('click', () => this.options.onCreate(this.day));
      root
        .querySelector('.mobile-create-event')
        ?.addEventListener('click', () => this.options.onCreate(this.day));
      root.querySelectorAll('[data-mini]').forEach(
        (b) =>
          (b.onclick = () => {
            this.miniMonth = monthShift(this.miniMonth, Number(b.dataset.mini));
            this.render();
          }),
      );
      root
        .querySelectorAll('[data-mini-day]')
        .forEach((b) => (b.onclick = () => this.navigate(b.dataset.miniDay)));
      root.querySelectorAll('[data-calendar-filter]').forEach(
        (b) =>
          (b.onchange = () => {
            const filters = [...root.querySelectorAll('[data-calendar-filter]:checked')].map(
              (x) => x.dataset.calendarFilter,
            );
            TutelPrefs.change({ filters });
          }),
      );
      root.querySelectorAll('[data-open-day],[data-more]').forEach(
        (b) =>
          (b.onclick = (e) => {
            e.stopPropagation();
            this.view = 'day';
            this.navigate(b.dataset.openDay || b.dataset.more);
          }),
      );
      root.querySelectorAll('[data-create-day]').forEach((cell) => {
        const action = () => this.choose(cell.dataset.createDay);
        cell.onclick = action;
        cell.onkeydown = (e) => {
          if (e.target === cell && ['Enter', ' '].includes(e.key)) {
            e.preventDefault();
            action();
          }
        };
      });
      root.querySelectorAll('[data-slot]').forEach(
        (b) =>
          (b.onclick = () => {
            const [day, minute] = b.dataset.slot.split('|');
            this.choose(day, Number(minute));
          }),
      );
      root.querySelectorAll('[data-event]').forEach((b) => {
        const event = this.events.find(
          (e) => String(e.id) + '|' + e.occurrence_at === b.dataset.event,
        );
        b.onclick = (e) => {
          e.stopPropagation();
          if (event) this.open(event);
        };
        b.style.backgroundColor = b.dataset.color;
        b.style.color = foreground(b.dataset.color);
      });
      root.querySelectorAll('[data-start]').forEach((b) => {
        b.style.gridColumn = Number(b.dataset.start) + 1 + ' / span ' + (b.dataset.span || 1);
        b.style.gridRow = Number(b.dataset.lane) + 1;
      });
      root
        .querySelectorAll('[data-week-lanes]')
        .forEach(
          (w) =>
            (w.style.minHeight =
              Math.max(innerWidth < 650 ? 88 : 96, 44 + Number(w.dataset.weekLanes) * 29) + 'px'),
        );
      root
        .querySelectorAll('[data-lanes]')
        .forEach((w) => (w.style.minHeight = Math.max(34, Number(w.dataset.lanes) * 29) + 'px'));
      root.querySelectorAll('[data-minute]').forEach((b) => {
        b.style.top = (Number(b.dataset.minute) * 64) / 60 + 'px';
        b.style.height = Math.max(22, (Number(b.dataset.duration) * 64) / 60 - 2) + 'px';
        b.style.left = (Number(b.dataset.column) / Number(b.dataset.columns)) * 100 + '%';
        b.style.width = 'calc(' + 100 / Number(b.dataset.columns) + '% - 3px)';
      });
      root
        .querySelectorAll('[data-now]')
        .forEach((line) => (line.style.top = (Number(line.dataset.now) * 64) / 60 + 'px'));
      const scroll = root.querySelector('.time-scroll');
      if (scroll) scroll.scrollTop = oldScroll ?? 7 * 64;
    }
  }
  window.TutelCalendar = CalendarView;
})();
