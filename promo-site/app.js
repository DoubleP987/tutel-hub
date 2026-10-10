(() => {
  const translations = {
    th: {
      smoothChartLabel: 'ภาพตัวอย่างการซ้อนเสียงสองเพลง',

      smoothTrackB: 'เพลงถัดไป',

      smoothTrackA: 'เพลงปัจจุบัน',

      smoothNote: 'เปิดแยกเซิร์ฟเวอร์ · ตั้งค่าในแผงเพลง · ขึ้นกับการเข้าถึงแหล่งเพลง',

      smoothSkipText: 'ส่งต่อเสียงแบบเดียวกันเมื่อคุณกดข้ามเพลง',

      smoothSkip: 'ข้ามอย่างนุ่มนวล',

      smoothOverlapText: 'เพลงเดิมค่อย ๆ เบา เพลงใหม่ค่อย ๆ ดัง',

      smoothOverlap: 'ซ้อน 350 ms',

      smoothPrepareText: 'เตรียมเพลงถัดไปขณะเพลงปัจจุบันเล่น',

      smoothPrepare: 'เตรียมไว้ก่อน',

      smoothDescription:
        'ซ้อนเสียงนิดเดียว ฟังต่างไปเยอะ ฟังเพลงเดิมต่อขณะที่ Tutel เตรียมเพลงถัดไป',

      smoothHeading: 'สองเพลง<br />หนึ่งจังหวะที่ไหลต่อ',

      smoothEyebrow: 'ออกแบบจังหวะส่งต่อ',

      guideSmoothBody:
        '<p>กด <strong>ตั้งค่า</strong> ที่แผงเพลงแล้วเปิด <strong>Smooth transition</strong> กดปิดเพื่อเล่นตามปกติ ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์ ค่าเริ่มต้นปิดและจำแยกแต่ละเซิร์ฟเวอร์</p><p>เมื่อเพลงเริ่ม Tutel เตรียมเพลงถัดไปหนึ่งเพลงใน RAM ตอนสลับเพลงเดิมค่อย ๆ เบาลงและเพลงใหม่ค่อย ๆ ดังขึ้น ซ้อนกัน <strong>350 มิลลิวินาที</strong> กดข้ามก็ใช้การซ้อนสั้น ๆ ผ่านสตรีมเสียงเดียวกัน</p><p>ถ้ากดข้ามก่อนเตรียมเสร็จ เพลงเดิมเล่นรอไปก่อน เครือข่ายช้าหรือแหล่งเพลงไม่พร้อมยังทำให้รอเมื่อเพลงจบเองได้ วิทยุใช้สตรีมสดตามปกติ</p>',

      guideSmoothHeading: 'เปลี่ยนเพลงแบบนุ่มนวล',

      guideSmoothText: 'ซ้อนเสียง เตรียมเพลง และตั้งค่าเซิร์ฟเวอร์',

      guideSmooth: 'คู่มือเปลี่ยนเพลงนุ่มนวล',

      smoothControl: 'ตั้งค่าแผงเพลง → Smooth transition',

      smoothText:
        'เตรียมเพลงถัดไปขณะฟัง ซ้อนเสียงสั้น ๆ ให้เพลงเดิมค่อย ๆ เบาและเพลงใหม่ค่อย ๆ ดัง แม้ตอนกดข้าม เปิดได้ในตั้งค่าแผงเพลงของเซิร์ฟเวอร์',

      smoothTitle: 'เพลงถัดไป ค่อย ๆ เข้ามา',

      stripSmooth: 'Smooth transitions',

      tagSmooth: 'เปลี่ยนเพลงนุ่มนวล',

      skip: 'ข้ามไปเนื้อหา',
      navFeatures: 'ฟีเจอร์',
      navCommands: 'คำสั่ง',
      navDocs: 'คู่มือ',
      inviteShort: 'เพิ่ม Tutel ↗',
      invite: 'เชิญเข้า Discord ↗',
      github: 'ดูโปรเจกต์บน GitHub',
      eyebrow: 'เพื่อนตัวเล็กประจำเซิร์ฟเวอร์',
      heroTitle: 'เพลงดี ๆ<br />เพื่อนคนเดิม<br /><em>เติม Tutel อีกนิด</em>',
      heroDescription:
        'ค้นหาเพลงถัดไป ฟังวิทยุสด และปล่อยให้เสียงเพลงไหลต่อ บอทเพลง Discord ตัวเล็กพร้อมปุ่มควบคุมในแชท',
      heroNote: 'สั่งด้วย / · กดควบคุมในแชท · ไม่บันทึกไฟล์เพลง',
      tagMusic: 'เพลง',
      tagRadio: 'วิทยุสด',
      demo: 'ตัวอย่าง',
      credit: 'by Double_P',
      nowPlaying: 'กำลังเล่น',
      demoSong: 'เพลงเล็ก ๆ สำหรับวันนี้',
      demoArtist: 'เพลงที่ชอบ · กับคนที่ใช่',
      demoHint: 'ปุ่มควบคุมอยู่ใต้ข้อความเพลงล่าสุด',
      chipTitle: 'ให้เพลงไหลต่อ',
      chipText: 'เพลงเก่าเบาลง เพลงใหม่ดังขึ้น',
      demoCaption: 'ภาพตัวอย่างการใช้งาน ไม่ใช่เครื่องเล่นสด',
      strip: 'สลับหน้าน้อยลง อยู่ด้วยกันให้นานขึ้น',
      stripRadio: 'วิทยุไทย',
      featureEyebrow: 'บอทตัวเล็ก ประโยชน์ไม่เล็ก',
      featureTitle: 'ทำให้เซิร์ฟเวอร์น่าอยู่ขึ้น',
      featureDescription: 'ฟังเพลง ฟังวิทยุ และควบคุมได้โดยไม่หลุดจากบทสนทนา',
      musicTitle: 'เปิดเพลง แล้วอยู่ต่ออีกหน่อย',
      musicText:
        'ค้นหาด้วยชื่อเพลงหรือลิงก์ เลือก YouTube หรือ SoundCloud แยกแต่ละเซิร์ฟเวอร์ เพิ่มเพลงลงคิว หรือให้โหมดสุ่มเล่นต่อเนื่อง',
      songName: 'ชื่อเพลง',
      radioTitle: 'ฟังเรื่องราวที่กำลังเกิดขึ้น',
      radioText:
        'ฟังวิทยุไทยสด ค้นหาด้วยชื่อสถานีหรือความถี่ พร้อมเลือกพื้นที่เพื่อให้ได้สตรีมออนไลน์ตรงสถานี',
      controlTitle: 'ควบคุมได้ตรงแชท',
      controlText: 'พัก ข้าม วนเพลง เลือกแนวสุ่ม และจัดคิวจากแผงเพลงล่าสุด',
      panelTitle: 'ตั้งค่าให้เป็นแบบที่ชอบ',
      panelText:
        'เลือกแหล่งเพลงและเปิด/ปิด Smooth transition ในตั้งค่าส่วนตัว แยกจำค่าของแต่ละเซิร์ฟเวอร์',
      startEyebrow: 'เริ่มใช้ได้เลย',
      startTitle: 'สามขั้นตอน แล้วกดเล่น',
      step1Title: 'เชิญ Tutel',
      step1Text: 'เลือกเซิร์ฟเวอร์ Discord และอนุญาตสิทธิ์ข้อความกับเสียงที่บอทต้องใช้',
      step2Title: 'เข้าห้องเสียง',
      step2Text: 'เลือกห้องที่ Tutel มีสิทธิ์เชื่อมต่อและพูดได้',
      step3Title: 'เลือกเพลงแรก',
      step3Text: 'ใช้ /play ตามด้วยชื่อเพลงหรือลิงก์ที่รองรับ แล้วปุ่มเครื่องเล่นจะขึ้นในแชท',
      commandsEyebrow: 'ไม่ต้องเดาคำสั่ง',
      commandsTitle: 'อยากทำอะไร ใช้คำสั่งนี้',
      searchPlaceholder: 'ค้นหาคำสั่ง',
      all: 'ทั้งหมด',
      emptyCommands: 'ไม่พบคำสั่ง ลองค้นหาด้วยคำอื่น',
      commandsNote: 'การเปลี่ยนแหล่งเพลงหรือโหมด Smooth transition ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์',
      docsEyebrow: 'มีคู่มืออยู่ตรงนี้',
      docsTitle: 'เริ่มได้ เข้าใจง่าย<br />และเรียนรู้ต่อได้',
      docsText:
        'วิธีใช้สำหรับสมาชิกเซิร์ฟเวอร์ และเอกสารละเอียดสำหรับคนที่อยากติดตั้ง ตั้งค่า หรือเข้าใจการทำงานของ Tutel',
      docsLink: 'อ่านเอกสารของโปรเจกต์ ↗',
      guideMusic: 'คู่มือเพลงและวิทยุ',
      guideMusicText: 'การเล่นเพลง แหล่งเพลง และสถานีออนไลน์',
      guideHost: 'ติดตั้ง Tutel ของคุณเอง',
      guideHostText: 'คู่มือติดตั้งภาษาไทยและอังกฤษ',
      faqTitle: 'เรื่องที่อาจสงสัย',
      faq1: 'Tutel ดาวน์โหลดเพลงเก็บไว้ไหม?',
      answer1:
        'ไม่บันทึกไฟล์เพลงลงดิสก์ โหมด Smooth เตรียมเพลงถัดไปแบบบีบอัดใน RAM ชั่วคราว แล้วคืนบัฟเฟอร์ตามการเล่น',
      faq2: 'ใช้ลิงก์ YouTube ได้ไหม?',
      answer2:
        'ได้เมื่อเครื่องที่รันเข้าถึง YouTube ได้ สามารถเลือกค้นหา YouTube หรือ SoundCloud แยกแต่ละเซิร์ฟเวอร์ ทั้งนี้การเข้าถึงและข้อจำกัดขึ้นกับแหล่งเพลง',
      faq3: 'เล่นวิทยุได้ทุกคลื่นหรือเปล่า?',
      answer3:
        'เล่นได้เฉพาะสถานีที่มีสตรีมเสียงออนไลน์และเข้าถึงได้ ควรระบุพื้นที่คู่กับความถี่ เพราะสถานีคนละพื้นที่อาจใช้คลื่นเดียวกัน',
      faq4: 'เปิด Smooth transition ยังไง?',
      answer4:
        'กดตั้งค่าบนแผงเพลงแล้วเปิด Smooth transition ค่าเริ่มต้นปิดและจำแยกเซิร์ฟเวอร์ เตรียมเพลงถัดไปแล้วซ้อนเสียง 350 มิลลิวินาที แหล่งเพลงที่ช้ายังทำให้รอได้',
      faq5: 'ทำไมคำสั่งไม่ขึ้น หรือเล่นแล้วไม่มีเสียง?',
      answer5:
        'ตรวจว่า Tutel ออนไลน์ ห้องเสียงอนุญาตให้เชื่อมต่อและพูด และแหล่งเพลงใช้งานได้ คำสั่งที่ลงทะเบียนใหม่อาจต้องรีเฟรช Discord ก่อนจึงจะเห็น',
      faq6: 'Tutel เป็นบอททางการของ Discord ไหม?',
      answer6:
        'ไม่ใช่ Tutel เป็นโปรเจกต์อิสระโดย Double_P ชื่อ Discord, YouTube และ SoundCloud เป็นของเจ้าของบริการแต่ละราย',
      ctaEyebrow: 'เผื่อที่ให้เต่าสักตัว',
      ctaTitle: 'เติมชีวิตอีกนิด<br />ให้เซิร์ฟเวอร์ของคุณ',
      ctaNote: 'ตั้งใจทำ โดย Double_P',
      footerText: 'เพลง เรื่องราว และเต่าตัวเล็ก',
      privacy: 'ข้อมูลและความเป็นส่วนตัว',
      reportIssue: 'แจ้งปัญหา ↗',
      footerCredit:
        'พัฒนาด้วย discord.js, @discordjs/voice, yt-dlp และ FFmpeg · โปรเจกต์อิสระโดย Double_P',
      guideTitle: 'คู่มือเริ่มต้น Tutel',
      guideIntro: 'เริ่มเพลงแรก สถานีสด และเปลี่ยนเพลงแบบนุ่มนวล',
      guideBack: '← กลับหน้าหลัก',
      guideMusicHeading: 'เพลงและวิทยุ',
      guideMusicBody:
        '<p>เข้าห้องเสียง แล้วใช้ <code>/play query:ชื่อเพลง</code> หรือใส่ลิงก์เพลงที่รองรับ Tutel จะเข้าห้องและสร้างปุ่มควบคุมใต้ข้อความล่าสุด</p><p>เปิดตั้งค่าที่แผงเพลงเพื่อเปิด/ปิด Smooth transition แยกแต่ละเซิร์ฟเวอร์ ระบบเตรียมเพลงถัดไปใน RAM และซ้อนเสียงสั้น ๆ รวมตอนกดข้าม ผู้เปลี่ยนค่าต้องมีสิทธิ์จัดการเซิร์ฟเวอร์ แหล่งเพลงที่ช้ายังทำให้รอได้</p><p>ใช้ <code>/music settings source:youtube</code> หรือ <code>soundcloud</code> เพื่อเลือกแหล่งค้นหา การเปลี่ยนค่าต้องมีสิทธิ์จัดการเซิร์ฟเวอร์ แหล่งที่เครื่องรันเข้าถึงได้อาจแตกต่างกัน</p><p>ใช้ <code>/randommusic</code> เพื่อสุ่มเพลงเดี่ยวต่อเนื่อง กด <code>/stop</code> เพื่อหยุดและล้างคิว หรือ <code>/leave</code> เพื่อออกจากห้อง</p><p>เริ่มวิทยุด้วย <code>/radio list area:hatyai</code> แล้วเลือกสถานีด้วย <code>/radio play station:ชื่อสถานี area:hatyai</code> ความถี่อย่างเดียวไม่ใช่ตัวรับ FM ต้องมีสตรีมออนไลน์ที่ใช้งานได้</p>',
      guidePermissionsHeading: 'สิทธิ์ที่ต้องใช้',
      guidePermissionsBody:
        '<p>บอทใช้สิทธิ์ดูช่อง ส่งข้อความ ฝังข้อความ อ่านประวัติ เชื่อมต่อห้องเสียง และพูด ลิงก์เชิญไม่ขอ Administrator บางระบบอนุญาตแนบไฟล์สำหรับคำตอบของบอทด้วย</p><p>สิทธิ์รายช่องอาจทับ role บอท ถ้าเปิดไม่ได้ให้ตรวจ Connect และ Speak ในห้องเสียงนั้น</p>',
      guidePrivacyHeading: 'ข้อมูลและความเป็นส่วนตัว',
      guidePrivacyBody:
        '<p>Tutel เก็บค่าของเซิร์ฟเวอร์และตัวอ้างอิงสำหรับปุ่มควบคุม คิวและเสียงชั่วคราวอยู่ในหน่วยความจำ ไม่บันทึกไฟล์เพลงลงดิสก์และไม่บันทึกเสียงสมาชิก</p><p>เว็บโปรโมทนี้ไม่มี analytics หรือแบบฟอร์มส่งข้อมูล เก็บภาษาและธีมที่เลือกใน localStorage ลิงก์ Discord และ GitHub เปิดบริการภายนอกที่มีนโยบายของตนเอง</p><p>หากต้องการแก้หรือลบข้อมูลบอทให้ติดต่อผู้ดูแลเครื่องที่รัน Tutel เป็นโปรเจกต์อิสระจาก Discord และแหล่งเพลง</p>',
      guideCreditsHeading: 'เครดิตและเอกสารเพิ่มเติม',
      guideCreditsBody:
        '<p>สร้างและดูแลโดย <strong>Double_P</strong> ใช้ discord.js, @discordjs/voice, yt-dlp และ FFmpeg ภาพเต่าเป็นโลโก้เดิมของโปรเจกต์</p><p>อ่านคู่มือเพลงใน GitHub สำหรับการติดตั้ง ระบบเสียง และโครงสร้าง ไลบรารีแต่ละตัวมีสัญญาอนุญาตของตนเอง</p>',
    },
  };
  const commandData = [
    [
      '/help',
      'help',
      'Open private website and guide buttons.',
      'เปิดปุ่มเว็บและคู่มือที่เห็นเฉพาะคุณ',
    ],
    [
      '/play',
      'music',
      'Search by song name or play a supported link.',
      'ค้นหาด้วยชื่อเพลงหรือเปิดลิงก์ที่รองรับ',
    ],
    ['/queue', 'music', 'See the songs waiting in the queue.', 'ดูรายการเพลงที่รอในคิว'],
    ['/skip', 'music', 'Move to the next song.', 'ข้ามไปเพลงถัดไป'],
    ['/pause', 'music', 'Pause the current song.', 'พักเพลงที่กำลังเล่น'],
    ['/resume', 'music', 'Continue a paused song.', 'เล่นเพลงที่พักไว้ต่อ'],
    ['/stop', 'music', 'Stop playback and clear the queue.', 'หยุดเพลงและล้างคิว'],
    ['/nowplaying', 'music', 'See the current song.', 'ดูเพลงที่กำลังเล่น'],
    ['/leave', 'music', 'Stop and leave the voice channel.', 'หยุดและออกจากห้องเสียง'],
    [
      '/randommusic',
      'music',
      'Keep playing a varied selection of single songs.',
      'สุ่มเพลงเดี่ยวคละศิลปินและเล่นต่อเนื่อง',
    ],
    [
      '/music settings',
      'music',
      'Choose YouTube or SoundCloud for this server.',
      'เลือก YouTube หรือ SoundCloud ของเซิร์ฟเวอร์',
    ],
    ['/radio list', 'radio', 'Browse stations by area.', 'ดูสถานีและเลือกพื้นที่'],
    [
      '/radio play',
      'radio',
      'Play a live online station by name or frequency.',
      'เปิดสถานีสดด้วยชื่อหรือคลื่นความถี่',
    ],
  ];
  const originals = new Map();
  document.querySelectorAll('[data-i18n]').forEach((node) => originals.set(node, node.innerHTML));
  let language;

  try {
    language = localStorage.getItem('tutel-promo-language');
  } catch {}

  if (!['th', 'en'].includes(language)) {
    language = (navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en';
  }

  let filter = 'all';
  const list = document.querySelector('#command-list');
  const search = document.querySelector('#command-search');

  function renderCommands() {
    if (!list) {
      return;
    }

    const query = (search.value || '').trim().toLowerCase();
    const rows = commandData.filter(
      (row) =>
        (filter === 'all' || row[1] === filter) && row.join(' ').toLowerCase().includes(query),
    );
    list.replaceChildren(
      ...rows.map((row) => {
        const item = document.createElement('article');
        item.className = 'command-row';
        const name = document.createElement('code');
        name.textContent = row[0];
        const description = document.createElement('p');
        description.textContent = row[language === 'th' ? 3 : 2];
        item.append(name, description);
        return item;
      }),
    );
    document.querySelector('#empty-commands').hidden = rows.length > 0;
  }

  function renderTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const button = document.querySelector('#theme');

    if (button) {
      const label =
        language === 'th'
          ? dark
            ? 'เปลี่ยนเป็นธีมขาว'
            : 'เปลี่ยนเป็นธีมมืด'
          : dark
            ? 'Switch to light theme'
            : 'Switch to dark theme';
      button.textContent = dark ? '☀' : '☾';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(dark));
    }

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#141b18' : '#ffffff');
  }

  document.querySelector('#theme')?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem('tutel-promo-theme', theme);
    } catch {}

    renderTheme();
  });

  function renderLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.innerHTML =
        language === 'th'
          ? translations.th[node.dataset.i18n] || originals.get(node)
          : originals.get(node);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.placeholder =
        language === 'th' ? translations.th[node.dataset.i18nPlaceholder] : 'Find a command';
    });
    const button = document.querySelector('#language');

    if (button) {
      button.textContent = language === 'th' ? 'EN' : 'ไทย';
      button.setAttribute(
        'aria-label',
        language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย',
      );
    }

    const isGuide = document.querySelector('#privacy') !== null;
    document.title = isGuide
      ? language === 'th'
        ? 'Tutel · คู่มือเริ่มต้น'
        : 'Tutel · Quick-start guide'
      : language === 'th'
        ? 'Tutel · เพลงที่ไหลต่อ'
        : 'Tutel · Music that flows';
    search?.setAttribute('aria-label', language === 'th' ? 'ค้นหาคำสั่ง' : 'Find a command');
    renderTheme();
    renderCommands();
  }

  document.querySelector('#language')?.addEventListener('click', () => {
    language = language === 'th' ? 'en' : 'th';

    try {
      localStorage.setItem('tutel-promo-language', language);
    } catch {}

    renderLanguage();
  });
  document.querySelectorAll('[data-link]').forEach((node) => {
    const url = window.TUTEL_SITE?.[node.dataset.link];

    if (url) {
      node.href = url;
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
    }
  });
  document.querySelectorAll('[data-filter]').forEach((button) =>
    button.addEventListener('click', () => {
      filter = button.dataset.filter;
      document
        .querySelectorAll('[data-filter]')
        .forEach((item) => item.setAttribute('aria-selected', String(item === button)));
      renderCommands();
    }),
  );
  search?.addEventListener('input', renderCommands);
  document.querySelector('#demo-pause')?.addEventListener('click', (event) => {
    const paused = document.querySelector('.showcase').classList.toggle('paused');
    event.currentTarget.textContent = paused ? '▶' : 'Ⅱ';
    event.currentTarget.setAttribute(
      'aria-label',
      paused ? 'Resume visual demo' : 'Pause visual demo',
    );
  });
  document.querySelectorAll('[data-version]').forEach((node) => {
    node.textContent = `v${window.TUTEL_SITE?.version || '1.0.0'}`;
  });
  const year = document.querySelector('#year');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  renderLanguage();
})();
