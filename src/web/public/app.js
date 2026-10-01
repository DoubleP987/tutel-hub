const state = {
  user: null,
  csrf: '',
  month: new Date(),
  events: [],
  guilds: [],
  selectedDay: null,
  mode: 'calendar',
};
const $ = (s) => document.querySelector(s),
  $$ = (s) => Array.from(document.querySelectorAll(s));
const monthTitle = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  month: 'long',
  year: 'numeric',
});
const dateFmt = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  day: 'numeric',
  month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  if (options.method && options.method !== 'GET') headers['x-csrf-token'] = state.csrf;
  const r = await fetch(path, { ...options, headers });
  if (r.status === 401) {
    location.href = '/login';
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
  return data;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function dayKey(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}
function fromIso(iso) {
  return new Date(iso);
}
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
async function init() {
  try {
    const s = await api('/api/session');
    state.user = s.user;
    state.csrf = s.csrf;
    const savedPrefs = await api('/api/preferences');
    if (savedPrefs.theme) {
      TutelPrefs.set(savedPrefs);
    }
    $('#role-badge').textContent = s.user.role === 'admin' ? 'ADMIN' : 'VIEW ONLY';
    $$('.admin-only').forEach((x) => x.classList.toggle('hidden', s.user.role !== 'admin'));
    if (s.user.mustChange) await forcePasswordChange();
    wire();
    await loadGuilds();
    await loadEvents();
  } catch (e) {
    if (e.message !== 'กรุณาเข้าสู่ระบบใหม่') toast(e.message);
  }
}
async function forcePasswordChange() {
  while (true) {
    const current = prompt('บัญชีเริ่มต้นต้องเปลี่ยนรหัสผ่านก่อนใช้งาน\\nกรอกรหัสผ่านปัจจุบัน');
    if (current === null) {
      location.href = '/login';
      return;
    }
    const next = prompt('ตั้งรหัสผ่านใหม่อย่างน้อย 10 ตัวอักษร');
    if (next === null) {
      location.href = '/login';
      return;
    }
    try {
      const result = await api('/api/password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      state.csrf = result.csrf;
      toast('เปลี่ยนรหัสผ่านแล้ว');
      return;
    } catch (e) {
      alert(e.message);
    }
  }
}
function wire() {
  void loadPublicSync();
  setInterval(() => {
    if (state.user?.role === 'admin' && !document.hidden) void loadPublicSync();
  }, 60000);
  $('#sync-public-calendar').onclick = async () => {
    const button = $('#sync-public-calendar');
    button.disabled = true;
    try {
      const result = await api('/api/calendar-sync', { method: 'POST' });
      toast(result.pending ? 'รอเชื่อมการซิงก์ปฏิทิน' : 'ส่งข้อมูลปฏิทินแล้ว');
      await loadPublicSync();
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  };
  $$('.nav-item').forEach((b) => (b.onclick = () => showPage(b.dataset.page)));
  $('#new-event').onclick = () => openEvent();
  $('#close-dialog').onclick = $('#cancel-dialog').onclick = () => $('#event-dialog').close();
  $('#event-form').onsubmit = saveEventForm;
  $('#delete-event').onclick = deleteCurrentEvent;
  $('#all-day-toggle').onchange = syncAllDay;
  field($('#event-form'), 'date').onchange = () => {
    const f = $('#event-form');
    if (!field(f, 'endDate').value || field(f, 'endDate').value < field(f, 'date').value)
      field(f, 'endDate').value = field(f, 'date').value;
  };
  field($('#event-form'), 'color').oninput = syncEventColor;
  $$('[data-event-color]').forEach((b) => {
    b.style.backgroundColor = b.dataset.eventColor;
    b.onclick = () => {
      field($('#event-form'), 'color').value = b.dataset.eventColor;
      syncEventColor();
    };
  });
  $('#close-details').onclick = () => $('#details-dialog').close();
  $('#logout').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    location.href = '/login';
  };
  $('#settings-form').onsubmit = saveSettings;
  $('#guild-select').onchange = () => loadChannels();
  $('#bot-toggle').onclick = toggleBot;
  $('#channel-select').onchange = updateChannelPin;
  $('#settings-form').addEventListener('input', previewNotification);
  $('#reset-notification-color').onclick = () => {
    field($('#settings-form'), 'notificationColor').value = '#4285f4';
    previewNotification();
  };
  $('#reset-notification-template').onclick = () => {
    field($('#settings-form'), 'notificationTemplate').value =
      '📅 {title}\n{schedule} · {date}\n{description}';
    previewNotification();
  };
  $('#test-channel').onclick = async () => {
    const b = $('#test-channel');
    b.disabled = true;
    try {
      await api('/api/settings/discord/test', {
        method: 'POST',
        body: { guildId: $('#guild-select').value },
      });
      toast('ส่งทดสอบแล้ว ไปตรวจใน Discord');
    } catch (e) {
      $('#settings-message').textContent = e.message;
    } finally {
      b.disabled = false;
    }
  };
}
function showPage(name) {
  state.mode = name;
  $$('.page').forEach((p) => p.classList.add('hidden'));
  $('#' + name + '-page').classList.remove('hidden');
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.page === name));
  if (name === 'control') loadBot();
  if (name === 'settings')
    loadSettings().catch((e) => {
      $('#settings-message').textContent = e.message;
    });
}
async function loadEvents() {
  const request = (state.eventRequest = (state.eventRequest || 0) + 1);
  const month = (state.selectedDay || bkkInput(new Date()).slice(0, 10)).slice(0, 7);
  const first = new Date(month + '-01T12:00:00Z');
  const startDay = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * 86400000)
    .toISOString()
    .slice(0, 10);
  const from = new Date(startDay + 'T00:00:00+07:00');
  const to = new Date(from.getTime() + 42 * 86400000);
  const events = await api(
    '/api/events?from=' +
      encodeURIComponent(from.toISOString()) +
      '&to=' +
      encodeURIComponent(to.toISOString()),
  );
  if (request !== state.eventRequest) return;
  state.events = events;
  renderCalendar();
}
let workspace;
function renderCalendar() {
  if (!workspace)
    workspace = new TutelCalendar($('#calendar-workspace'), {
      day: state.selectedDay || bkkInput(new Date()).slice(0, 10),
      onNavigate: (day) => {
        state.selectedDay = day;
        state.month = new Date(day.slice(0, 7) + '-01T12:00:00Z');
        loadEvents().catch((e) => toast(e.message));
      },
      onSelect: (day) => selectDay(day),
      onCreate:
        state.user.role === 'admin'
          ? (day, minute) => {
              state.selectedDay = day;
              openEvent(day, minute);
            }
          : null,
      onOpen: (event) => {
        if (state.user.role === 'admin' && !event.systemHoliday) editEvent(event.id);
        else showDetails(event);
      },
    });
  workspace.update({
    events: state.events,
    day: state.selectedDay || bkkInput(new Date()).slice(0, 10),
  });
  selectDay(state.selectedDay || bkkInput(new Date()).slice(0, 10));
}
function selectDay(day) {
  state.selectedDay = day;
  $('#selected-title').textContent =
    'รายการวันที่ ' +
    new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' }).format(
      new Date(day + 'T00:00:00+07:00'),
    );
  $$('.day').forEach((x) => x.classList.toggle('selected', x.dataset.day === day));
  renderEventList();
}
function renderEventList() {
  const list = $('#event-list'),
    day = state.selectedDay || dayKey(new Date()),
    items = state.events.filter((e) => TutelPrefs.visible(e) && occursOn(e, day));
  list.innerHTML = items.length
    ? items
        .map(
          (e, n) =>
            '<article class="event-card" tabindex="0" role="button" data-index="' +
            n +
            '"><div class="event-date">' +
            esc(dateFmt.format(fromIso(e.occurrence_at))) +
            '<small>' +
            esc(e.all_day ? 'ทั้งวัน' : timeFmt.format(fromIso(e.occurrence_at))) +
            '</small></div><div class="event-info"><b>' +
            esc(e.title) +
            '</b><p>' +
            esc(e.description || '') +
            '</p></div></article>',
        )
        .join('')
    : '<div class="muted">ไม่มีรายการในวันนี้</div>';
  $$('.event-card[data-index]').forEach((x) => {
    x.style.borderLeftColor = items[Number(x.dataset.index)].color || '#4285f4';
    const act = () => {
      const e = items[Number(x.dataset.index)];
      if (state.user.role === 'admin' && !e.systemHoliday) editEvent(e.id);
      else showDetails(e);
    };
    x.onclick = act;
    x.onkeydown = (e) => {
      if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        act();
      }
    };
  });
}
function openEvent(date, minute = null) {
  const f = $('#event-form');
  f.reset();
  field(f, 'id').value = '';
  field(f, 'color').value = '#4285f4';
  syncEventColor();
  field(f, 'reminder').value = 'standard';
  field(f, 'recurrence').value = 'none';
  field(f, 'allDay').checked = true;
  $('#event-error').textContent = '';
  $('#event-dialog-title').textContent = 'เพิ่มกิจกรรม';
  $('#delete-event').classList.add('hidden');
  const day = date || state.selectedDay || dayKey(new Date());
  field(f, 'date').value = day;
  field(f, 'endDate').value = day;
  field(f, 'startsAt').value = day + 'T09:00';
  field(f, 'endsAt').value = day + 'T10:00';
  field(f, 'guildId').value = $('#guild-select').value || state.configs?.[0]?.guild_id || '';
  if (minute !== null) {
    field(f, 'allDay').checked = false;
    field(f, 'startsAt').value =
      day +
      'T' +
      String(Math.floor(minute / 60)).padStart(2, '0') +
      ':' +
      String(minute % 60).padStart(2, '0');
    field(f, 'endsAt').value = bkkInput(
      new Date(new Date(field(f, 'startsAt').value + ':00+07:00').getTime() + 3600000),
    );
  }
  syncAllDay();
  $('#event-dialog').showModal();
  field(f, 'title').focus();
}
function bkkInput(iso) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const v = Object.fromEntries(p.map((x) => [x.type, x.value]));
  return v.year + '-' + v.month + '-' + v.day + 'T' + v.hour + ':' + v.minute;
}
async function editEvent(id) {
  const e = state.events.find((x) => x.id === id);
  if (!e) return;
  const f = $('#event-form');
  f.reset();
  field(f, 'id').value = e.id;
  field(f, 'color').value = e.color || '#4285f4';
  syncEventColor();
  field(f, 'endDate').value = bkkInput(new Date(new Date(e.ends_at) - 86400000)).slice(0, 10);
  field(f, 'title').value = e.title;
  field(f, 'description').value = e.description || '';
  field(f, 'date').value = bkkInput(e.starts_at).slice(0, 10);
  field(f, 'startsAt').value = bkkInput(e.starts_at);
  field(f, 'endsAt').value = bkkInput(e.ends_at);
  field(f, 'recurrence').value = e.recurrence;
  field(f, 'reminder').value =
    e.all_day || e.reminder_mode === 'standard' ? 'standard' : String(e.reminders[0] ?? 15);
  field(f, 'guildId').value = e.guild_id || '';
  field(f, 'holiday').checked = !!e.holiday;
  field(f, 'allDay').checked = !!e.all_day;
  syncAllDay();
  $('#event-error').textContent = '';
  $('#event-dialog-title').textContent = 'แก้ไขกิจกรรม';
  $('#delete-event').classList.remove('hidden');
  $('#event-dialog').showModal();
}
async function saveEventForm(e) {
  e.preventDefault();
  const f = e.currentTarget,
    allDay = field(f, 'allDay').checked,
    standard = allDay || field(f, 'reminder').value === 'standard';
  const body = {
    color: field(f, 'color').value,
    endDate: field(f, 'endDate').value,
    title: field(f, 'title').value,
    description: field(f, 'description').value,
    date: field(f, 'date').value,
    startsAt: field(f, 'startsAt').value.replace('T', ' '),
    endsAt: field(f, 'endsAt').value.replace('T', ' '),
    recurrence: field(f, 'recurrence').value,
    reminderMode: standard ? 'standard' : 'offsets',
    reminders: standard ? [] : [Number(field(f, 'reminder').value)],
    guildId: field(f, 'guildId').value || null,
    holiday: field(f, 'holiday').checked,
    allDay,
  };
  try {
    const id = field(f, 'id').value;
    await api('/api/events' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body });
    $('#event-dialog').close();
    toast('บันทึกแล้ว ข้อมูล public จะซิงก์อัตโนมัติ');
    await loadEvents();
  } catch (err) {
    $('#event-error').textContent = err.message;
  }
}
async function deleteCurrentEvent() {
  const id = field($('#event-form'), 'id').value;
  if (!id || !confirm('ลบกิจกรรมนี้?')) return;
  try {
    await api('/api/events/' + id, { method: 'DELETE' });
    $('#event-dialog').close();
    await loadEvents();
    toast('ลบกิจกรรมแล้ว');
  } catch (e) {
    $('#event-error').textContent = e.message;
  }
}
async function loadGuilds() {
  if (state.user.role !== 'admin') return;
  try {
    const d = await api('/api/guilds');
    state.guilds = d.guilds;
    state.configs = d.configs;
    for (const select of [$('#guild-select'), $('#event-guild')]) {
      const previous = select.value;
      select.innerHTML =
        '<option value="">' +
        (select.id === 'event-guild' ? 'ทุก server ที่ตั้ง channel' : 'เลือก server') +
        '</option>' +
        state.guilds
          .map((g) => '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>')
          .join('');
      select.value = previous;
    }
    $('#public-calendar-url').value = d.publicCalendarUrl;
    $('#netlify-status').textContent = d.netlify?.configured
      ? (d.netlify.provider || 'Netlify') +
        ': ' +
        (d.netlify.lastSync
          ? 'ซิงก์ล่าสุด ' + new Date(d.netlify.lastSync).toLocaleString('th-TH')
          : 'รอซิงก์') +
        (d.netlify.error ? ' · ' + d.netlify.error : '')
      : (d.netlify?.provider || 'เว็บไซต์ public') + ': ยังไม่ได้เชื่อมการซิงก์อัตโนมัติ';
  } catch (e) {
    $('#settings-message').textContent = e.message;
  }
}
async function loadSettings() {
  await loadGuilds();
  if (!$('#guild-select').value)
    $('#guild-select').value = state.configs?.[0]?.guild_id || state.guilds[0]?.id || '';
  await loadChannels();
}
async function loadChannels() {
  const id = $('#guild-select').value,
    sel = $('#channel-select');
  sel.disabled = true;
  sel.innerHTML = '<option value="">กำลังโหลด...</option>';
  $('#settings-message').textContent = '';
  try {
    if (!id) {
      sel.innerHTML = '<option value="">เลือก server ก่อน</option>';
      return;
    }
    const d = await api('/api/guilds/' + encodeURIComponent(id) + '/channels');
    if ($('#guild-select').value !== id) return;
    const channels = d.channels || [];
    sel.innerHTML =
      '<option value="">' +
      (channels.length ? 'เลือก channel' : 'ไม่พบ channel ที่ส่งข้อความได้') +
      '</option>' +
      channels
        .map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>')
        .join('');
    const cfg = state.configs?.find((c) => c.guild_id === id);
    if (cfg) {
      sel.value = cfg.channel_id || '';
      field($('#settings-form'), 'defaultReminder').value = String(cfg.default_reminder);
    }
    populateReminderOptions(cfg?.options);
    updateChannelPin();
    if (!channels.length)
      $('#settings-message').textContent = 'ให้สิทธิ์ View Channels และ Send Messages แก่บอท';
  } catch (e) {
    sel.innerHTML = '<option value="">โหลดไม่สำเร็จ</option>';
    $('#settings-message').textContent = e.message;
  } finally {
    sel.disabled = false;
  }
}
async function saveSettings(e) {
  e.preventDefault();
  const f = e.currentTarget;
  try {
    await api('/api/settings/discord', {
      method: 'POST',
      body: {
        secretPin: field(f, 'secretPin').value,
        guildId: field(f, 'guildId').value,
        channelId: field(f, 'channelId').value,
        defaultReminder: Number(field(f, 'defaultReminder').value),
        publicCalendarUrl: field(f, 'publicCalendarUrl').value,
        options: readReminderOptions(),
      },
    });
    $('#settings-message').textContent = 'บันทึกแล้ว วันสำคัญไทยจะส่งอัตโนมัติ';
    toast('บันทึกการแจ้งเตือนแล้ว');
    await loadGuilds();
  } catch (e) {
    $('#settings-message').textContent = e.message;
  } finally {
    field(f, 'secretPin').value = '';
  }
}
async function loadBot() {
  try {
    const d = await api('/api/bot');
    const s = $('#bot-status');
    s.innerHTML =
      '<span class="status-light ' +
      (d.status.ready ? 'online' : '') +
      '"></span><div><b>' +
      esc(d.status.ready ? 'ออนไลน์' : 'ปิดอยู่') +
      '</b><div class="muted">' +
      esc(d.status.tag || 'Discord client ยังไม่เชื่อมต่อ') +
      ' · ' +
      d.guilds.length +
      ' server</div></div>';
    $('#bot-toggle').textContent = d.configured ? 'ปิดบอท' : 'เปิดบอท';
    $('#bot-toggle').classList.toggle('danger', d.configured);
    $('#music-list').innerHTML = d.music.length
      ? d.music
          .map(
            (m) =>
              '<article class="music-card"><b>' +
              esc(m.guildName) +
              '</b><p>' +
              (m.playing ? 'กำลังเล่น: ' + esc(m.playing) : 'ไม่มีเพลงกำลังเล่น') +
              ' · คิว ' +
              m.queue +
              '</p><div class="actions">' +
              ['pause', 'resume', 'skip', 'stop', 'leave']
                .map(
                  (a) =>
                    '<button class="ghost" data-guild="' +
                    esc(m.guildId) +
                    '" data-action="' +
                    a +
                    '">' +
                    {
                      pause: 'พัก',
                      resume: 'เล่นต่อ',
                      skip: 'ข้าม',
                      stop: 'หยุด',
                      leave: 'ออกห้อง',
                    }[a] +
                    '</button>',
                )
                .join('') +
              '</div></article>',
          )
          .join('')
      : '<div class="muted">ยังไม่มีเพลงที่กำลังเล่น</div>';
    $$('[data-action]').forEach(
      (b) => (b.onclick = () => musicAction(b.dataset.guild, b.dataset.action)),
    );
  } catch (e) {
    toast(e.message);
  }
}
async function musicAction(guildId, action) {
  try {
    await api('/api/control/music', { method: 'POST', body: { guildId, action } });
    toast('ส่งคำสั่งแล้ว');
    setTimeout(loadBot, 500);
  } catch (e) {
    toast(e.message);
  }
}
async function toggleBot() {
  const enabled = $('#bot-toggle').textContent.includes('เปิด');
  try {
    await api('/api/bot/toggle', { method: 'POST', body: { enabled } });
    toast(enabled ? 'เปิดบอทแล้ว' : 'ปิดบอทแล้ว');
    await loadBot();
  } catch (e) {
    toast(e.message);
  }
}

