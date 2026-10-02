(() => {
  const translations = {
    th: {
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
        'เปิดเพลงสร้างบรรยากาศ ฟังวิทยุสด และรวมเรื่องนัดหมายของทุกคนไว้ด้วยกัน บอท Discord ตัวเล็กที่อยู่เป็นเพื่อนในทุกวัน',
      heroNote: 'สั่งด้วย / · กดควบคุมในแชท · ไม่บันทึกไฟล์เพลง',
      tagMusic: 'เพลง',
      tagRadio: 'วิทยุสด',
      tagCalendar: 'ปฏิทิน',
      demo: 'ตัวอย่าง',
      credit: 'by Double_P',
      nowPlaying: 'กำลังเล่น',
      demoSong: 'เพลงเล็ก ๆ สำหรับวันนี้',
      demoArtist: 'เพลงที่ชอบ · กับคนที่ใช่',
      demoHint: 'ปุ่มควบคุมอยู่ใต้ข้อความเพลงล่าสุด',
      chipTitle: 'วันนี้ มีอะไรบ้าง',
      chipText: 'สรุปครั้งเดียว ครบทุกกิจกรรม',
      demoCaption: 'ภาพตัวอย่างการใช้งาน ไม่ใช่เครื่องเล่นสด',
      strip: 'สลับหน้าน้อยลง อยู่ด้วยกันให้นานขึ้น',
      stripRadio: 'วิทยุไทย',
      stripCalendar: 'Tutel Calendar',
      featureEyebrow: 'บอทตัวเล็ก ประโยชน์ไม่เล็ก',
      featureTitle: 'ทำให้เซิร์ฟเวอร์น่าอยู่ขึ้น',
      featureDescription: 'ฟังเพลง คุยกัน และไม่ลืมเรื่องสำคัญของทุกคน',
      musicTitle: 'เปิดเพลง แล้วอยู่ต่ออีกหน่อย',
      musicText:
        'ค้นหาด้วยชื่อเพลงหรือลิงก์ เลือก YouTube หรือ SoundCloud แยกแต่ละเซิร์ฟเวอร์ เพิ่มเพลงลงคิว หรือให้โหมดสุ่มเล่นต่อเนื่อง',
      songName: 'ชื่อเพลง',
      radioTitle: 'ฟังเรื่องราวที่กำลังเกิดขึ้น',
      radioText:
        'ฟังวิทยุไทยสด ค้นหาด้วยชื่อสถานีหรือความถี่ พร้อมเลือกพื้นที่เพื่อให้ได้สตรีมออนไลน์ตรงสถานี',
      calendarTitle: 'เรื่องของวันนี้ อยู่ในแชท',
      calendarText:
        'วันหยุดไทยและกิจกรรมที่เพิ่มเอง เลือกสี ตั้งทำซ้ำ และรับสรุปรายวันใน Discord มีปฏิทินแบบดูอย่างเดียวให้ทุกคนเปิดได้',
      controlTitle: 'ควบคุมได้ตรงแชท',
      controlText:
        'พัก ข้าม ดูคิว และเพิ่มเพลงจากปุ่มใต้ข้อความเครื่องเล่นล่าสุด ไม่ต้องพิมพ์คำสั่งทุกครั้ง',
      panelTitle: 'ตั้งค่าให้เป็นแบบที่ชอบ',
      panelText:
        'จัดการกิจกรรม หมวดแจ้งเตือน สีข้อความ และเพลง ผ่านหน้าผู้ดูแลที่แยกไว้เป็นส่วนตัว',
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
      commandsNote:
        'คำสั่งตั้งค่าต้องมีสิทธิ์ Discord ที่เหมาะสม การตั้งห้องรับแจ้งเตือนปฏิทินต้องใช้ PIN สำหรับตั้งค่า',
      docsEyebrow: 'มีคู่มืออยู่ตรงนี้',
      docsTitle: 'เริ่มได้ เข้าใจง่าย<br />และเรียนรู้ต่อได้',
      docsText:
        'วิธีใช้สำหรับสมาชิกเซิร์ฟเวอร์ และเอกสารละเอียดสำหรับคนที่อยากติดตั้ง ตั้งค่า หรือเข้าใจการทำงานของ Tutel',
      docsLink: 'อ่านเอกสารของโปรเจกต์ ↗',
      guideMusic: 'คู่มือเพลงและวิทยุ',
      guideMusicText: 'การเล่นเพลง แหล่งเพลง และสถานีออนไลน์',
      guideCalendar: 'ปฏิทินและการแจ้งเตือน',
      guideCalendarText: 'กิจกรรม สรุปรายวัน และสิทธิ์การใช้งาน',
      guideHost: 'ติดตั้ง Tutel ของคุณเอง',
      guideHostText: 'คู่มือติดตั้งภาษาไทยและอังกฤษ',
      guidePublic: 'เปิดปฏิทินสาธารณะ',
      guidePublicText: 'ดูปฏิทินได้โดยไม่ต้องเข้าสู่ระบบ',
      faqTitle: 'เรื่องที่อาจสงสัย',
      faq1: 'Tutel ดาวน์โหลดเพลงเก็บไว้ไหม?',
      answer1:
        'ไม่บันทึกเพลงเป็นไฟล์บนเซิร์ฟเวอร์ เสียงจะสตรีมผ่านเซิร์ฟเวอร์ไปยัง Discord โดยยังใช้เครือข่ายและบัฟเฟอร์ชั่วคราวในหน่วยความจำ',
      faq2: 'ใช้ลิงก์ YouTube ได้ไหม?',
      answer2:
        'ได้เมื่อเครื่องที่รันเข้าถึง YouTube ได้ สามารถเลือกค้นหา YouTube หรือ SoundCloud แยกแต่ละเซิร์ฟเวอร์ ทั้งนี้การเข้าถึงและข้อจำกัดขึ้นกับแหล่งเพลง',
      faq3: 'เล่นวิทยุได้ทุกคลื่นหรือเปล่า?',
      answer3:
        'เล่นได้เฉพาะสถานีที่มีสตรีมเสียงออนไลน์และเข้าถึงได้ ควรระบุพื้นที่คู่กับความถี่ เพราะสถานีคนละพื้นที่อาจใช้คลื่นเดียวกัน',
      faq4: 'ใครตั้งค่าปฏิทินได้บ้าง?',
      answer4:
        'ผู้จัดการเซิร์ฟเวอร์ที่มีสิทธิ์ตั้งการแจ้งเตือนได้ การตั้งห้องรับแจ้งเตือนต้องใช้ PIN ส่วนหน้าเว็บผู้ดูแลมีบัญชีแยก และปฏิทินสาธารณะดูได้อย่างเดียว',
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
      guideIntro: 'ทุกอย่างที่ต้องรู้ก่อนเปิดเพลงแรกและตั้งปฏิทินให้เซิร์ฟเวอร์',
      guideBack: '← กลับหน้าหลัก',
      guideMusicHeading: 'เพลงและวิทยุ',
      guideMusicBody:
        '<p>เข้าห้องเสียง แล้วใช้ <code>/play query:ชื่อเพลง</code> หรือใส่ลิงก์เพลงที่รองรับ Tutel จะเข้าห้องและสร้างปุ่มควบคุมใต้ข้อความล่าสุด</p><p>ใช้ <code>/music settings source:youtube</code> หรือ <code>soundcloud</code> เพื่อเลือกแหล่งค้นหา การเปลี่ยนค่าต้องมีสิทธิ์จัดการเซิร์ฟเวอร์ แหล่งที่เครื่องรันเข้าถึงได้อาจแตกต่างกัน</p><p>ใช้ <code>/randommusic</code> เพื่อสุ่มเพลงเดี่ยวต่อเนื่อง กด <code>/stop</code> เพื่อหยุดและล้างคิว หรือ <code>/leave</code> เพื่อออกจากห้อง</p><p>เริ่มวิทยุด้วย <code>/radio list area:hatyai</code> แล้วเลือกสถานีด้วย <code>/radio play station:ชื่อสถานี area:hatyai</code> ความถี่อย่างเดียวไม่ใช่ตัวรับ FM ต้องมีสตรีมออนไลน์ที่ใช้งานได้</p>',
      guideCalendarHeading: 'ปฏิทินและสรุปรายวัน',
      guideCalendarBody:
        '<p>ผู้จัดการเซิร์ฟเวอร์ใช้ <code>/calendar setup channel:ช่อง pin:PIN</code> เพื่อเลือกห้องรับแจ้งเตือน PIN ใช้เฉพาะการตั้งห้อง และไม่ใช่รหัสผ่านเว็บ</p><p>ใช้ <code>/calendar list</code> ดูรายการที่กำลังจะถึง หรือเพิ่มกิจกรรมด้วย <code>/calendar add</code> กิจกรรมระบบ เช่นวันหยุด จะไม่ถูกลบด้วยคำสั่งลบกิจกรรมส่วนตัว</p><p>สรุปรายวันรวมกิจกรรมของวันนั้นในข้อความเดียว โดยเวลาเริ่มต้นคือ 07:00 น. ตามเวลาไทย เปลี่ยนได้ด้วย <code>/calendar config time:07:00</code> หรือในหน้าผู้ดูแล</p><p>หน้าผู้ดูแลจัดการสี หมวดวันสำคัญ การทำซ้ำ และกิจกรรมทั้งวันได้ ปฏิทินสาธารณะดูได้อย่างเดียวและไม่ต้องเข้าสู่ระบบ</p>',
      guidePermissionsHeading: 'สิทธิ์ที่ต้องใช้',
      guidePermissionsBody:
        '<p>บอทต้องดูช่อง ส่งข้อความ ฝังข้อความ แนบไฟล์ อ่านประวัติข้อความ เชื่อมต่อห้องเสียง และพูด สิทธิ์แนบไฟล์ใช้เมื่อสรุปรายวันยาวเกินขนาดข้อความ Discord ลิงก์เชิญหน้านี้ไม่ขอ Administrator</p><p>การตั้งค่าของ Discord แต่ละช่องอาจทับสิทธิ์ของ role บอท หากเปิดเพลงไม่ได้ ให้ตรวจ Connect และ Speak ที่ห้องนั้นด้วย</p>',
      guidePrivacyHeading: 'ข้อมูลและความเป็นส่วนตัว',
      guidePrivacyBody:
        '<p>Tutel เก็บข้อมูลที่จำเป็นต่อการทำงาน เช่นกิจกรรม ค่าของเซิร์ฟเวอร์ ห้องรับแจ้งเตือน ข้อมูลข้อความแจ้งเตือน และบัญชีกับ session ของหน้าผู้ดูแล รหัสผ่านเว็บเก็บเป็นค่า hash</p><p>เพลงไม่ถูกบันทึกเป็นไฟล์ และไม่ได้เพิ่มระบบบันทึกเสียงสมาชิก ปฏิทิน public แสดงกิจกรรมที่เผยแพร่ ผู้ดูแลควรใส่เฉพาะรายละเอียดที่ต้องการให้คนทั่วไปเห็น</p><p>เว็บโปรโมทนี้ไม่มีระบบ analytics หรือแบบฟอร์มส่งข้อมูล เก็บเฉพาะภาษาที่เลือกไว้ใน localStorage ฟอนต์โหลดจาก Google Fonts; ลิงก์ Discord, GitHub และปฏิทินเปิดบริการภายนอกซึ่งมีนโยบายของตนเอง</p><p>หากต้องการแก้หรือลบข้อมูล ให้ติดต่อผู้ดูแลเครื่องที่รันบอท โปรเจกต์นี้ไม่ได้เป็นส่วนหนึ่งของ Discord หรือผู้ให้บริการเพลง</p>',
      guideCreditsHeading: 'เครดิตและเอกสารเพิ่มเติม',
      guideCreditsBody:
        '<p>สร้างและดูแลโดย <strong>Double_P</strong> ใช้ discord.js, @discordjs/voice, yt-dlp, FFmpeg และ date-holidays ภาพเต่าใช้ไฟล์โลโก้เดิมของโปรเจกต์</p><p>อ่าน README และเอกสารใน GitHub สำหรับการติดตั้ง ระบบฐานข้อมูล และโครงสร้างโปรเจกต์ ไลบรารีแต่ละตัวมีสัญญาอนุญาตของตนเอง</p>',
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
    [
      '/calendar setup',
      'calendar',
      'Set the notification channel with the setup PIN.',
      'ตั้งห้องรับแจ้งเตือนด้วย PIN',
    ],
    ['/calendar add', 'calendar', 'Create a custom calendar event.', 'เพิ่มกิจกรรมในปฏิทิน'],
    [
      '/calendar list',
      'calendar',
      'See upcoming events for the next 30 days.',
      'ดูรายการที่จะถึงใน 30 วัน',
    ],
    [
      '/calendar delete',
      'calendar',
      'Remove a custom event using its numeric ID.',
      'ลบกิจกรรมที่เพิ่มเองด้วยหมายเลข ID',
    ],
    [
      '/calendar config',
      'calendar',
      'Choose the daily summary time in Bangkok time.',
      'ตั้งเวลาส่งสรุปรายวันตามเวลาไทย',
    ],
    [
      '/calendar test',
      'calendar',
      'Send a test summary to the configured channel.',
      'ส่งสรุปทดสอบไปยังห้องที่ตั้งค่า',
    ],
  ];
  const originals = new Map();
  document.querySelectorAll('[data-i18n]').forEach((node) => originals.set(node, node.innerHTML));
  let language;
  try {
    language = localStorage.getItem('tutel-promo-language');
  } catch {}
  if (!['th', 'en'].includes(language))
    language = (navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en';
  let filter = 'all';
  const list = document.querySelector('#command-list');
  const search = document.querySelector('#command-search');
  function renderCommands() {
    if (!list) return;
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
        ? 'Tutel · เพลง วิทยุ และปฏิทิน'
        : 'Tutel · Music, radio & calendar';
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
  if (year) year.textContent = new Date().getFullYear();
  renderLanguage();
})();
