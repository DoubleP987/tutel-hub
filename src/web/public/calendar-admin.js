(() => {
  const roles = { owner: 'เจ้าของ', manager: 'ผู้จัดการ', editor: 'ผู้แก้ไข', member: 'สมาชิก' };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let request, notice, website, currentGroup;
  const root = () => document.getElementById('calendar-admin-content');
  const dialog = el('dialog');
  dialog.id = 'calendar-admin-dialog';
  document.body.append(dialog);
  const call = (path, options) => request('/api/calendar-admin' + path, options);
  function button(label, action, className = 'ghost') {
    const b = el('button', className, label);
    b.type = 'button';
    b.onclick = () =>
      Promise.resolve()
        .then(action)
        .catch((e) => notice(e.message));
    return b;
  }
  function head(label) {
    const row = el('div', 'page-heading');
    row.append(el('h2', '', label), button('ย้อนกลับ', groups));
    return row;
  }
  function input(form, label, name, value = '', type = 'text') {
    const row = el('label', '', label),
      field = el('input');
    field.name = name;
    field.type = type;
    if (type === 'checkbox') field.checked = !!value;
    else field.value = value;
    row.append(field);
    form.append(row);
    return field;
  }
  function select(form, label, name, options, value) {
    const row = el('label', '', label),
      field = el('select');
    field.name = name;
    for (const [id, text] of options) {
      const o = el('option', '', text);
      o.value = id;
      field.append(o);
    }
    field.value = value;
    row.append(field);
    form.append(row);
    return field;
  }
  function form(title, save) {
    dialog.replaceChildren();
    const h = el('div', 'dialog-head');
    h.append(
      el('h2', '', title),
      button('×', () => dialog.close(), 'icon-btn'),
    );
    const node = el('form', 'calendar-admin-form');
    node.onsubmit = async (event) => {
      event.preventDefault();
      try {
        await save(node);
      } catch (error) {
        notice(error.message);
      }
    };
    dialog.append(h, node);
    if (!dialog.open) dialog.showModal();
    return node;
  }
  function submit(form, label = 'บันทึก') {
    const b = el('button', 'primary', label);
    b.type = 'submit';
    form.append(b);
  }
  async function groups() {
    const items = await call('/groups'),
      body = root();
    body.replaceChildren();
    const search = el('input');
    search.type = 'search';
    search.placeholder = 'ค้นหากลุ่ม';
    search.setAttribute('aria-label', 'ค้นหากลุ่ม');
    body.append(search);
    const cards = el('div', 'calendar-admin-grid');
    body.append(cards);
    function render() {
      cards.replaceChildren();
      for (const group of items.filter((g) =>
        g.name.toLowerCase().includes(search.value.toLowerCase()),
      )) {
        const card = el('article', 'status-card');
        card.append(
          el('h3', '', group.name),
          el(
            'p',
            'muted',
            `เจ้าของ ${group.owner || 'ยังไม่ได้กำหนด'} · ${group.member_count} สมาชิก · ${group.event_count} กิจกรรม`,
          ),
          el(
            'span',
            'badge',
            group.suspended
              ? 'ระงับ'
              : group.visibility === 'public'
                ? 'ดูผ่านลิงก์ได้'
                : 'ส่วนตัว',
          ),
          button('จัดการกลุ่ม', () => detail(group.id), 'primary'),
        );
        cards.append(card);
      }
    }
    search.oninput = render;
    render();
  }
  async function detail(id) {
    currentGroup = await call('/groups/' + id);
    const { group, members, events, invitations, bindings } = currentGroup,
      body = root();
    body.replaceChildren(head(group.name));
    const actions = el('div', 'calendar-admin-actions');
    actions.append(
      button('ตั้งค่ากลุ่ม', editGroup),
      button('เชิญสมาชิก', invite),
      button('นำเข้ารายชื่อ CSV', csv),
      button('เพิ่มช่อง Discord', () => bindingForm()),
      button('โอนเจ้าของ', transfer),
    );
    if (website) {
      const a = el('a', 'primary', 'เปิดปฏิทินกลุ่ม');
      a.href = new URL('/g/' + group.slug, website).href;
      a.target = '_blank';
      a.rel = 'noopener';
      actions.append(a);
    }
    body.append(actions, el('h3', '', 'สมาชิก'));
    for (const member of members) {
      const row = el('article', 'status-card calendar-admin-row');
      row.append(
        el('strong', '', member.name),
        el('span', 'muted', `${roles[member.role]}${member.blocked ? ' · ระงับ' : ''}`),
      );
      if (member.role !== 'owner') row.append(button('แก้สิทธิ์', () => memberForm(member)));
      body.append(row);
    }
    body.append(el('h3', '', 'คำเชิญ'));
    for (const invitation of invitations) {
      const row = el('article', 'status-card calendar-admin-row');
      row.append(
        el('span', '', invitation.email || `คำเชิญ ${invitation.kind}`),
        el(
          'span',
          'muted',
          `${invitation.uses}/${invitation.max_uses} · ${invitation.revoked ? 'ยกเลิกแล้ว' : new Date(invitation.expires_at).toLocaleDateString('th-TH')}`,
        ),
      );
      if (!invitation.revoked)
        row.append(
          button('ยกเลิก', async () => {
            await call(`/groups/${id}/invitations/${invitation.id}`, { method: 'DELETE' });
            await detail(id);
          }),
        );
      body.append(row);
    }
    body.append(el('h3', '', 'ช่อง Discord'));
    for (const binding of bindings) {
      const row = el('article', 'status-card calendar-admin-row');
      row.append(
        el('span', '', `เซิร์ฟเวอร์ ${binding.guild_id} · ช่อง ${binding.channel_id}`),
        el('span', 'muted', `${binding.enabled ? 'เปิด' : 'ปิด'} · ${binding.config.dailyTime}`),
        button('ตั้งค่า', () => bindingForm(binding)),
      );
      body.append(row);
    }
    body.append(el('h3', '', 'กิจกรรม'));
    for (const event of events) {
      const row = el('article', 'status-card calendar-admin-row');
      row.append(
        el('strong', '', event.title),
        el(
          'span',
          'muted',
          `${event.date} ${event.all_day ? 'ทั้งวัน' : event.time} · ${event.status}`,
        ),
      );
      if (event.status === 'pending')
        for (const [status, label] of [
          ['published', 'อนุมัติ'],
          ['rejected', 'ไม่อนุมัติ'],
        ])
          row.append(
            button(label, async () => {
              await call(`/groups/${id}/events/${event.id}/review`, {
                method: 'POST',
                body: { status },
              });
              await detail(id);
            }),
          );
      if (!event.source_id) {
        row.append(
          button('แก้ไข', () => eventForm(event)),
          button('ลบ', async () => {
            if (!confirm('ลบกิจกรรมนี้?')) return;
            await call(`/groups/${id}/events/${event.id}`, { method: 'DELETE' });
            await detail(id);
          }),
        );
      } else row.append(el('small', 'muted', 'ข้อมูลนำเข้า · แก้ที่ต้นทาง'));
      body.append(row);
    }
  }
  async function editGroup() {
    const g = currentGroup.group,
      node = form('ตั้งค่ากลุ่ม', async (f) => {
        await call('/groups/' + g.id, {
          method: 'PUT',
          body: {
            name: f.elements.name.value,
            visibility: f.elements.visibility.value,
            suspended: f.elements.suspended.checked,
            approval: f.elements.approval.value,
          },
        });
        dialog.close();
        await detail(g.id);
      });
    input(node, 'ชื่อกลุ่ม', 'name', g.name);
    select(
      node,
      'การดู',
      'visibility',
      [
        ['private', 'เฉพาะสมาชิก'],
        ['public', 'ดูผ่านลิงก์ได้'],
      ],
      g.visibility,
    );
    select(
      node,
      'การอนุมัติ',
      'approval',
      [
        ['manual', 'ตรวจทุกข้อเสนอ'],
        ['trusted', 'อัตโนมัติสำหรับผู้ได้รับสิทธิ์'],
        ['all', 'อนุมัติอัตโนมัติทุกคน'],
      ],
      g.settings.approval || 'manual',
    );
    input(node, 'ระงับกลุ่ม', 'suspended', g.suspended, 'checkbox');
    submit(node);
  }
  async function memberForm(member) {
    const id = currentGroup.group.id,
      node = form('สิทธิ์ ' + member.name, async (f) => {
        await call(`/groups/${id}/members/${member.id}`, {
          method: 'PUT',
          body: {
            role: f.elements.role.value,
            blocked: f.elements.blocked.checked,
            autoApprove: f.elements.autoApprove.checked,
          },
        });
        dialog.close();
        await detail(id);
      });
    select(
      node,
      'บทบาท',
      'role',
      [
        ['member', 'สมาชิก'],
        ['editor', 'ผู้แก้ไข'],
        ['manager', 'ผู้จัดการ'],
      ],
      member.role,
    );
    input(node, 'ระงับเฉพาะกลุ่มนี้', 'blocked', member.blocked, 'checkbox');
    input(node, 'อนุมัติอัตโนมัติได้', 'autoApprove', member.auto_approve, 'checkbox');
    submit(node);
  }
  async function transfer() {
    const id = currentGroup.group.id,
      node = form('โอนเจ้าของ', async (f) => {
        if (!confirm('ยืนยันโอนเจ้าของกลุ่ม?')) return;
        await call(`/groups/${id}/transfer`, {
          method: 'POST',
          body: { userId: f.elements.userId.value },
        });
        dialog.close();
        await detail(id);
      });
    select(
      node,
      'เจ้าของคนใหม่',
      'userId',
      currentGroup.members
        .filter((m) => !m.blocked && m.role !== 'owner')
        .map((m) => [m.id, m.name]),
      '',
    );
    submit(node, 'โอนเจ้าของ');
  }
  async function invite() {
    const id = currentGroup.group.id,
      node = form('เชิญเข้ากลุ่ม', async (f) => {
        const result = await call(`/groups/${id}/invitations`, {
          method: 'POST',
          body: {
            kind: f.elements.kind.value,
            email: f.elements.email.value,
            role: f.elements.role.value,
            days: Number(f.elements.days.value),
            maxUses: Number(f.elements.maxUses.value),
            sendEmail: f.elements.sendEmail.checked,
          },
        });
        const resultBox = input(
          node,
          'คำเชิญที่สร้างแล้ว',
          'result',
          result.kind === 'code' ? result.token : result.url,
        );
        resultBox.readOnly = true;
        notice(
          result.delivery?.status === 'sent'
            ? 'ส่งอีเมลแล้ว'
            : result.delivery?.status === 'not-configured'
              ? 'สร้างคำเชิญแล้ว แต่ยังไม่ได้ตั้ง SMTP'
              : 'สร้างคำเชิญแล้ว คัดลอกลิงก์หรือรหัสให้ผู้รับ',
        );
      });
    select(
      node,
      'วิธีเชิญ',
      'kind',
      [
        ['link', 'ลิงก์'],
        ['email', 'อีเมลล่วงหน้า'],
        ['code', 'รหัสกลุ่ม'],
      ],
      'link',
    );
    input(node, 'อีเมล', 'email', '', 'email');
    input(node, 'ส่งอีเมลด้วย (ต้องตั้ง SMTP)', 'sendEmail', false, 'checkbox');
    select(
      node,
      'บทบาท',
      'role',
      [
        ['member', 'สมาชิก'],
        ['editor', 'ผู้แก้ไข'],
        ['manager', 'ผู้จัดการ'],
      ],
      'member',
    );
    input(node, 'อายุ (วัน)', 'days', '7', 'number');
    input(node, 'จำนวนการใช้', 'maxUses', '1', 'number');
    submit(node, 'สร้างคำเชิญ');
  }
  async function csv() {
    const id = currentGroup.group.id;
    let content = '',
      valid = false;
    const node = form('นำเข้ารายชื่อ CSV', async () => {
      if (!valid) throw new Error('เลือก CSV และตรวจรายการก่อน');
      const result = await call(`/groups/${id}/invitations/csv`, {
        method: 'POST',
        body: { csv: content, confirm: true },
      });
      dialog.close();
      notice(`สร้างคำเชิญ ${result.invitations.length} รายการแล้ว`);
      await detail(id);
    });
    node.append(el('p', 'muted', 'หัวตาราง email,name,role · member หรือ editor · สูงสุด 500 คน'));
    const file = input(node, 'CSV', 'csv', '', 'file');
    file.accept = '.csv,text/csv';
    const preview = el('div');
    node.append(preview);
    file.onchange = async () => {
      try {
        if (file.files[0].size > 100000) throw new Error('CSV ใหญ่เกิน 100 KB');
        content = await file.files[0].text();
        const result = await call(`/groups/${id}/invitations/csv`, {
          method: 'POST',
          body: { csv: content },
        });
        valid = result.rows.length > 0 && !result.rows.some((row) => row.error);
        preview.replaceChildren();
        for (const row of result.rows)
          preview.append(
            el(
              'p',
              'muted',
              `${row.row}: ${row.email} · ${row.role}${row.error ? ' · ' + row.error : ''}`,
            ),
          );
      } catch (error) {
        valid = false;
        notice(error.message);
      }
    };
    submit(node, 'ยืนยันนำเข้า');
  }
  async function bindingForm(binding) {
    const categoryCatalog = await call('/catalog');
    const id = currentGroup.group.id,
      config = binding?.config || {
        dailyTime: '07:00',
        beforeDay: true,
        timed: false,
        leadMinutes: 30,
        color: '#4285f4',
        categories: ['academic', 'community', 'important', 'holiday'],
      },
      node = form('เชื่อมช่อง Discord', async (f) => {
        await call(`/groups/${id}/bindings`, {
          method: 'POST',
          body: {
            id: binding?.id,
            guildId: f.elements.guildId.value,
            channelId: f.elements.channelId.value,
            enabled: f.elements.enabled.checked,
            config: {
              ...config,
              dailyTime: f.elements.dailyTime.value,
              beforeDay: f.elements.beforeDay.checked,
              timed: f.elements.timed.checked,
              leadMinutes: Number(f.elements.leadMinutes.value),
              color: f.elements.color.value,
              categories: [...f.querySelectorAll('[name="category"]:checked')].map(
                (field) => field.value,
              ),
            },
          },
        });
        dialog.close();
        await detail(id);
      });
    input(node, 'Server ID', 'guildId', binding?.guild_id || '');
    input(node, 'Channel ID', 'channelId', binding?.channel_id || '');
    input(node, 'เวลาแจ้งสรุป', 'dailyTime', config.dailyTime, 'time');
    input(node, 'สี', 'color', config.color, 'color');
    input(node, 'เปิดส่ง', 'enabled', binding?.enabled ?? true, 'checkbox');
    const categoryList = el('fieldset');
    categoryList.append(el('legend', '', 'หมวดที่จะส่งแจ้งเตือน'));
    for (const category of categoryCatalog) {
      const checkbox = input(
        categoryList,
        category.label,
        'category',
        config.categories.includes(category.id),
        'checkbox',
      );
      checkbox.value = category.id;
    }
    node.append(categoryList);
    input(node, 'เตือนล่วงหน้าหนึ่งวัน ตอนเที่ยง', 'beforeDay', config.beforeDay, 'checkbox');
    input(node, 'เพิ่มการเตือนตามเวลากิจกรรม', 'timed', config.timed, 'checkbox');
    select(
      node,
      'เตือนล่วงหน้า (นาที)',
      'leadMinutes',
      [0, 5, 15, 30, 60, 1440].map((n) => [String(n), String(n)]),
      String(config.leadMinutes),
    );
    node.append(el('p', 'muted', 'บอทจะตรวจว่าอยู่ในเซิร์ฟเวอร์และมีสิทธิ์ส่งข้อความในช่องนี้'));
    submit(node);
    if (binding)
      node.append(
        button('ส่งข้อความทดลอง', async () => {
          await call(`/groups/${id}/bindings`, {
            method: 'POST',
            body: {
              id: binding.id,
              guildId: binding.guild_id,
              channelId: binding.channel_id,
              enabled: !!binding.enabled,
              config: binding.config,
              test: true,
            },
          });
          notice('เพิ่มงานส่งทดลองแล้ว');
        }),
      );
  }
  async function eventForm(event) {
    const id = currentGroup.group.id,
      node = form('แก้กิจกรรม', async (f) => {
        await call(`/groups/${id}/events/${event.id}`, {
          method: 'PUT',
          body: {
            title: f.elements.title.value,
            description: f.elements.description.value,
            date: f.elements.date.value,
            endDate: f.elements.endDate.value,
            time: f.elements.time.value,
            endTime: f.elements.endTime.value,
            allDay: f.elements.allDay.checked,
            color: f.elements.color.value,
            category: f.elements.category.value,
          },
        });
        dialog.close();
        await detail(id);
      });
    input(node, 'ชื่อ', 'title', event.title);
    input(node, 'รายละเอียด', 'description', event.description);
    input(node, 'วันที่เริ่ม', 'date', event.date, 'date');
    input(node, 'วันที่สิ้นสุด', 'endDate', event.end_date, 'date');
    input(node, 'ทั้งวัน', 'allDay', event.all_day, 'checkbox');
    input(node, 'เวลาเริ่ม', 'time', event.time || '09:00', 'time');
    input(node, 'เวลาสิ้นสุด', 'endTime', event.end_time || '10:00', 'time');
    input(node, 'สี', 'color', event.color, 'color');
    input(node, 'หมวด', 'category', event.category);
    submit(node);
  }
  async function users() {
    const body = root(),
      items = await call('/users');
    body.replaceChildren(head('สมาชิกทุกกลุ่ม'));
    for (const user of items) {
      const row = el('article', 'status-card');
      row.append(el('h3', '', user.name), el('p', 'muted', user.provider));
      for (const group of user.groups)
        row.append(
          button(`${group.name} · ${roles[group.role]}${group.blocked ? ' · ระงับ' : ''}`, () =>
            detail(group.id),
          ),
        );
      body.append(row);
    }
  }
  async function jobs() {
    const body = root(),
      items = await call('/jobs');
    body.replaceChildren(head('งานแจ้งเตือน Discord'));
    for (const job of items) {
      const row = el('article', 'status-card calendar-admin-row');
      row.append(
        el('strong', '', job.name),
        el(
          'span',
          'muted',
          `${job.state} · ${new Date(job.due_at).toLocaleString('th-TH')} · ${job.guild_id}/${job.channel_id}`,
        ),
      );
      if (job.error) row.append(el('p', 'muted', job.error));
      if (['failed', 'uncertain'].includes(job.state))
        row.append(
          button('ลองใหม่', async () => {
            if (
              !confirm(
                job.state === 'uncertain'
                  ? 'ตรวจช่องแล้วว่าไม่มีข้อความซ้ำหรือยัง? งานนี้อาจส่งไปแล้ว'
                  : 'ลองส่งงานนี้อีกครั้ง?',
              )
            )
              return;
            await call(`/jobs/${job.id}/retry`, {
              method: 'POST',
              body: { confirmCheckedChannel: true },
            });
            await jobs();
          }),
        );
      body.append(row);
    }
  }
  async function audit() {
    const body = root();
    body.replaceChildren(head('ประวัติผู้ดูแล'));
    for (const row of await call('/audit'))
      body.append(
        el(
          'p',
          'status-card',
          `${new Date(row.created_at).toLocaleString('th-TH')} · ${row.actor} · ${row.action} · ${row.group_id || 'ระบบ'}`,
        ),
      );
  }
  window.TutelCalendarAdmin = {
    async open(api, toast) {
      request = api;
      notice = toast;
      try {
        const config = await call('/config');
        website = config.website;
        const body = root();
        if (!config.configured) {
          body.replaceChildren(
            el(
              'p',
              'status-card',
              'ยังไม่ได้ตั้ง Calendar service URL และ control secret บนเครื่องนี้',
            ),
          );
          return;
        }
        const data = await call('/overview'),
          summary = document.getElementById('calendar-admin-summary');
        summary.replaceChildren();
        for (const [key, label] of [
          ['groups', 'กลุ่ม'],
          ['members', 'บัญชี'],
          ['pending', 'รออนุมัติ'],
          ['failed', 'การส่งผิดพลาด'],
        ]) {
          const card = el('div', 'status-card');
          card.append(el('strong', '', String(data[key])), el('span', 'muted', label));
          summary.append(card);
        }
        const nav = document.getElementById('calendar-admin-tabs');
        nav.replaceChildren(
          button('กลุ่มทั้งหมด', groups),
          button('สมาชิกทั้งหมด', users),
          button('งานแจ้งเตือน', jobs),
          button('ประวัติการจัดการ', audit),
        );
        await groups();
      } catch (error) {
        root().replaceChildren(el('p', 'status-card', error.message));
      }
    },
  };
})();
