(() => {
  const categories = { problem: 'แจ้งปัญหา', suggestion: 'เสนอแนะ', other: 'อื่น ๆ' };
  const statuses = { new: 'ใหม่', in_progress: 'กำลังดูแล', done: 'เสร็จแล้ว' };

  const date = (value) =>
    new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    }).format(new Date(value));

  const el = (tag, className = '', text) => {
    const node = document.createElement(tag);
    node.className = className;

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  };

  let request;
  let notice;
  let page = 1;
  let status = '';
  let category = '';
  let epoch = 0;

  const root = () => document.getElementById('feedback-inbox');

  const call = (path = '', options) => request('/api/calendar-admin/feedback' + path, options);

  const badge = (count) => {
    const node = document.getElementById('feedback-unread');
    node.textContent = count > 99 ? '99+' : count;
    node.hidden = !count;
  };

  function button(label, action, className = 'ghost') {
    const b = el('button', className, label);
    b.type = 'button';

    b.onclick = async () => {
      b.disabled = true;

      try {
        await action();
      } catch (error) {
        notice(error.message);
      } finally {
        b.disabled = false;
      }
    };

    return b;
  }

  function filter(label, values, value, onChange) {
    const wrapper = el('label', '', label);
    const select = el('select');

    for (const [id, name] of Object.entries(values)) {
      const o = el('option', '', name);
      o.value = id;
      select.append(o);
    }

    select.value = value;

    select.onchange = () => {
      onChange(select.value);
      page = 1;
      void list().catch((error) => notice(error.message));
    };

    wrapper.append(select);
    return wrapper;
  }

  async function list() {
    const current = ++epoch;
    const params = new URLSearchParams({ page, status, category });
    const result = await call('?' + params);

    if (current !== epoch) {
      return;
    }

    badge(result.unread);
    const body = root();
    body.replaceChildren();
    const toolbar = el('div', 'feedback-inbox-toolbar');
    toolbar.append(
      filter('สถานะ', { '': 'ทั้งหมด', ...statuses }, status, (value) => (status = value)),
      filter('ประเภท', { '': 'ทั้งหมด', ...categories }, category, (value) => (category = value)),
      button('รีเฟรช', list),
    );
    body.append(toolbar);

    if (!result.items.length) {
      body.append(el('p', 'muted', 'ไม่มี Feedback ในรายการนี้'));
    }

    for (const item of result.items) {
      const card = el(
        'article',
        'status-card feedback-card' + (item.read_at ? '' : ' feedback-unread'),
      );
      const heading = el('div', 'feedback-card-heading');
      heading.append(
        el('strong', '', item.title),
        el('span', 'badge', item.read_at ? statuses[item.status] : 'ยังไม่อ่าน'),
      );
      card.append(
        heading,
        el(
          'p',
          'muted',
          `${item.user_name} · ${item.group_name || 'ปฏิทินทั่วไป'} · ${date(item.created_at)}`,
        ),
        el(
          'p',
          '',
          `${categories[item.category]} · ${statuses[item.status]}${item.image_count ? ' · ' + item.image_count + ' รูป' : ''}`,
        ),
        button('เปิดข้อความ', () => detail(item.id)),
      );
      body.append(card);
    }

    const pages = el('div', 'feedback-inbox-pagination');
    const previous = button('‹ ก่อนหน้า', () => {
      page--;
      return list();
    });
    previous.disabled = page <= 1;
    const next = button('ถัดไป ›', () => {
      page++;
      return list();
    });
    next.disabled = !result.hasMore;
    pages.append(previous, el('span', '', 'หน้า ' + page), next);
    body.append(pages);
  }

  async function detail(id) {
    const current = ++epoch;
    const item = await call('/' + id);

    if (current !== epoch) {
      return;
    }

    const body = root();
    body.replaceChildren();
    body.append(button('‹ กลับไปกล่องข้อความ', list));
    const article = el('article', 'status-card feedback-detail');
    article.append(
      el('h2', '', item.title),
      el('p', 'muted', `${item.user_name} · ${date(item.created_at)}`),
      el(
        'p',
        'muted',
        `${item.group_name || 'ปฏิทินทั่วไป'} · ${categories[item.category]} · หน้า ${item.page_path}`,
      ),
      el('p', 'feedback-message', item.message),
    );
    const images = el('div', 'feedback-inbox-images');

    for (const [index, image] of item.images.entries()) {
      const link = el('a');
      link.href = '/api/calendar-admin/feedback/images/' + image.id;
      link.target = '_blank';
      link.rel = 'noopener';
      const img = el('img');
      img.src = link.href;
      img.alt = 'ภาพแนบ ' + (index + 1);
      img.loading = 'lazy';
      link.append(img);
      images.append(link);
    }

    article.append(images);
    const controls = el('div', 'feedback-inbox-toolbar');
    const wrapper = el('label', '', 'สถานะ');
    const select = el('select');

    for (const [value, name] of Object.entries(statuses)) {
      const option = el('option', '', name);
      option.value = value;
      select.append(option);
    }

    select.value = item.status;
    wrapper.append(select);
    controls.append(
      wrapper,
      button(
        'บันทึกสถานะ',
        async () => {
          await call('/' + id, { method: 'PUT', body: { status: select.value, read: true } });
          notice('บันทึกสถานะแล้ว');
          await detail(id);
        },
        'primary',
      ),
    );
    article.append(controls);
    body.append(article);

    if (!item.read_at) {
      await call('/' + id, { method: 'PUT', body: { read: true } });
      badge((await call('?page=1')).unread);
    }
  }

  window.TutelFeedback = {
    async count(api) {
      try {
        const data = await api('/api/calendar-admin/feedback?page=1');
        badge(data.unread);
      } catch {
        /* Calendar may be unavailable; opening the inbox shows the error. */
      }
    },
    async open(api, toast) {
      request = api;
      notice = toast;
      root().replaceChildren(el('p', 'muted', 'กำลังโหลด Feedback…'));

      try {
        await list();
      } catch (error) {
        root().replaceChildren(el('p', 'muted', error.message), button('ลองใหม่', list));
      }
    },
  };
})();