function field(form, name) {
  return form.elements.namedItem(name);
}
function occursOn(event, day) {
  const start = new Date(day + 'T00:00:00+07:00').getTime(),
    end = start + 86400000;
  return (
    new Date(event.occurrence_at).getTime() < end &&
    new Date(event.occurrence_end).getTime() > start
  );
}
function changeMonth(offset) {
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + offset, 1);
  loadEvents().catch((e) => toast(e.message));
}
function syncAllDay() {
  const f = $('#event-form'),
    on = field(f, 'allDay').checked;
  $('#time-fields').classList.toggle('hidden', on);
  $('#date-field').classList.toggle('hidden', !on);
  $('#end-date-field').classList.toggle('hidden', !on);
  field(f, 'endDate').required = on;
  field(f, 'date').required = on;
  field(f, 'startsAt').required = !on;
  field(f, 'endsAt').required = !on;
  if (on) field(f, 'reminder').value = 'standard';
}
function showDetails(e) {
  $('#detail-title').textContent = e.title;
  $('#detail-when').textContent =
    new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      ...(e.all_day ? {} : { timeStyle: 'short' }),
    }).format(new Date(e.occurrence_at)) + (e.all_day ? ' · ทั้งวัน' : '');
  $('#detail-description').textContent = e.description || 'ไม่มีรายละเอียดเพิ่มเติม';
  $('#details-dialog').showModal();
}

const reminderDefaults = {
  enabled: true,
  categories: TutelPrefs.categories.map((c) => c[0]).filter((c) => c !== 'holy'),
  notifyNonHolidays: true,
  color: '#4285f4',
  template: '📅 {title}\n{schedule} · {date}\n{description}',
  beforeEnabled: true,
  beforeTime: '12:00',
  dayEnabled: true,
  dayTime: '07:00',
  showDetails: true,
};
function populateReminderOptions(value) {
  const options = { ...reminderDefaults, ...value },
    f = $('#settings-form');
  $('#notify-categories').innerHTML = TutelPrefs.categories
    .map(
      ([id, label]) =>
        '<label class="check-row"><input type="checkbox" data-notify-category="' +
        id +
        '" ' +
        (options.categories.includes(id) ? 'checked' : '') +
        '>' +
        esc(label) +
        '</label>',
    )
    .join('');
  for (const [name, key] of [
    ['notifyEnabled', 'enabled'],
    ['notifyNonHolidays', 'notifyNonHolidays'],
    ['beforeEnabled', 'beforeEnabled'],
    ['dayEnabled', 'dayEnabled'],
    ['showDetails', 'showDetails'],
  ])
    field(f, name).checked = options[key];
  for (const [name, key] of [
    ['notificationColor', 'color'],
    ['notificationTemplate', 'template'],
    ['beforeTime', 'beforeTime'],
    ['dayTime', 'dayTime'],
  ])
    field(f, name).value = options[key];
  previewNotification();
}
function readReminderOptions() {
  const f = $('#settings-form');
  return {
    enabled: field(f, 'notifyEnabled').checked,
    categories: $$('[data-notify-category]:checked').map((x) => x.dataset.notifyCategory),
    notifyNonHolidays: field(f, 'notifyNonHolidays').checked,
    color: field(f, 'notificationColor').value,
    template: field(f, 'notificationTemplate').value,
    beforeEnabled: field(f, 'beforeEnabled').checked,
    beforeTime: field(f, 'beforeTime').value,
    dayEnabled: field(f, 'dayEnabled').checked,
    dayTime: field(f, 'dayTime').value,
    showDetails: field(f, 'showDetails').checked,
  };
}
function previewNotification() {
  const f = $('#settings-form');
  if (!field(f, 'notificationColor')) return;
  const p = $('#notification-preview'),
    sample = {
      title: 'วันหยุด / ประชุมทีม',
      date: 'วันศุกร์ที่ 2 ตุลาคม 2569 · ทั้งวัน',
      schedule: 'พรุ่งนี้',
      description: field(f, 'showDetails').checked ? 'รายละเอียดกิจกรรมของคุณ' : '',
      category: 'วันหยุดราชการ',
    };
  p.style.borderLeftColor = field(f, 'notificationColor').value;
  p.textContent = field(f, 'notificationTemplate').value.replace(
    /\{(title|date|schedule|description|category)\}/g,
    (_, key) => sample[key],
  );
}
function updateChannelPin() {
  const f = $('#settings-form'),
    cfg = state.configs?.find((c) => c.guild_id === $('#guild-select').value),
    changed = cfg?.channel_id !== $('#channel-select').value;
  $('#channel-pin-label').classList.toggle('hidden', !changed);
  field(f, 'secretPin').required = changed;
}
window.addEventListener('tutel:display', (event) => {
  if (state.user) {
    renderCalendar();
    api('/api/preferences', { method: 'PUT', body: event.detail }).catch(() =>
      toast('จำบนอุปกรณ์แล้ว แต่บันทึกบัญชีไม่สำเร็จ'),
    );
  }
});

function syncEventColor() {
  const color = field($('#event-form'), 'color').value;
  $$('[data-event-color]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.eventColor === color)),
  );
}
init();

async function loadPublicSync() {
  if (state.user?.role !== 'admin') return;
  try {
    const status = await api('/api/calendar-sync');
    $('#netlify-status').textContent = status.configured
      ? (status.lastSync
          ? 'ส่งข้อมูลล่าสุด ' + new Date(status.lastSync).toLocaleString('th-TH')
          : 'รอส่งข้อมูลครั้งแรก') + (status.error ? ' · ' + status.error : '')
      : 'ยังไม่ได้เชื่อมการส่งข้อมูลปฏิทิน';
  } catch (error) {
    $('#netlify-status').textContent = error.message;
  }
}
