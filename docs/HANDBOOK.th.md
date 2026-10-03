> **ฉบับปัจจุบัน 4 ตุลาคม 2569:** อ่าน [การทำงานปัจจุบัน](CURRENT-OPERATIONS.md) ก่อน PDF มีส่วนอัปเดตท้ายเล่มพร้อม bookmark ใช้แทนพฤติกรรมแบบเครื่องเดียว เวลาเตือน Loop และคำสั่งในบทพื้นฐานที่เปลี่ยนแล้ว

# TUTEL HUB

# คู่มือระบบฉบับละเอียด

## สถาปัตยกรรม • โค้ด • ปฏิทิน • บอท • API • การดูแลระบบ

ภาษาไทย

by Double_P | 2 October 2026 | Refactored source edition

[Technical diagram included in the PDF edition]

# สารบัญ

กดชื่อบทหรือเลขหน้าเพื่อไปยังหัวข้อ มี bookmark ในตัวอ่าน PDF

# 01 วิธีใช้คู่มือฉบับนี้

## ขอบเขตและลำดับอ่าน

Tutel Hub รวมบอทเพลงและวิทยุ Discord หน้า admin ส่วนตัว ปฏิทินไทย และเว็บปฏิทินอ่านอย่างเดียว คู่มือนี้อธิบายโค้ดหลังจัดระเบียบวันที่ 2 ตุลาคม 2026 แยกสิ่งที่ทำจริงออกจากข้อแนะนำ ตัวอย่างกิจกรรมและ credential เป็นค่าจำลอง ไม่มี token หรือข้อมูลฐานข้อมูลจริง

เริ่มจากภาพรวมและการเริ่มโปรแกรม แล้วตามกิจกรรมผ่าน model SQLite snapshot และ API ส่วนเสียงควรอ่านแยกเพราะ process และ error ต่างจากเว็บ ภาคผนวกแจกแจงทุกไฟล์โค้ดที่ดูแล route และ environment ว่ารับผิดชอบอะไร

## ไม่ต้องมีพื้นฐาน MySQL มาก่อน

ฐานข้อมูลจะอธิบายเป็นตารางและรายการที่เก็บถาวร API เป็นข้อตกลงระหว่างโปรแกรม session เป็นตัวตนที่ยืนยันแล้วชั่วคราว คำสั่งมีคำอธิบายเหตุผล ไม่ใช่ให้ copy อย่างเดียว

platform ภายนอกเปลี่ยนได้ lockfile ระบุ dependency ที่ตั้งใจใช้ เอกสารทางการท้ายเล่มใช้ตรวจข้อกำหนดใหม่ โปรเจกต์ไม่รับประกันว่าสถานีทุกแห่งมีเสียง เพลงเข้าถึงได้ตลอด หรือวันหยุดพิเศษครบ การ deploy สำเร็จกับได้ยินเสียงจริงเป็นหลักฐานคนละเรื่อง

## เรียนรู้โดยไม่รบกวนระบบจริง

ทดลองกับฐานข้อมูล local แยกและไม่ใช้ token Discord หรือ secret เขียน public เริ่มจากกิจกรรมที่ไม่เป็นความลับหนึ่งรายการ จะเห็นข้อมูลเดินทางอย่างไรโดยไม่แข่งกับบอท homeserver หรือเผยแพร่การทดลอง

# 02 สถาปัตยกรรมและเจ้าของข้อมูล

## โปรแกรมสองฝั่ง

homeserver รัน Node ค้าง ดูแล SQLite login admin แก้กิจกรรม เชื่อม Discord player แยก guild ตรวจเวลาเตือน และส่งข้อมูลออก Vercel รัน frontend กับ serverless API แยกกัน private Blob เก็บ snapshot ที่คัดข้อมูลแล้ว DB บ้านเป็นต้นฉบับ Blob เป็นสำเนาเพื่อแสดง ไม่ใช่ฐานข้อมูลหลัก

## ใครส่งหาใคร

เบราว์เซอร์ admin ส่งคำขอที่ยืนยันตัวไปบ้าน บ้านบันทึก SQLite แล้วเปิด HTTPS ไป Vercel ผู้ชม public อ่าน API Vercel ส่วน interaction Discord เข้าทาง Gateway และบอทตอบผ่าน API แต่ละทางมีตัวตนและสิทธิ์คนละชุด

IP บ้านเปลี่ยนไม่ทำให้ตัวส่งพัง เพราะบ้านเชื่อมออกไป hostname คงที่ ส่วนเข้า admin ต้องถึง LAN หรือ Tailscale การ sync ออกไม่ได้เปิดเว็บบ้านให้คนทั่วไปเข้า

## อ่านอย่างเดียวไม่ได้แปลว่าข้อมูลลับ

ผู้ชมแก้ผ่านเว็บ public ไม่ได้ แต่ชื่อและรายละเอียดที่ export เปิดเผย ปัจจุบันไม่มี field visibility ต่อกิจกรรม แม้ custom event มี guild scope ก็อาจอยู่ public เพราะ guild คุมการส่ง Discord ไม่ใช่ความลับ จึงไม่ควรใส่รายละเอียดส่วนตัวโดยคิดว่า admin มี login แล้ว export จะเป็นส่วนตัว

ภาพระบบแสดงขอบเขตที่สำคัญ ได้แก่ข้อมูลต้นฉบับ สำเนาสาธารณะ admin ส่วนตัว และบริการ Discord/เสียงภายนอก ไม่ใช่เพียงวาดชื่อโฟลเดอร์

[Technical diagram included in the PDF edition]

ภาพสรุปทางเทคนิควาดจากโค้ดของโปรเจกต์; อ่านคำอธิบายในบทสำหรับข้อจำกัด

# 03 เทคโนโลยีที่ใช้และต้นทุนทรัพยากร

## Runtime และแพ็กเกจ

โปรเจกต์ใช้ JavaScript ES modules ผ่าน type: module ต้อง Node 24 ขึ้นไป node:sqlite เก็บข้อมูลถาวรโดยไม่ต้อง daemon ฐานข้อมูลแยก JavaScript server ใช้ไฟล์และ process ได้ แต่ browser อยู่คนละฝั่งและเปิด DB server โดยตรงไม่ได้

discord.js จัดการ client interaction channel และคำสั่ง @discordjs/voice ดูแล connection กับ player ส่วน opusscript เข้ารหัส Opus yt-dlp เป็น executable อ่าน metadata และส่งเสียง FFmpeg ถอดเป็น PCM โดย ffmpeg-static เตรียม binary ให้หรือ override FFMPEG_PATH Express จัด HTTP Helmet ตั้ง header dotenv โหลด config date-holidays ให้ข้อมูลวันหยุด และ public package ของ Vercel ติดตั้ง @vercel/blob แยก

## เบาตรงไหนและยังใช้ทรัพยากรอะไร

SQLite ไม่ต้องดูแล MySQL เพิ่ม streaming ไม่เก็บคลังเพลงถาวร แต่ bytes เสียงยังเข้าเครื่องและอยู่ pipe/buffer FFmpeg กับ Opus ใช้ CPU หลาย guild เพิ่ม subprocess

Node heap limit ไม่จำกัด RAM รวม เพราะ native buffer yt-dlp FFmpeg อยู่นอก budget RAM 1 GB อาจเหมาะกับใช้งานไม่มาก ไม่ใช่รับประกันรองรับไม่จำกัด ต้องวัด CPU/RAM จริงก่อนสรุปจำนวนผู้ใช้ การจัด professional ทำให้ trade-off ชัด ไม่ใช่เพิ่ม framework หรือ DB server เพื่อให้ดูดี

# 04 โครงสร้าง repository และขอบเขตโมดูล

## แบ่งตามความรับผิดชอบ

src/index.js ประกอบระบบและปิดโปรแกรม bot คุมวงจร Discord commands แยกนิยาม เพลง วิทยุ ปฏิทิน music แยกสถานะ stream และค้นสถานี auth ดู password account session database เปิด DB schema และ setting

calendar แยกคำนวณ recurrence บันทึก/ขยาย event scheduler ข้อความ option holiday snapshot และ publish web/server.js ประกอบ Express และ route แยกหมวด middleware ตรวจสิทธิ์ร่วม web/public เป็นต้นฉบับ browser asset

vercel-public deploy อิสระได้ netlify-public เก็บ frontend provider เดิม scripts เป็นเครื่องมือดูแล deploy มี service template docs คู่มือ ส่วน private data backups ไม่ขึ้น Git

## Facade รักษาประตูเดิม

calendar/service.js กับ db.js export ชื่อเดิมแต่ implementation แยกแล้ว commands/handlers.js รวมกลุ่ม วิธีนี้ลดการเปลี่ยน interface ทุกไฟล์ facade ควรบาง ไม่เป็น monolith ใหม่

โมดูลแบ่งตามงาน ไม่ใช่จำนวนบรรทัด browser ยัง classic script เพราะเปลี่ยนเป็น module จะกระทบลำดับโหลดและ deploy ควรแยกงาน CSS รักษาลำดับ override ไม่สลับอัตโนมัติ สำเนา shared asset สร้างจากต้นฉบับเดียว ภาคผนวกช่วยหาว่าจะเพิ่มฟังก์ชันควรเริ่มตรงไหน

# 05 เริ่มระบบ งานพร้อมกัน และปิดระบบ

## ลำดับเริ่ม

index.js โหลด dotenv/config import DB จะสร้างโฟลเดอร์ เปิด DatabaseSync และ schema initializeAccounts สร้างเฉพาะบัญชีที่ไม่มี เปิด scheduler publisher HTTP แล้วพยายาม login ถ้า bot_enabled ไม่เป็นศูนย์ token ไม่มีจะจับ error ให้ panel ยังทำงานได้ แต่เปิด DB ไม่ได้เกิดก่อนและอาจหยุด startup

import facade DB มี side effect สคริปต์ที่คิดว่าแค่อ่าน helper อาจสร้าง/เปิดฐานข้อมูล ควรดู import graph ก่อนเพิ่ม maintenance script

## Async กับ synchronous

network และ pipe ของ subprocess ทำงานระหว่าง JavaScript รอได้ DatabaseSync และ scrypt เป็น synchronous ใช้ thread ของ Node ชั่วคราว busy flag กัน interval ของตัวเองซ้อนใน process เดียว ไม่ประสานหลาย replica

## ปิดอย่างเป็นขั้นตอน

SIGINT/SIGTERM เรียก shutdown รอบเดียว หยุด scheduler/publisher ปิด player Discord รอ HTTP ปิดแล้ว exit ช่วยไม่ทิ้ง subprocess เสียง SQLite ยังไม่ได้เรียก close ชัดใน shutdown แต่ process exit ปล่อยทรัพยากร การเพิ่ม explicit close ควรพิจารณาเป็นการเปลี่ยน lifecycle แยก

ใช้บอท production หนึ่ง process เปิด Windows ด้วย live token พร้อมบ้านอาจเกิด handler และแจ้งเตือนซ้ำ panel เปิดโดยไม่มี token เป็นโหมดพัฒนาที่ใช้ได้ ไม่ใช่หลักฐานว่าติดตั้งเสีย

# 06 ตัวตน Discord เชิญบอท และลงทะเบียน

## งานสามอย่างไม่เหมือนกัน

CLIENT_ID ระบุ application DISCORD_TOKEN ยืนยันบอท GUILD_ID ระบุ server ทดลอง optional เชิญคือ install แอป login คือเชื่อมบอท register คือส่งนิยามคำสั่ง ไม่แทนกัน

invite ใช้ scope bot และ applications.commands สิทธิ์ข้อความ View Channels/Send Messages เสียง Connect/Speak runtime ใช้ Guilds กับ GuildVoiceStates ไม่อ่าน message content เป็นคำสั่ง

## Scope register

npm run register เป็น global register:guild เป็น guild ทดลอง อ่าน definitions.js และใช้ REST ทั้ง global/guild อาจมีชื่อซ้ำ ควรตรวจ scope ก่อนลบ ไม่ได้แปลว่ารันสอง process เสมอ register ไม่แก้เสียงหรือ interaction ช้า

## รับ interaction

InteractionCreate ส่งปุ่มไป handleCalendarButton ส่ง slash ไป commandHandlers ตามชื่อ ไม่รู้จักจะข้าม error เขียน log และพยายามตอบ private งานช้าควร deferReply แล้ว editReply Discord ต้องตอบรับแรกในสามวินาที มิฉะนั้น interaction อาจใช้ไม่ได้

มี music control/randommusic radio list/play calendar setup/add/list/delete/config/test คำสั่งตั้งห้องจริงคือ setup ไม่ใช่ set definitions กำหนด input กับ bounds handler ทำงาน แก้ handler อย่างเดียวไม่ได้เพิ่ม option ใน Discord

# 07 จากคำขอเพลงไปถึงเสียง

## ช่วงค้นข้อมูล

/play ตรวจ guild กับห้องเสียง defer แล้ว resolveTrack URL ใช้ตรง ชื่อแปลงเป็น query เมื่อ scsearch1 ระบบขอสิบผล SoundCloud แล้วเลือกไม่ทราบ duration หรือเกิน 30 วินาที ช่วยตัด preview บางส่วน ไม่รับประกันเพลงเต็ม

resolveQuery เปิด yt-dlp รับ JSON stdout metadata stderr diagnostic exit ไม่สำเร็จ reject ข้อมูลเกินสองล้านตัวอักษรหยุด process track เก็บชื่อ URL duration ไม่ใช่เสียง npm dependency ไม่ได้ติดตั้ง yt-dlp

## ช่วงส่งเสียง

yt-dlp ส่ง stdout ด้วย -o - pipe ไป FFmpeg stdin FFmpeg ส่ง PCM signed 16-bit 48 kHz stereo createAudioResource ระบุ Raw แล้ว voice เข้ารหัส Opus ส่ง Discord PCM หนึ่งวินาทีคือ 48,000 x 2 x 2 = 192,000 bytes ก่อนบีบอัด

ไม่สร้างคลังเพลงถาวร แต่ข้อมูลยังเข้าเครื่องและอยู่ RAM/pipe คำว่าไม่บันทึกไฟล์จึงถูกกว่าไม่ดาวน์โหลด stop callback ฆ่าทั้งสอง process FFmpeg ข้าม EPIPE ที่คาดได้หลังปิด input และ log ปัญหาอื่น

ตัวนับ PCM ประมาณวินาทีผลิต ไม่พิสูจน์ว่าคนได้ยิน connection อยู่ได้แม้ต้นทางเงียบ transcoder พัง หรือสิทธิ์ส่งไม่พอ ต้องไล่แต่ละขั้น ไม่ติดตั้งใหม่ทั้งหมดทันที

[Technical diagram included in the PDF edition]

ภาพสรุปทางเทคนิควาดจากโค้ดของโปรเจกต์; อ่านคำอธิบายในบทสำหรับข้อจำกัด

# 08 สถานะ player คิว และสุ่มเพลง

## สถานะเป็นของใคร

player.js เก็บ Map ตาม guild มี queue current player connection stream randomMode radio randomHistory loadingNext generation คิวอยู่ RAM รีสตาร์ตหาย SQLite ปฏิทินไม่เก็บคิว

ensureConnection join แล้ว subscribe ถ้า connection อยู่ห้องอื่นปฏิเสธ ไม่ย้ายเงียบ NoSubscriberBehavior.Pause หยุด consume เมื่อไม่มี subscriber disconnected ทำลาย state

## คิวและ race

playNext กันโหลดซ้อน เลือกคิวหรือผลสุ่ม generation กันผล async เก่ากลับมาเล่นหลัง stop/เปลี่ยนโหมด Idle ล้างเพลงและไปถัดไป ตอบเพิ่มคิวแล้วจึงยังพังตอนเสียงได้

skip หยุด stream ให้ Idle ขยับ stop เพิ่ม generation ปิดสุ่ม/วิทยุ ล้างคิว/current หยุดเสียงแต่เก็บ connection leave ปิด connection ลบ Map pause/resume คุม player

สุ่มค้นหัวข้อเพลงไทยบน SoundCloud และหลีกเลี่ยง URL ล่าสุด ไม่ใช่ Spotify/recommendation curated radio ล้างคิวกับสุ่ม Idle วิทยุนัด retry ห้าวินาทีแล้วตรวจ state/station เดิม การเปลี่ยนโหมดสำคัญเพราะ timer หรือ search อาจเสร็จหลังผู้ใช้สั่งอย่างอื่น

# 09 ความถี่ พื้นที่ และค้นวิทยุ

## เลขคลื่นไม่ใช่ stream

107.75 เป็นชื่อคลื่น FM ไม่ใช่ที่อยู่อินเทอร์เน็ต ต่างจังหวัดใช้ซ้ำได้ บอทไม่มี tuner ต้องมี HTTP/HLS ออนไลน์ สถานีที่ไม่มี feed ไม่ได้เล่นได้จากเลขคลื่นอย่างเดียว

radio-directory.js รวม catalog สถานีหลัก alias พื้นที่ และ Radio Browser ประเทศไทย request timeout แปดวินาที cache สิบนาที lastcheckok 1 เป็นผลตรวจของ directory ไม่ใช่วัดเสียงขณะนี้

## วิธีจับคู่

/radio list รวม catalog กับ directory ที่ตรงและนิยม จำกัดจำนวน /radio play ลอง alias/name/frequency ของ catalog ก่อน แล้วค้น name/tag/area ถ้าหลายผลใกล้กันให้ชื่อชัด ไม่เลือกมั่ว metadata ไม่ครบและไม่รับประกันทั่วประเทศ

FFmpeg เปิด URL ด้วย reconnect และแปลง PCM HTTP สำเร็จอาจเงียบ โฆษณา หรือ feed ผิด ควรดูชื่อ/URL stderr player และลองสถานีอื่น dynamic directory ช่วยไม่ต้องเตรียมทุกสถานีแต่สร้าง stream ที่ไม่มีจริงไม่ได้

refactor นี้รักษาพฤติกรรม parser ความถี่เดิม การแก้ parser และตรวจเสียงจริงเป็นอีกเรื่อง ผลค้นพบไม่ใช่หลักฐานว่าได้ยินแล้ว

# 10 ข้อมูลกิจกรรมและเขตเวลา

## ต้นฉบับกับ occurrence

events เก็บ title/description start/end all-day/holiday recurrence reminders mode สี guild ผู้สร้าง query เพิ่ม occurrence_at/end แต่ละครั้ง event ซ้ำ ID เดิม frontend/public จึงใช้เวลา occurrence ร่วม

## Validation

saveEvent จำกัดชื่อ 160 รายละเอียด 2,000 สี hex หกหลัก default #4285f4 recurrence none/daily/weekly/monthly/yearly offset จำนวนเต็ม 0-10,080 ไม่เกินห้าค่า วันผิด จบก่อนเริ่ม สีผิด throw

ฟอร์มทั้งวัน endDate รวมวันสุดท้าย แต่ storage จบ exclusive เที่ยงคืนถัดไป วันที่ 13 จบต้นวันที่ 14 แบบมีเวลาไม่ใส่จบใช้หนึ่งชั่วโมง ทำให้ overlap สอดคล้อง

## เวลาไทย

localDateTimeToIso รับ YYYY-MM-DD HH:mm ค.ศ. ของ Bangkok แปลง UTC ISO helper ใช้ UTC+7 UI แสดง พ.ศ. ได้ storage ยัง ค.ศ. 07:00 ไทยคือ 00:00Z ไม่ใช่ 07:00Z อย่าใส่ พ.ศ. ใน ISO และอย่าลบ offset ซ้ำ

ผู้ชมต่างประเทศยังเห็นเวลาไทย เก็บเป็น instant แล้วเลือก timezone ตอนแสดงช่วยไม่ให้ข้อความวันที่แปลตามเครื่องที่อ่านจนผิด

# 11 วันซ้ำและการรวมวันหยุด

## คำนวณวันท้องถิ่น

recurrence.js แยกวันที่ Bangkok daily/weekly เพิ่มหนึ่ง/เจ็ดวัน monthly เก็บ anchor day เดิมและจำกัดเดือนสั้น วันที่ 31 ลงวันท้ายกุมภาพันธ์แล้วกลับ 31 ได้ yearly คุมความยาวเดือน ข้ามไปใกล้ช่วงที่ขอดูแทนไล่ทุกครั้งเก่า จำกัด 800 รอบ

query ปฏิเสธช่วงผิดกลับด้านหรือเกิน 400 วัน occurrence ทับเมื่อ end หลังขอบต้นและ start ก่อนขอบท้าย กิจกรรมยาวเริ่มก่อนช่วงจึงยังแสดงได้

## วันระบบสร้างเมื่อใช้

holidays.js รวม date-holidays รายการวันสำคัญไทย และ holy-days.json สร้างตามปี ไม่บันทึกทุกวันใน events ID รวมวันกับ hash ชื่อ ใช้ standard reminder และหมวด holy-days.json มีช่วงปีจำกัด ไม่ใช่ปฏิทินทางการตลอดกาล ประกาศพิเศษและจันทรคติต้องดูแล

หมวด public substitute bank buddhist holy royal festival thai international custom บางส่วนดูคำในชื่อ event หลายหมวดได้ filter เว็บซ่อน ส่วน filter reminder คุมส่ง ไม่ลบข้อมูล refactor นี้รักษา dataset ไม่ได้รับรองความครบ

# 12 เวลาเตือนและหลักประกันการส่ง

## สร้างเวลาที่ควรส่ง

standard/ทั้งวัน default เที่ยงวันก่อนและ 07:00 วันจริง timed standard ใช้เวลาเริ่มวันจริง guild เปลี่ยนเวลาหรือปิดแต่ละรอบได้ offset ลบนาทีจากเริ่ม occurrence

scheduler รอบแรกทันทีและทุกยี่สิบวินาที ขยายก่อน/หลังแปดวัน กรอง guild/channel/หมวด ตรวจ due มี recovery หนึ่งชั่วโมงหลัง restart ไม่ replay ทั้งอดีต busy กันซ้อนเฉพาะ process

## Deduplication ไม่ใช่ exactly once

calendar_deliveries key รวม guild channel event occurrence schedule ตรวจแถวก่อนส่ง Discord แล้วบันทึก message/payload legacy reminder_log ตรวจ offset บางส่วน รอบซ้ำไม่ส่งรายการที่บันทึกแล้ว

ถ้าส่ง Discord สำเร็จแต่ล่มก่อนบันทึกอาจส่งซ้ำ หลาย process race ได้ จึงตั้งใจ production ตัวเดียว

## หลังส่งแล้วแก้

update ล้าง reminder_log แต่ไม่ล้าง deliveries ทั้งหมด เปลี่ยนชื่อ occurrence ที่ส่งแล้วไม่ resend key เดิม ลบ event ลบ legacy log ที่ผูกไว้ แต่ textual delivery อาจคงสำหรับปุ่ม/ข้อความ เป็น semantics ปัจจุบัน ไม่ใช่ retention ครบ ควรตัดสิน resend/cleanup ก่อนเพิ่ม

# 13 Embed ปุ่ม และลิงก์ไปกิจกรรม

## ข้อความในห้อง

notifications.js สร้าง embed สี guild template footer by Double_P placeholder title/date/schedule/description/category showDetails คุมรายละเอียด จำกัด template/ข้อความ และ allowedMentions ว่างกัน ping จากเนื้อหา

ปุ่มปฏิทินมี delivery ID calendar_latest จำล่าสุดของห้อง ข้อความเก่าเอา components ออกแต่ text อยู่ ข้อความถูกลบ mark inactive

## รายละเอียดเห็นคนเดียว

กดแล้ว defer private อ่าน payload แสดงเปิดปฏิทินกับ Dismiss Dismiss ใส่ ID คนกด ปฏิเสธ custom ID ของคนอื่น timer RAM สามสิบวินาทีพยายามลบ response restart แล้ว timer หายได้ ไม่ใช่งานลบถาวร

calendarUrl สร้าง /calendar date event at เลือกวันไทย event หลัก occurrence ที่ซ้ำ client ไปวันและเปิดรายละเอียด ลิงก์ public ไม่ login admin ตั้ง URL เว็บ public ไม่ใช่ LAN panel

payload เก็บตอนส่ง แก้กิจกรรมทีหลังอาจต่างจาก snippet เก่า ต้องแยกประวัติแจ้งเตือนกับปฏิทินล่าสุด

# 14 เข้าใจและตั้งค่า SQLite

## Embedded แต่ถาวร

SQLite อยู่ในแอป เปิดไฟล์ local ไม่ต้อง MySQL service port หรือบัญชี DB ยังมี SQL/ตาราง embedded ไม่ใช่ชั่วคราว DATABASE_PATH เลือกไฟล์ DATA_DIR เก็บรหัสเริ่มต้นไม่ได้ย้าย DB relative ขึ้นกับ working directory ให้เริ่ม root หรือ absolute server path

connection สร้างโฟลเดอร์เปิด DatabaseSync schema สร้างตารางที่ขาดตรวจคอลัมน์ก่อนเพิ่ม reminder_mode/color เป็น additive compatibility ไม่ใช่ numbered migration แก้ CREATE TABLE ไม่เปลี่ยน type เดิม ต้อง migration/backup

## WAL และ concurrency

ตั้ง WAL synchronous NORMAL foreign_keys ON busy_timeout 5000 WAL ช่วย reader อยู่ร่วม writer แต่เขียนเรียงและ API นี้ synchronous ไม่ใช่ cluster replicate หรือ protocol แชร์ไฟล์ network

.sqlite มี -wal/-shm ได้ เป็นไฟล์ใช้งานปกติไม่ลบตอนรัน ไม่ copy main อย่างเดียว online backup แอปไม่ encrypt SQLite password hash ไม่ใช่รหัสตรงแต่ event/settings/delivery อ่านได้ถ้าได้ไฟล์ DB/backup ต้อง private

# 15 ตาราง key และ setting ที่บันทึก

## ตัวตน

users เก็บ username ไม่ซ้ำ hash role must_change created sessions เก็บ token_hash foreign key user csrf expiry milliseconds ลบ user cascade session ไม่เก็บ browser token ตรง

## ปฏิทิน

events นิยาม custom created_by อ้าง web user Discord เป็น null guild_id null ไม่จำกัด guild guild_config ห้อง/offset app_settings key/value string สำหรับ bot_enabled URL preference option publisher

reminder_log legacy compound key ผูก event deliveries เป็น textual event occurrence schedule channel message payload active uniqueness รวมกันส่งซ้ำ latest เก็บล่าสุดต่อห้อง

## Query และ type

index ช่วย starts_at guild active delivery bind parameter แยกค่าออก syntax setting เป็น string แม้ JSON number boolean ผู้เรียก parse/normalize ไม่มี key null malformed fallback

setting ใหม่ต้องบอก owner default วิธี parse ไม่เป็นที่เก็บไร้เอกสาร ภาพความสัมพันธ์แยก foreign key จริงกับ external ID แบบข้อความ จึงรู้ว่าทำไมบางรายการ cascade และบางรายการคง

[Technical diagram included in the PDF edition]

ภาพสรุปทางเทคนิควาดจากโค้ดของโปรเจกต์; อ่านคำอธิบายในบทสำหรับข้อจำกัด

# 16 รหัสผ่านและ session ที่ยืนยันตัว

## สร้างบัญชีครั้งแรก

สร้าง admin/viewer ที่ขาด รักษาเดิม admin ใหม่ใช้ ADMIN_INITIAL_PASSWORD สิบตัวขึ้นไปหรือสุ่มเก็บ private must_change บังคับเปลี่ยน bootstrap ไม่ reset admin เดิม

passwords.js scrypt salt 16 bytes N32768/r8/p1 key64 packed เก็บ parameter/salt/key ตรวจคำนวณใหม่ timing-safe hash ตรวจได้ไม่ใช่ถอดรหัสกลับ

## Session กับ cookie

createSession สุ่ม token browser32 csrf24 bytes DB เก็บ SHA-256 ของ token ไม่ raw อายุแปดชั่วโมง cookie HttpOnly SameSite Strict Path / Secure ถ้า HTTPS JavaScript อ่าน csrf จาก authenticated session endpoint

logout ลบ session clear cookie เปลี่ยนรหัส invalidates ของ user แล้วสร้างใหม่ หมดอายุลบเมื่อใช้ ไม่มี periodic cleanup ทั้งระบบ

LAN HTTP Tailscale HTTPS คนละ origin cookie/localStorage ไม่ย้ายตาม login ที่หนึ่งไม่แปลว่าอีกที่ login อย่าเพิ่ม credential ใน public snapshot เพื่อให้เข้าใช้ง่าย public ตั้งใจไม่ต้อง admin

# 17 สิทธิ์ CSRF และ PIN ตั้งห้อง

## ตรวจตามลำดับ

read ป้องกันใช้ auth mutation admin ใช้ auth admin csrf หา session ตรวจ role/ต้องเปลี่ยนรหัส แล้ว x-csrf-token viewer ใช้ control admin ไม่ได้ mustChange ได้ 428 จนเปลี่ยน

CSRF กันคำขอที่ browser login แล้วถูกหลอกส่ง ไม่ใช่เดารหัส SameSite Strict กับ header เฉพาะ session ช่วย โค้ด timingSafeEqual อนาคตควรตรวจ byte length ก่อน ไม่แค่จำนวนตัวอักษร Unicode

## ก่อน login

หน้า login ตั้ง tutel_pre อายุสั้นต้อง echo ใน JSON นับผิดตาม IP ใน Map restart ล้าง replica ไม่แชร์ ไม่ใช่ MFA/audit ถาวร

## PIN คุมอะไร

CALENDAR_SETUP_PIN คุมเลือก/เปลี่ยนห้อง /calendar setup ต้องใช้ web ตรวจเมื่อเปลี่ยน channel ไม่ต้องใช้เพิ่ม event ปกติ ไม่ใช่ admin password หรือ sync secret

Discord add/delete/config เดิมยังไม่มี admin-role policy แยก delete จำกัด guild PIN ไม่ใช่ authorization ทุกคำสั่ง หากต้องการ role ต้องทำฟีเจอร์แยก ไม่ควรอ้างว่าตั้งห้องมี PIN แล้ว calendar ทุกงานป้องกัน

# 18 Express route และความปลอดภัยเว็บ

## ประกอบ server

server สร้าง Express trust loopback ปิด x-powered-by Helmet JSON32KB no-store ลงทะเบียน pages auth events preferences assets sync Discord bot health URL/middleware order รักษาเดิม

ไม่มี session redirect login role ไปหน้าตัวเอง static allowlist ไม่เปิด repo legacy publicEvent คง export แต่ snapshot จริงอยู่ public/snapshot

## CSP กับ proxy

CSP จำกัด script/style/connect same-origin ปิด framing/object เพิ่ม CDN/inline อาจพัง ควรแก้ requirement เฉพาะไม่เปิดทุก directive Tailscale Serve HTTPS proxy local trusted loopback ทำ cookie Secure ถูก

## Status

validation400 session401 role/CSRF403 must-change428 offline บางกรณี 503 sync502 ยัง catches ต่อ route ไม่ใช่ central error layer ครบ unhandled อาจ default Express

health แค่ HTTP ไม่ยืนยัน Discord ready เสียง backup หรือ sync ภาคผนวก API บอก auth/output จริง รวม legacy key เพื่อ compatibility

# 19 หน้าปฏิทิน สี และมือถือ

## หน้าที่ browser

app.js แก้ event login setting control calendar-view วาด month/week/day/agenda preferences theme/filter public calendar.js อ่าน API เป็น classic browser script ไม่ใช่ Node

ทุก view ใช้ occurrence เดือนซ้อนแถบ timed จัด overlap รายการวัน/dialog ให้รายละเอียด admin กดช่อง prefill วัน filter ไม่แก้ storage

## Theme ไม่ใช่สี event

ตาม device default จนเปลี่ยน app.css token control dialog responsive event ฟ้าเริ่มต้นเก็บต่อรายการ embed เป็น guild setting แยก เลือกฟ้าไม่ทำทั้งแอปฟ้า

CSS มี override สะสม refactor จัดและต้นฉบับเดียวแต่ไม่สลับ cascade เพราะอาจพัง mobile/timed หาก redesign ต้องดูทุก view/breakpoint

touch เปลี่ยนช่วง wheel desktop เฉพาะบริเวณที่กำหนด dialog/list ยังเลื่อนได้ web text clip ตามพื้นที่ไม่เปลี่ยน Discord ellipsis search/view/theme ต้องตรงและแตะง่าย preference ผูก origin public/admin อาจเลือก theme ต่าง

# 20 ไฟล์ร่วม manifest และ offline

## ต้นฉบับร่วม

แก้ app.css calendar-view preferences icon app-icon manifest ใน src/web/public assets:sync copy หกไฟล์ไป vercel/netlify root หาจาก URL script สำเนาอยู่ Git เพื่อ deploy แยก

ไม่ copy index calendar.js sw API config เพราะต่าง provider กัน Netlify JSON ทับ Vercel API แก้ generated อย่างเดียว sync หน้าทับ

## ติดตั้งแอป

manifest ตั้งชื่อ icon launch icon.png เต่าเดิม app-icon เพิ่มพื้นหลัง generator ใช้ System.Drawing Windows เป็น maintenance ไม่ใช่ runtime

admin worker cache visual allowlist ไม่ HTML/API login public cache asset/API สำหรับ offline network-first และล้าง cache เก่าตอน activate offline เป็นล่าสุดที่เคยอ่านไม่รับประกันปัจจุบัน

remote worker ต้อง secure context localhost มีข้อยกเว้น install ขึ้นกับ platform/browser ไม่รับประกันทุกครั้ง ไม่ต้องปุ่ม +App ถาวร cache version ช่วย retire ของเก่าแต่ต้องเข้าใจ data/cache ด้วย

# 21 คัดข้อมูลและสร้าง snapshot สาธารณะ

## ข้อมูลภายในกับข้อมูลที่เปิดเผย

event ภายในมีทั้ง guild ผู้สร้าง และการตั้งค่าเตือน แต่ publicEvent ใน calendar/public/snapshot.js เลือกเฉพาะ ID ชื่อ รายละเอียด สถานะทั้งวัน/วันหยุด recurrence วันต้นฉบับ วัน occurrence หมวด และสี บัญชี session การตั้งค่าห้องและประวัติส่งไม่ถูกรวม อย่างไรก็ตาม allowlist นี้เลือก field ไม่ได้เลือกว่ากิจกรรมใดเป็นความลับ กิจกรรม custom ที่ขยายแล้วถูกรวมทั้งหมด

## ช่วงวันและตัวตนของรายการ

buildSnapshot อ่านปีปัจจุบันตาม Bangkok แล้วสร้างช่วงปีก่อน ปีปัจจุบัน และสองปีข้างหน้า ขอบท้ายเป็นวันต้นปีถัดไปแบบ exclusive ระบบใช้ ID ร่วมกับ occurrence timestamp ตัดซ้ำก่อนเรียงตามเวลา ผลลัพธ์ประกอบด้วย timezone from to generatedAt และ events จึงเป็นภาพข้อมูลสี่ปี ไม่ใช่คลังประวัติทุกปี

exportSnapshot เขียน calendar.json ใน PUBLIC_SITE_DIR ถ้าเนื้อหายกเว้น generatedAt เหมือนเดิมจะใช้ไฟล์และเวลาสร้างเดิม ถ้าเปลี่ยนจะเขียนไฟล์ .tmp ก่อน rename เพื่อไม่ให้เห็น JSON ที่เขียนไม่จบใน workflow หนึ่ง process

ไฟล์ staging นี้ไม่ขึ้น Git และไม่ใช่ endpoint ที่ browser Vercel อ่านจริง ผู้ชมอ่าน /api/calendar การปล่อย source กับการอัปเดตข้อมูลจึงเป็นคนละงาน ถ้าจะเพิ่ม field ใหม่ต้องตัดสินว่าเปิดเผยได้หรือไม่ แล้วปรับ projection validator และ frontend ให้ตรงกัน

# 22 ตัวส่งออกและสถานะ retry

## ตัวส่งเริ่มทำงานเมื่อไร

publish.js เริ่มรอบแรกทันทีและตรวจทุกหกสิบวินาที การแก้ event ผ่านเว็บเรียก debounce ห้าวินาทีเพื่อรวมการแก้ติดกัน ส่วนการแก้ผ่าน Discord ใช้รอบตามเวลาเป็น fallback ตัวแปร busy กันรอบซ้อนเฉพาะ process นี้ เมื่อผิดพลาดจะเก็บ error และเพิ่มเวลารอจากสิบห้าวินาทีจนถึงห้านาที

api-sync.js ต้องมี endpoint HTTPS ที่ไม่มี username/password ฝังใน URL และมี CALENDAR_SYNC_SECRET แยก ระบบ hash timezone ช่วงวัน และ events แล้วเทียบกับ hash และ endpoint ที่สำเร็จล่าสุด ถ้าไม่เปลี่ยนจะไม่ POST ส่วน force sync จงใจข้ามเงื่อนไขนี้

## Revision ทำให้ retry ปลอดภัยขึ้นอย่างไร

ข้อมูลใหม่ได้ revision มากกว่าค่าที่สำเร็จหรือ pending และไม่น้อยกว่านาฬิกาปัจจุบันแบบ milliseconds ระบบบันทึก pending hash/revision ก่อนส่ง ถ้าลองเนื้อหาเดิมใหม่จึงใช้ revision เดิม body มี schemaVersion 1 และ generatedAt header เป็น Bearer secret กับ application/json และ timeout สามสิบวินาที

เมื่อสำเร็จจะเก็บ hash endpoint revision เวลา sync และล้าง error ถ้าตัวรับตอบ 409 พร้อม revision ระบบเพิ่ม pending revision เพื่อใช้รอบหน้า ความล้มเหลวไม่ทับ hash ที่เคยสำเร็จ ถ้าไม่ได้ตั้งค่า จะคืน pending ไม่เดา credential

บ้านเป็นฝ่ายเปิด HTTPS ออก จึงไม่ใช้ IP บ้านเป็นตัวตนของการเขียน เมื่อบ้าน offline ผู้ชมยังอ่าน snapshot เดิมและระบบ sync ภายหลัง นี่คือ eventual consistency ไม่ใช่ transaction ฐานข้อมูลร่วมที่เปลี่ยนทันทีทุกฝั่ง

[Technical diagram included in the PDF edition]

ภาพสรุปทางเทคนิควาดจากโค้ดของโปรเจกต์; อ่านคำอธิบายในบทสำหรับข้อจำกัด

# 23 ตัวรับ Vercel schema และแข่งเขียน Blob

## ตัวรับตรวจคำขอ

POST /api/calendar/sync รับ POST เท่านั้น ตรวจว่ามี secret และตั้ง Blob แล้ว เปรียบเทียบ authorization ที่ hash ด้วย timingSafeEqual ต้องเป็น JSON และเนื้อหาที่ serialize ไม่เกินสองล้าน bytes จากนั้น validate และ save การตอบแยกเหตุผล method ผิด ไม่ยืนยันตัว type ผิด ขนาดเกิน ข้อมูลผิด revision เก่า และ storage ขัดข้อง

validateSnapshot ต้อง schemaVersion 1 revision เป็น safe integer บวก timezone Asia/Bangkok generatedAt อ่านเป็นวันที่ได้ และช่วงวันรูปแบบที่กำหนด รับไม่เกิน 10,000 events แต่ละรายการต้อง ID ถูก type ชื่อไม่ว่างและจำกัด รายละเอียดเป็น string วันทั้งต้นฉบับและ occurrence อ่านได้ และ occurrence จบหลังเริ่ม สีและหมวดตรวจรูปแบบ ตัด field ที่ไม่อนุญาตแล้วคำนวณ contentHash ใหม่

ยังไม่ได้ตรวจว่าทุกรายการอยู่ใน from/to หรือทุกหมวดเป็น ID ที่รู้จักทั้งหมด จึงเป็น structural validation ไม่ใช่ semantic validator ครบทุกเงื่อนไข

## ความสัมพันธ์ของ secret กับ Blob

store.js ใช้ calendar/latest.json การเชื่อม server ไป Blob ใช้ BLOB_STORE_ID/OIDC หรือ token ที่ตั้งไว้ ส่วน secret ของบ้านยืนยัน HTTP ไป Vercel ไม่ใช่สิทธิ์เข้าถึง Blob โดยตรง ผู้ชมไม่ได้ทั้งสอง credential

saveSnapshot ปฏิเสธ revision เก่า revision/hash ตรงกันคืน unchanged ถ้า revision เท่ากันแต่ hash ต่างจะ conflict การเขียนทับใช้ ETag กับ ifMatch และลอง race ได้สามครั้ง ครั้งแรกไม่ยอม overwrite ช่วยกันข้อมูลเก่าทับใหม่ แต่ Blob ยังคงเป็น object storage ไม่ใช่ SQL หรือ distributed scheduler

# 24 อ่าน public cache และต้นทุน

## การอ่านสาธารณะ

/api/calendar รองรับ GET และ HEAD server อ่าน private Blob แล้วส่ง JSON ที่คัดเลือกหรือแค่ header ETag ใช้ contentHash หาก If-None-Match ตรงจะคืน 304 ถ้ายังไม่มี snapshot แรกหรือ storage อ่านไม่ได้จะคืน 503 URL private Blob ไม่ใช่ API ของผู้ชม

## ทำไมแก้แล้วไม่ได้เห็นทันที

header กำหนด browser max-age 0, CDN s-maxage 60 และ stale-while-revalidate 60 client ตรวจทุกนาทีและเมื่อกลับแท็บ ส่วน worker เก็บของที่เคยอ่านสำเร็จสำหรับ offline การแก้หนึ่งครั้งผ่าน commit บ้าน debounce upload CDN และรอบ poll ของ browser ความผิดพลาด background tab หรือ backoff ทำให้ช้ากว่านั้นได้ จึงไม่ควรรับประกันเวลาสูงสุดตายตัว

generatedAt คือเวลาสร้าง snapshot lastSync คือเวลาส่งสำเร็จ และเวลาที่ browser อ่านเป็นอีกค่า ถ้าเห็นข้อมูลเก่าให้ตรวจ revision/network/cache ไม่ deploy source ทุกครั้งที่ data sync มีปัญหา

## ประหยัดตรงไหน

การแก้ข้อมูลไม่สร้าง build เว็บแล้ว แต่ function execution, Blob operation, storage และ bandwidth ยังมีต้นทุน hash ที่ไม่เปลี่ยน idempotency CDN และ conditional request ช่วยลดงาน ไม่ทำให้ฟรี และ 304 ยังอาจต้องอ่าน origin

เปอร์เซ็นต์ประหยัดต้องวัดผู้ชม จำนวนแก้ ขนาด snapshot และราคาปัจจุบัน ประโยชน์ชัดคือแยก source deploy จาก data sync ไม่ใช่รับรอง credit ลดจำนวนคงที่

# 25 Environment และเจ้าของ secret

## แบ่งค่าให้ถูกหน้าที่

Discord ใช้ DISCORD_TOKEN CLIENT_ID และ GUILD_ID ส่วนเสียงใช้ YT_DLP_PATH FFMPEG_PATH MUSIC_SEARCH_PREFIX การเปิดเว็บและเก็บข้อมูลใช้ CONTROL_HOST CONTROL_PORT DATABASE_PATH DATA_DIR และบัญชีเริ่มต้น/ตั้งห้องใช้ ADMIN_INITIAL_PASSWORD CALENDAR_SETUP_PIN

public ใช้ PUBLIC_CALENDAR_URL PUBLIC_SITE_DIR PUBLIC_DEPLOY_PROVIDER CALENDAR_SYNC_URL CALENDAR_SYNC_SECRET production ใช้ calendar-api ส่วน VERCEL_TOKEN และ project/team เป็นเครื่องมือ deploy source เดิม ไม่ใช่ data sender Netlify ใช้เฉพาะ provider เดิม Vercel runtime ต้อง sync secret กับ Blob ไม่ต้อง Discord token

## จัดการความลับ

ห้ามใส่ secret ใน frontend HTML manifest public JSON หรือ environment ที่ build เปิดเผย ควรสุ่ม sync secret แยกจากรหัส admin และ PIN เปลี่ยนข้างเดียวจะเกิด 401 ต้องให้ทั้งสอง runtime โหลดค่าเดียวกัน

copy .env.example เฉพาะ clone ใหม่ ไม่เขียนทับ env ที่ตั้งแล้ว path มีช่องว่างใส่ quote ได้ แต่ value ควรเป็น executable ไม่ใช่ command ยาว Windows กับ Linux ใช้ path ต่างกัน relative data อิง working directory

.gitignore กันเผลอเพิ่ม ไม่ได้ลบ secret จากประวัติหรือกัน force add ต้องตรวจ staged ก่อน push และไม่ print production env ทั้งไฟล์เพื่อ debug

# 26 ติดตั้ง local และ workflow พัฒนา

## ติดตั้งใน Windows

ใช้ Node 24 ขึ้นไป npm และ executable yt-dlp ที่เรียกได้ จาก D:/tutel-bot ใช้ npm ci ตาม lockfile ใช้ npm install เมื่อจงใจเปลี่ยน dependency ติดตั้ง yt-dlp แยก ส่วน ffmpeg-static ให้ FFmpeg เว้นแต่ override

ทดลองด้วย DATABASE_PATH และ DATA_DIR แยก ไม่ใช้ token ที่ homeserver รันอยู่ และไม่เปิด write public production npm start เปิด panel และ background service DB ใหม่สร้างไฟล์รหัส private แล้วต้องเปลี่ยนครั้งแรก token ขาดจะ log แต่ panel ยังอยู่ ส่วน guild/channel ต้องมีบอท ready

## Public เป็นอีก package

vercel-public มี package/lock ของตัวเอง npm ci root ไม่ติด Blob ในนั้น ต้องติดตั้งภายใน folder เมื่อใช้ การเปิด index แบบ file:// ไม่สร้าง API ต้อง hosting/server ทำ /api/calendar

## วิธีแก้ในแต่ละรอบ

แก้ต้นฉบับ format sync asset ร่วม ดู diff และปรับเอกสารเมื่อ contract เปลี่ยน format หรือ syntax ผ่านไม่ใช่ acceptance ของเสียงและแจ้งเตือน ไม่ login production เพื่อดูการย่อหน้า

ภาคผนวกคำสั่งบอกที่รันและผลกระทบ ถ้าต้องการเริ่ม DB ว่างให้เลือก test path ใหม่ เก็บ DB เดิมไว้ ไม่ลบเพียงเพื่อให้ติดตั้งง่าย

# 27 ขึ้น homeserver และเข้าผ่าน Tailscale

## ตำแหน่งระบบที่มีอยู่

source กับ env อยู่ /home/doublep/tutel-bot/app DB อยู่ data แยก public staging เก็บ snapshot user service จริงคือ tutelbot.service ส่วน deploy/tutel-hub.service เป็น template ต้องปรับ working directory ให้ตรง

## ลำดับ deploy

backup source และ consistent DB ก่อน ส่ง candidate ไม่รวม env private data node_modules ติดตั้ง lock บน target ตรวจ parse/import หยุด service ใส่ source เริ่มแล้วดู log เก็บ archive เพื่อ rollback อย่า reset DB แก้ import error production omit formatter ได้ แต่ yt-dlp ต้อง service เรียกได้

CONTROL_HOST เลือก interface LAN ให้ในบ้านเข้า loopback ใช้ proxy Tailscale Serve ให้ HTTPS แก่ tailnet device คนทั่วไปไม่ได้สมาชิกอัตโนมัติ ตัวส่งข้อมูลไม่ต้อง port forward ขาเข้า

## DNS ใช้ไม่ได้

ตรวจ Tailscale login connection และ MagicDNS ฝั่งผู้ใช้ก่อนแก้ HTML secure DNS browser อาจรบกวนชื่อ private HTTP LAN กับ HTTPS tailnet ต่าง origin และ session การเข้า admin กับ public เป็นงานคนละส่วน

# 28 GitHub และ release Vercel

## Source กับข้อมูล

GitHub เก็บ source example lock และคู่มือ push ที่ผูกอาจสร้าง build แต่ event write Blob ไม่ใช้ Git การเปลี่ยนโค้ด API ต้อง release ใหม่

local public ชื่อ vercel-public ต้องตั้ง Root Directory ตรง Framework Other install npm ci --omit=dev output . function อยู่ api อย่า deploy repo root เพราะปะปนบอท/admin rename local ไม่เปลี่ยน platform ให้อัตโนมัติ

ignoreCommand ตรวจ [skip vercel] ใน commit เพื่อข้าม build release ปกติไม่ใส่ marker และต้องรักษา env/store connection ขณะเปลี่ยน root

## เข้าใจ Git ทีละขั้น

status/diff ดู add เลือก cached name-only ดูรายการ staged commit บันทึก push ส่ง staging ไม่ใช่ upload ชื่อ commit บอก refactor กับ doc และต้องดู secret/data ก่อน

Repository not found อาจ URL หรือ permission HTTPS ใช้ credential ที่รองรับไม่ใช่ password ธรรมดา ไม่ใส่ token ใน remote push สำเร็จ/READY แปลว่า source ไปถึง ไม่ใช่เสียงหรือข้อมูลล่าสุดผ่านแล้ว

# 29 สำรอง กู้ข้อมูล และ rollback

## สำรองข้อมูลให้ครบ

db:backup ตรวจต้นทางและปลายใหม่ ใช้ VACUUM INTO กับ busy timeout ให้ SQLite สร้าง snapshot สอดคล้อง ไม่ copy main ขณะ WAL เขียน ชื่อ timestamp เหมาะกับไฟล์ env backup แยกเพราะ DB ไม่มี token/executable

## กู้ข้อมูล

หยุด writer ทั้งหมด เก็บ DB และ sidecar ปัจจุบันไป recovery folder แยก วาง backup ที่ DATABASE_PATH ไม่ปน WAL เก่า ตรวจสิทธิ์แล้วเริ่ม ห้ามทับ live

backup เก่าทำ password session config และ delivery ย้อนกลับ deduplication กับ revision บ้าน/public จึงอาจต่าง ต้องตัดสิน force sync ไม่คิดว่า restart แก้ทุก conflict ควรมีสำเนานอกดิสก์บ้าน

## ย้อนโค้ด

หยุด service คืน source/lock เดิม ติดตั้งให้ตรงแล้วเริ่ม additive schema มักย้อนง่ายกว่าทำลาย แต่ future ต้องวางแผน refactor นี้คงความหมายตาราง frontend rollback อาจต้อง cache version ใหม่

สร้าง backup ได้ไม่เท่าทดสอบกู้แล้ว หากวางแผน exercise ให้ใช้ path แยก ไม่เขียนทับ production เพื่อพิสูจน์ไฟล์

# 30 แก้ปัญหาและหลักฐานการทำงาน

## เริ่มจากชั้นที่เสีย

startup ดู Node import dependency สิทธิ์ DB และ bind address HTTP ได้แต่บอท offline ดู token/log คำสั่งไม่ขึ้นดู identity register invite เพลงตอบแต่เงียบดู search yt-dlp exit FFmpeg PCM player permission Opus หายเป็น installation ส่วน Application Control เป็นนโยบาย OS ไม่ควรปิดความปลอดภัยมั่ว

channel ต้องบอท ready/permission admin 401 คือ login 403 อาจ role CSRF PIN 428 ต้องเปลี่ยนรหัส public write 401 secret ไม่ตรง 409 revision 503 config snapshot แรก หรือ storage

stale ให้เทียบข้อมูล admin lastSync/error API revision และ cache browser source deploy ไม่รับประกัน data sync วิทยุต้องจด URL/stderr ไม่ถือ lastcheck เป็นเสียงจริง

## หลักฐานแต่ละอย่างยืนยันแค่ไหน

Ready ยืนยัน Discord login health ยืนยัน HTTP READY ยืนยัน deploy PCM ยืนยันผลิต bytes ไม่ใช่คนได้ยิน end-to-end ต้องฟังและตรวจการส่งจริงเป็นงานแยก

ปิด cookie token Authorization และ env จาก log ที่แชร์ เก็บเวลาและ ID แทน แก้ชั้นที่เสียไม่เปลี่ยนโค้ดไม่เกี่ยว

# 31 ดูแล เพิ่มฟังก์ชัน และข้อจำกัด

## Style และเครื่องมือ

.editorconfig กำหนด UTF-8 LF สองช่อง newline Prettier width 100 semicolon quote trailing comma format เขียน check รายงาน ignore private/generated/lock ชื่อควรบอกหน้าที่ comment บอกเหตุผล

เพิ่ม command ต้อง definition handler permission defer และ register หลัง deploy field ใหม่ต้อง schema save expansion public projection validator UI doc การแก้ฟอร์มอย่างเดียวอาจไม่เก็บค่า route ต้อง auth/role/CSRF/status และไม่ import server ย้อนจนวน

## ข้อจำกัดที่ยังอยู่

คิวกับ timer อยู่ RAM แจ้งเตือน best-effort วันหยุดต้องดูแล วิทยุต้อง feed export เปิดเผย SQLite เครื่องเดียว Discord role ยังไม่ครบ error และ CSRF byte length ปรับได้ CSS รักษาลำดับ asset ต้อง sync ไม่มี CI/browser/audio suite เพิ่มจากการจัดโค้ด

วัด memory process แยก อัปเดต extractor ตั้งใจ ดูแล feed/holiday backup/log ส่วน visibility role migration regression และ alert เป็นข้อแนะนำ ไม่ใช่ฟีเจอร์ที่มีแล้ว เลือกเพิ่มตามความต้องการจริง ไม่เพิ่มซับซ้อนเพื่อดู professional

# ภาคผนวก A ไฟล์และจุดเริ่มอ่านโค้ด

แต่ละรายการบอกหน้าที่และชื่อฟังก์ชันที่ประกาศในไฟล์ ใช้คู่กับบทการทำงาน ไม่ใช่เพียงอ่านชื่อฟังก์ชันแล้วเข้าใจพฤติกรรมทั้งหมด ไฟล์ภาพเป็น asset ไม่ใช่โค้ด และข้อมูล runtime ส่วนตัวไม่ถูกรวบรวม

## .editorconfig

กฎ editor ย่อหน้า encodingnewline

## .env.example

template credential ว่างและตัวอย่าง runtime/media/sync

## .gitignore

กัน credential DB backup snapshot cache

## .prettierignore

ยกเว้น format private/runtime/generated

## .prettierrc.json

กฎ format อัตโนมัติร่วม

## compose.yaml

container จำกัด resource mountdata/staging portloopback

## deploy/tutel-hub.service

template user service ต้องปรับ WorkingDirectory

## Dockerfile

container optional Node FFmpeg Python ytdlp nonroot

## netlify-public/\_headers

กฎ hosting/cache/routing/ยกเว้น uploadprovider

## netlify-public/\_redirects

กฎ hosting/cache/routing/ยกเว้น uploadprovider

## netlify-public/app.css

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

## netlify-public/calendar-view.js

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

จุดอ่าน: escape, parts, key, date, startWeek, monthFirst, monthShift, format, overlaps, color, foreground, time

## netlify-public/calendar.js

clientJSONstatic เดิม ไม่ตัวรับ API

จุดอ่าน: toast, occursOn, showDetails, selectDay, renderList, renderCalendar, changeMonth, loadSnapshot, dateKey, today, validDay, esc

## netlify-public/index.html

asset สนับสนุน public/provider ดูบท hosting/frontend

## netlify-public/manifest.webmanifest

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

## netlify-public/preferences.js

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

จุดอ่าน: theme, persist, hideInstall, deferInstall, showInstall, refresh, safe

## netlify-public/sw.js

cachepublic providerstatic เดิม

## package-lock.json

dependency graph root ตรงสำหรับ npmci

## package.json

คำสั่ง engine dependency runtime/dev root

## scripts/backup-db.js

backup VACUUM INTO ปลายใหม่ private

## scripts/generate-app-icon.ps1

เครื่องมือวาดพื้นหลัง icon เต่าบน Windows

## scripts/sync-public-assets.js

copy6asset ต้นฉบับสู่ provider แยก

## src/auth/accounts.js

สร้างบัญชีที่ขาดค้นผู้ใช้และเปลี่ยนรหัส

จุดอ่าน: initializeAccounts, userByName, changePassword

## src/auth/passwords.js

สร้าง salted scrypt hash และตรวจ timing-safe

จุดอ่าน: decode, encode, hashPassword, verifyPassword

## src/auth/sessions.js

สร้าง hash session ตรวจหมดอายุและลบ

จุดอ่าน: createSession, getSession, deleteSession

## src/bot/runtime.js

คุม client เดียว promise เริ่ม ส่งต่อ interaction และปิด

จุดอ่าน: getDiscordClient, botStatus, startBot, stopBot

## src/calendar/api-sync.js

hash data เปลี่ยน revision และ POST ยืนยันตัว

จุดอ่าน: syncCalendarApi

## src/calendar/categories.js

นิยามหมวดและจำแนกชื่อวันระบบ

จุดอ่าน: eventCategories

## src/calendar/db.js

export เดิมสำหรับ DB/auth/setting

## src/calendar/events.js

ตรวจบันทึก custom รวม holiday และ config guild

จุดอ่าน: listExpandedEvents, saveEvent, deleteEvent, saveGuildConfig, listGuildConfigs

## src/calendar/holidays.js

รวม library วันสำคัญคงที่/คำนวณและจันทรคติ

จุดอ่าน: thaiImportantDays

## src/calendar/holy-days.json

ข้อมูลวันพระล่วงหน้า มีช่วงปีต้องดูแล

## src/calendar/notifications.js

ส่ง embed บันทึก delivery และปุ่มล่าสุด/private

จุดอ่าน: calendarUrl, removeOldCalendarButtons, sendCalendarNotification, handleCalendarButton

## src/calendar/options.js

normalize หมวดเวลา/template/สี และกรอง

จุดอ่าน: normalizeOptions, reminderOptions, saveReminderOptions, shouldNotify, notificationText

## src/calendar/public/archive.js

สร้าง ZIP allowlist CRC32 สำหรับ Netlify เดิม

จุดอ่าน: publicZip, crc32

## src/calendar/public/snapshot.js

คัด field public ขยายสี่ปี export JSON

จุดอ่าน: publicEvent, buildSnapshot, exportSnapshot

## src/calendar/publish.js

ประกอบ export provider debounce retry

จุดอ่าน: publishSnapshot, publicSyncStatus, requestCalendarSync, syncCalendarNow, startCalendarPublisher, syncPrefix, tick

## src/calendar/recurrence.js

แปลงเวลาไทยและขยาย occurrence ยึดวันเดิม

จุดอ่าน: localDateTimeToIso, addLocal, fromLocal, eventOccurrences, formatThai, dateParts

## src/calendar/reminders.js

สร้างเวลาและ tick20 วิไม่ซ้อน

จุดอ่าน: reminderSchedules, runReminderTick, startReminderScheduler, tick

## src/calendar/service.js

export เดิมสำหรับ event recurrence reminder

## src/calendar/setup-pin.js

hash เทียบ PIN จำกัดผิดตาม caller

จุดอ่าน: checkCalendarSetupPin, hash

## src/calendar/vercel-publish.js

adapter deploy เดิม ไม่ใช่ path deploy ตัวรับปัจจุบัน

จุดอ่าน: publishVercel

## src/commands/calendar.js

ทำ setup/add/list/delete/config/test ตาม guild

จุดอ่าน: calendar

## src/commands/definitions.js

นิยามชื่อ subcommand option และขอบเขตค่า

## src/commands/handlers.js

รวมหมวดเป็น facade สำหรับ dispatch

## src/commands/music.js

ค้นเพิ่มเพลงและคุมคิวเล่นสุ่ม

จุดอ่าน: play, randommusic, queue, skip, stop, pause, resume, nowplaying, leave

## src/commands/radio.js

จับคู่สถานีพื้นที่แสดงผลและสลับวิทยุ

จุดอ่าน: radio

## src/commands/shared.js

ตรวจ guild และแสดง duration ร่วม

จุดอ่าน: duration, guildOnly

## src/database/connection.js

สร้าง folder เปิด DatabaseSync เรียก schema

## src/database/schema.js

ตาราง index PRAGMA และเพิ่มคอลัมน์ event

จุดอ่าน: initializeSchema

## src/database/settings.js

อ่าน/upsert ค่า string ตาม setting key

จุดอ่าน: setting, setSetting

## src/deploy-commands.js

ตรวจ credential แล้วส่งนิยาม global หรือ guild

## src/index.js

ประกอบบัญชี scheduler HTTP บอทและสัญญาณปิด

จุดอ่าน: shutdown

## src/music/player.js

คุม state RAM คิว โหมด และ cleanup ต่อ guild

จุดอ่าน: getState, ensureConnection, playNext, enqueue, enableRandomMode, playRadio, getPlayer, pausePlayer, resumePlayer, skip, stop, destroyPlayer

## src/music/radio-directory.js

catalog alias พื้นที่และ query directory มี cache

จุดอ่าน: getRadioDirectory, stationMatchesRegion, stationFrequency, norm

## src/music/stream.js

เปิด yt-dlp/FFmpeg อ่าน metadata สร้าง raw resource

จุดอ่าน: resolveQuery, resolveTrack, resolveRandomTrack, createTrackResource, createRadioResource

## src/web/channels.js

ตรวจส่ง/permission และรายการห้อง

จุดอ่าน: canSendReminders, sendableChannels

## src/web/middleware/security.js

cookie auth admin CSRF ร่วม

จุดอ่าน: cookies, clearCookie, auth, admin, csrf, setSessionCookie

## src/web/public/app.css

CSS ต้นฉบับ theme/layout/component รักษา cascade

## src/web/public/app.html

markup panel calendar dialog setting

## src/web/public/app.js

stateUI admin APIwrapper form setting บอท

จุดอ่าน: esc, api, toast, dayKey, fromIso, startOfWeek, init, forcePasswordChange, wire, showPage, loadEvents, renderCalendar, selectDay, renderEventList, openEvent, bkkInput, editEvent, saveEventForm, deleteCurrentEvent, loadGuilds, loadSettings, loadChannels, saveSettings, loadBot, musicAction, toggleBot, field, occursOn, changeMonth, syncAllDay, showDetails, populateReminderOptions, readReminderOptions, previewNotification, updateChannelPin, syncEventColor, loadPublicSync

## src/web/public/calendar-view.js

navigation view เดือน/เวลา/รายการ gesture/layout

จุดอ่าน: escape, parts, key, date, startWeek, monthFirst, monthShift, format, overlaps, color, foreground, time

## src/web/public/login.html

document login form branding

## src/web/public/login.js

ส่ง credential กับ pre-token ตาม redirect

จุดอ่าน: cookie, loadToken

## src/web/public/manifest.webmanifest

ตัวตนแอป launch และ icon

## src/web/public/preferences.js

theme/filter บันทึก และพฤติกรรม browser/install

จุดอ่าน: theme, persist, hideInstall, deferInstall, showInstall, refresh, safe

## src/web/public/sw.js

cache visual admin network-first ไม่ privateHTML/API

## src/web/routes/assets.js

allowlist asset ไม่เปิด source ทั้งหมด

จุดอ่าน: registerAssetsRoutes

## src/web/routes/authentication.js

จำกัด login session logout เปลี่ยนรหัส

จุดอ่าน: registerAuthenticationRoutes

## src/web/routes/bot.js

status/toggle บอทและคุมเพลง guild

จุดอ่าน: registerBotRoutes

## src/web/routes/calendar-sync.js

สถานะ publisher และ force sync

จุดอ่าน: registerCalendarSyncRoutes

## src/web/routes/discord.js

ค้น guild/channel ตั้งห้อง PIN และส่งทดสอบ

จุดอ่าน: registerDiscordRoutes

## src/web/routes/events.js

อ่าน event login mutation admin นัด sync

จุดอ่าน: registerEventsRoutes

## src/web/routes/health.js

ตอบ liveness HTTP ไม่ login

จุดอ่าน: registerHealthRoutes

## src/web/routes/pages.js

pre-token login redirect role และ entryscript

จุดอ่าน: registerPagesRoutes

## src/web/routes/preferences.js

บันทึก theme/filter user normalize

จุดอ่าน: registerPreferencesRoutes

## src/web/server.js

ประกอบ Express/route และเปิด listen

จุดอ่าน: publicEvent, startControlServer

## vercel-public/.env.example

template ปลอดภัยตั้ง secretserver ไม่เผยแพร่

## vercel-public/.vercelignore

กฎ hosting/cache/routing/ยกเว้น uploadprovider

## vercel-public/api/calendar/sync.js

write ยืนยัน JSON ตรวจ method/type/size/shape

จุดอ่าน: handler, digest

## vercel-public/api/calendar.js

GET/HEAD public ETag304 CDN บน private store

จุดอ่าน: handler

## vercel-public/app.css

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

## vercel-public/calendar-view.js

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

จุดอ่าน: escape, parts, key, date, startWeek, monthFirst, monthShift, format, overlaps, color, foreground, time

## vercel-public/calendar.js

client อ่าน poll detail/day deeplink

จุดอ่าน: toast, occursOn, showDetails, selectDay, renderList, renderCalendar, changeMonth, loadSnapshot, dateKey, today, validDay, esc

## vercel-public/index.html

shell/calendar/dialog public ไม่แก้ admin

## vercel-public/lib/store.js

BlobIO validate hash conditionalrevision

จุดอ่าน: readSnapshot, validateSnapshot, saveSnapshot

## vercel-public/manifest.webmanifest

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

## vercel-public/package-lock.json

lock เวอร์ชันแยกใช้ npmci ใน folder

## vercel-public/package.json

packagepublic แยก ไม่ใช้ rootdependency

## vercel-public/preferences.js

sharedasset สร้างจากต้นฉบับ แก้ src/web/public แล้ว assets:sync

จุดอ่าน: theme, persist, hideInstall, deferInstall, showInstall, refresh, safe

## vercel-public/sw.js

publicnetworkfirst/offline asset/APIcache

## vercel-public/vercel.json

header function rewrite skipcommit

# ภาคผนวก B API ทั้งหมดและสิทธิ์

## POST /api/login

สิทธิ์: no session required

จำกัด login session logout เปลี่ยนรหัส

ตำแหน่ง: src/web/routes/authentication.js

body username/password/csrf ต้องตรง pre-cookie ผิด 401/403 จำกัด 429 สำเร็จ cookie8 ชั่วโมงและคืน role mustChange redirect

## GET /api/session

สิทธิ์: session

จำกัด login session logout เปลี่ยนรหัส

ตำแหน่ง: src/web/routes/authentication.js

คืน user ID/username/role/mustChange และ CSRF ใช้ mutation ถัดไป ไม่เปิดเผย public

## POST /api/logout

สิทธิ์: session + CSRF

จำกัด login session logout เปลี่ยนรหัส

ตำแหน่ง: src/web/routes/authentication.js

ต้อง headerCSRF ลบ session ปัจจุบัน clearcookie คืน ok

## POST /api/password

สิทธิ์: session + CSRF

จำกัด login session logout เปลี่ยนรหัส

ตำแหน่ง: src/web/routes/authentication.js

bodycurrentPassword/newPassword ตรวจเดิมใหม่>=10 ลบ session เก่า คืน CSRF ใหม่ ทั้ง viewer/admin เปลี่ยนของตนได้

## GET /api/bot

สิทธิ์: admin + session

status/toggle บอทและคุมเพลง guild

ตำแหน่ง: src/web/routes/bot.js

คืน status/configured guild music playing paused queuecount voicechannel คิว RAM

## POST /api/bot/toggle

สิทธิ์: admin + session + CSRF

status/toggle บอทและคุมเพลง guild

ตำแหน่ง: src/web/routes/bot.js

bodyenabled เริ่ม/หยุด Discord เก็บ bot_enabled สำเร็จคืน status หยุด player แต่ web/calendar อยู่

## POST /api/control/music

สิทธิ์: admin + session + CSRF

status/toggle บอทและคุมเพลง guild

ตำแหน่ง: src/web/routes/bot.js

bodyguildId/actionpause/resume/skip/stop/leave ไม่มี player404 action/skip ผิด 400 ไม่เพิ่มเพลง

## GET /api/calendar-sync

สิทธิ์: admin + session

สถานะ publisher และ force sync

ตำแหน่ง: src/web/routes/calendar-sync.js

คืน provider configured lastSync error เป็นสถานะ sender ไม่ความใหม่ browser

## POST /api/calendar-sync

สิทธิ์: admin + session + CSRF

สถานะ publisher และ force sync

ตำแหน่ง: src/web/routes/calendar-sync.js

ไม่ต้อง eventbody forcepublisher/export คืน result/status error502 พร้อม status force ส่งข้อมูลเดิมได้

## GET /api/guilds

สิทธิ์: admin + session

ค้น guild/channel ตั้งห้อง PIN และส่งทดสอบ

ตำแหน่ง: src/web/routes/discord.js

botready ไม่งั้น 503 คืน guild config+option หมวด URL และ keynetlify เดิมที่เก็บ statusprovider ปัจจุบัน

## GET /api/guilds/:id/channels

สิทธิ์: admin + session

ค้น guild/channel ตั้งห้อง PIN และส่งทดสอบ

ตำแหน่ง: src/web/routes/discord.js

guild ต้อง cache ค้นห้องส่งได้ ไม่มี 404 โหลด permission เสีย 500

## POST /api/settings/discord

สิทธิ์: admin + session + CSRF

ค้น guild/channel ตั้งห้อง PIN และส่งทดสอบ

ตำแหน่ง: src/web/routes/discord.js

bodyguildId/channelId/defaultReminder/publicCalendarUrl/options secretPin เมื่อเปลี่ยนห้อง ตรวจ ready สมาชิก View/Send เก็บ URLorigin config normalizedoption ผิด 400 PIN403

## POST /api/settings/discord/test

สิทธิ์: admin + session + CSRF

ค้น guild/channel ตั้งห้อง PIN และส่งทดสอบ

ตำแหน่ง: src/web/routes/discord.js

bodyguildId ต้อง channel/ready เลือก event30 วันส่ง embed จริง keytest ไม่ใช่ dryrun

## GET /api/events

สิทธิ์: session

อ่าน event login mutation admin นัด sync

ตำแหน่ง: src/web/routes/events.js

queryfrom/to ช่วงบวก<=400 วัน optionalguild รวม global/guild คืน custom+system ที่ขยายรวม field ฝั่ง admin

## POST /api/events

สิทธิ์: admin + session + CSRF

อ่าน event login mutation admin นัด sync

ตำแหน่ง: src/web/routes/events.js

bodyevent ตามตาราง ตัด ID/secretPin ที่ส่งมา บันทึก userID นัด sync คืน ID ใหม่

## PUT /api/events/:id

สิทธิ์: admin + session + CSRF

อ่าน event login mutation admin นัด sync

ตำแหน่ง: src/web/routes/events.js

pathID ทับ body ใช้ savevalidate เดียว ไม่พบ 400 นัด sync คืน ID admin ไม่มี creatorownership แยก

## DELETE /api/events/:id

สิทธิ์: admin + session + CSRF

อ่าน event login mutation admin นัด sync

ตำแหน่ง: src/web/routes/events.js

admin ลบ event นัด syncok ไม่พบ 404 ไม่ลบข้อความ Discord ที่ส่งแล้ว

## GET /api/health

สิทธิ์: no session required

ตอบ liveness HTTP ไม่ login

ตำแหน่ง: src/web/routes/health.js

คืน oktrue ไม่ login แค่ HTTPliveness

## GET /login

สิทธิ์: no session required

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

ตั้ง tutel_pre ถ้ายังไม่มี อายุ 15 นาที แล้วส่ง login.html ไม่คืนข้อมูลบัญชี

## GET /login.js

สิทธิ์: no session required

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

## GET /app.js

สิทธิ์: no session required

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

## GET /app.css

สิทธิ์: no session required

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

## GET /

สิทธิ์: session determines redirect; anonymous -> login

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

## GET /admin

สิทธิ์: session + matching role (checked inside page handler)

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

## GET /viewer

สิทธิ์: session + matching role (checked inside page handler)

pre-token login redirect role และ entryscript

ตำแหน่ง: src/web/routes/pages.js

## GET /api/preferences

สิทธิ์: session

บันทึก theme/filter user normalize

ตำแหน่ง: src/web/routes/preferences.js

อ่าน preferences:userID parseJSON ผิด/ไม่มีคืน object ว่าง

## PUT /api/preferences

สิทธิ์: session + CSRF

บันทึก theme/filter user normalize

ตำแหน่ง: src/web/routes/preferences.js

bodytheme/filters theme สามค่า filterID หมวดที่รู้จัก เก็บ normalizedJSON คืน ok

## GET / HEAD /api/calendar (Vercel)

อ่าน snapshot public ไม่มี login รองรับ ETag/304 ข้อมูลยังไม่พร้อมหรือ storage เสีย 503

## POST /api/calendar/sync (Vercel)

Bearer CALENDAR_SYNC_SECRET + JSON schemaVersion1 revision timezone generatedAt from to events ขนาด 2MB/10,000events สำเร็จ 200 conflict409 ไม่ยืนยัน 401 method405 type415 ใหญ่ 413 invalid400 storage503

## Event mutation body

Field

Meaning / ความหมาย

title / description

Text bounds 160 / 2000; public when exported.

date / endDate / allDay

All-day dates, inclusive form end converted to exclusive midnight.

startsAt / endsAt

Thai local YYYY-MM-DD HH:mm; timed event inputs.

recurrence

none, daily, weekly, monthly, yearly

reminders / reminderMode

Minute offsets, or standard previous-day/day-of schedules.

guildId / holiday / color

Guild scope, holiday flag, #RRGGBB default #4285f4.

# ภาคผนวก C Environment ครบทุกค่า

## DISCORD_TOKEN

secret ยืนยันบอท เฉพาะ server

## CLIENT_ID

IDapplication ใช้ register

## GUILD_ID

IDserver ทดลอง optional

## YT_DLP_PATH

ชื่อ/path executable ไม่ทั้ง command

## FFMPEG_PATH

overrideoptional ว่างใช้ ffmpeg-static

## MUSIC_SEARCH_PREFIX

provider ค้นชื่อเช่น scsearch1

## CONTROL_HOST

interfacebind เลือก loopback/LAN

## CONTROL_PORT

portHTTP default3000

## DATABASE_PATH

ไฟล์ SQLite จริง relative ตาม cwd

## DATA_DIR

folder รหัสเริ่มต้นไม่ย้าย DB

## ADMIN_INITIAL_PASSWORD

admin ใหม่เท่านั้นว่างสุ่มเดิมไม่เปลี่ยน

## CALENDAR_SETUP_PIN

คุมตั้ง/เปลี่ยนห้องไม่ login/APIsecret

## PUBLIC_CALENDAR_URL

origin deeplinkpublic ไม่ admin

## PUBLIC_SITE_DIR

folderstaging snapshot

## PUBLIC_DEPLOY_PROVIDER

calendar-api ปัจจุบันอื่น legacy

## CALENDAR_SYNC_URL

endpointHTTPS ตัวรับ

## CALENDAR_SYNC_SECRET

secretwrite สุ่มร่วมสอง server ไม่ frontend

## NETLIFY_AUTH_TOKEN

credentialdeploylegacyoptional

## NETLIFY_SITE_ID

IDsitelegacyoptional

## VERCEL_TOKEN

credentialdeploysource ไม่ datasync

## VERCEL_PROJECT_ID

project สำหรับ deploydirect

## VERCEL_PROJECT_NAME

ชื่อ deployadapter

## VERCEL_TEAM_ID

scopeAPIdeploymentteam

## VERCEL_ROOT_DIRECTORY

prefixrootdeployoptional ปัจจุบัน vercel-public

## BLOB_STORE_ID

IDstoreOIDC ฝั่ง serverVercel

## BLOB_READ_WRITE_TOKEN

Blobcredential ทางเลือกไม่เปิดผู้ชม

## NODE_ENV

ค่าระบุ production/development

## NODE_OPTIONS

flagNode เช่น heap ไม่ RAM รวม

# ภาคผนวก D คำสั่งและสถานที่รัน

```text
npm ci
```

root ติดตั้ง dependency ตาม lock

```text
npm start
```

root เริ่ม HTTPscheduler บอท optional

```text
npm run register
```

root ลงคำสั่ง global มี credential

```text
npm run register:guild
```

root คำสั่ง guild ทดลอง

```text
npm run assets:sync
```

rootcopyasset ต้นฉบับสู่ provider

```text
npm run format
```

root เขียน format ไม่ test

```text
npm run format:check
```

root ตรวจ format ไม่เขียน

```text
npm run db:backup
```

rootsnapshotDBprivate ใหม่

```text
npm run db:backup -- ./backups/manual.sqlite
```

backup ปลายใหม่ต้องไม่มี

```text
npm run calendar:export
```

สร้าง snapshot ไม่ deploysource

```text
npm run calendar:publish
```

export แล้ว provider มีผลจริง

```text
npm ci --omit=dev
```

folderpublic หรือ rootproduction ตามงาน

```text
git diff --cached --name-only
```

รายชื่อ staged ไม่ upload

```text
systemctl --user status tutelbot.service
```

homeserver ดู service จริง

```text
journalctl --user -u tutelbot.service -n 100 --no-pager
```

homeserverlog ล่าสุดปิด secret ก่อนแชร์

```text
systemctl --user restart tutelbot.service
```

homeserverrestart กระทบเพลง

# ภาคผนวก E ตารางฐานข้อมูลและคอลัมน์

## users

```text
id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
  must_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## sessions

```text
token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL
```

## events

```text
id INTEGER PRIMARY KEY,
  guild_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  holiday INTEGER NOT NULL DEFAULT 0,
  recurrence TEXT NOT NULL DEFAULT 'none',
  reminders TEXT NOT NULL DEFAULT '[15]',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## guild_config

```text
guild_id TEXT PRIMARY KEY,
  guild_name TEXT NOT NULL DEFAULT '',
  channel_id TEXT,
  default_reminder INTEGER NOT NULL DEFAULT 15,
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok'
```

## reminder_log

```text
event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_at TEXT NOT NULL,
  offset_minutes INTEGER NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id, occurrence_at, offset_minutes)
```

## app_settings

```text
key TEXT PRIMARY KEY,
  value TEXT NOT NULL
```

## calendar_deliveries

```text
id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  occurrence_at TEXT NOT NULL,
  schedule_key TEXT NOT NULL,
  message_id TEXT,
  payload TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id,channel_id,event_key,occurrence_at,schedule_key)
```

## calendar_latest

```text
channel_id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL
```

events เพิ่ม reminder_mode default offsets และ color default #4285f4 ผ่านการตรวจคอลัมน์ก่อน ALTER TABLE ตารางใหม่ยังผ่านขั้นเพิ่มนี้ การแก้ DDL ไม่ใช่การ migrate ข้อมูลเดิมโดยอัตโนมัติ

# ภาคผนวก F ตัวอย่างไล่ข้อมูล

## All-day / ทั้งวัน

admin เลือก 13 ตุลา ประชุม allDay สีฟ้า POST ตรวจ session/admin/CSRF saveEvent เที่ยงคืน UTC จบวันถัดไป debounce export hash upload validate Blob browser หลัง cache/poll เตือน 12 ตุลาเที่ยงและ 13 ตุลา 7 โมงถ้าเปิด custom

## Weekly / รายสัปดาห์

เรียน weekly18:30-19:30 เก็บแถวเดียวไม่ 52 query ขยายทับช่วง ID+at แยกสัปดาห์ลิงก์เลือกครั้ง แก้ rule เปลี่ยน query ภายหลัง

## Concurrent work / งานพร้อมกัน

วิทยุ FFmpeg/player พร้อม Expresssave event async เดินต่อ DB/passwordsync ใช้ Node ชั่วคราว event ไม่เปลี่ยนสถานี togglebot ทำลาย player แต่ web/calendar อยู่

## Failed upload / ส่งไม่สำเร็จ

localcommit อยู่แม้ POSTfail publicrevision เดิม pendingpersist retry เดิมใช้เดิม edit ใหม่ revision ใหม่ ดู error ไม่ revertevent เพราะ public เก่า

# ภาคผนวก G อภิธานศัพท์

## API

ข้อตกลง path method input output ระหว่างโปรแกรม

## HTTP method

GET อ่าน POST สร้าง/สั่ง PUT แก้ DELETE ลบ

## JSON

ข้อความแทน object/array ไม่โค้ดรัน

## DTO / projection

รูปข้อมูลที่เลือกข้ามขอบเขต

## Snapshot

ภาพข้อมูลครบ ณเวลาหนึ่ง

## Revision

เวอร์ชันเรียงลำดับกัน write เก่า

## Content hash

digest ระบุเนื้อหาที่มีความหมาย

## ETag

ตัวระบุ representation สำหรับ HTTP/conditionalwrite

## Idempotency

retry เดิมไม่สร้างผลใหม่ซ้ำ

## Debounce

รอชุดแก้สงบก่อนทำงาน

## Backoff

เพิ่มเวลารอเมื่อ retry ล้ม

## Eventual consistency

สำเนาตรงภายหลังไม่ทันที

## Occurrence

หนึ่งครั้งของกิจกรรมที่อาจซ้ำ

## Exclusive end

ขอบท้ายไม่นับอยู่กิจกรรม

## UTC / ISO

รูป instant มาตรฐานแยก timezone แสดง

## Guild

serverDiscord

## Interaction

event คำสั่ง/ปุ่มจาก Discord

## Ephemeral

response เห็นเฉพาะผู้เรียก

## PCM

sample เสียงไม่บีบอัดจาก FFmpeg

## Opus

codec เสียงใช้ voicepipeline

## Pipe

stream ต่อ outputprocess ไป input อีกตัว

## Session

state ยืนยันชั่วคราว tokenbrowser

## Cookie

ค่าของ browser ผูก origin ส่งกับ request

## CSRF

คำขอไม่ตั้งใจจาก browserlogin กันด้วย proofsession

## Hash / salt

digest ทางเดียว salt สุ่มแยกรหัสเหมือนกัน

## Foreign key

สัมพันธ์ record ที่ DB บังคับ

## WAL

log เขียนก่อน checkpoint เข้า main

## Blob

object/file เก็บไม่ตาราง relational

## OIDC

mechanism ตัวตน runtime ยืนยัน storage

## CDN

ชั้น cache/กระจาย responseedge

## PWA

เว็บใช้ manifest/browser เพื่อติดตั้ง/offline

## Service worker

scriptbackgroundbrowser คุม network/cache

## Facade

interface เดิมเล็ก exportimplementation แยก

## Composition root

จุดเริ่มประกอบ service

# ภาคผนวก H อ้างอิงและการอ่านต่อ

รายละเอียดพฤติกรรมในเล่มอ้างอิง source ใน repository นี้ เอกสารภายนอกต่อไปนี้ใช้ตรวจแนวคิดและข้อกำหนด platform ที่เปลี่ยนได้ ภาพเทคนิควาดเป็นเวกเตอร์จากระบบ ไม่ใช้รูป AI หรือภาพภายนอกที่ไม่ทราบสิทธิ์

SQLite WALhttps://www.sqlite.org/wal.html

SQLite VACUUMhttps://www.sqlite.org/lang_vacuum.html

Node SQLitehttps://nodejs.org/api/sqlite.html

Discord interaction response contracthttps://github.com/discord/discord-api-docs/blob/main/developers/interactions/receiving-and-responding.mdx

discord.js APIhttps://discord.js.org/docs/packages/discord.js/main

Discord voice packagehttps://discord.js.org/docs/packages/voice/main

yt-dlp official projecthttps://github.com/yt-dlp/yt-dlp

FFmpeg documentationhttps://ffmpeg.org/documentation.html

Express documentationhttps://expressjs.com/

Helmet projecthttps://helmetjs.github.io/

Vercel private Blobhttps://vercel.com/docs/vercel-blob/private-storage

Vercel Blob OIDChttps://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication

MDN service workershttps://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

MDN PWA cachinghttps://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching

Tailscale Servehttps://tailscale.com/kb/1242/tailscale-serve

Radio Browser APIhttps://api.radio-browser.info/

date-holidays sourcehttps://github.com/commenthol/date-holidays

Prettier optionshttps://prettier.io/docs/options

หมายเหตุ release: เอกสารอธิบาย source ฉบับนี้ ไม่ใช่รายงานยืนยันเสียงจริงทุกแหล่งหรือความครบทุกวันหยุด ตรวจสถานะ rollout ล่าสุดจากสรุปที่ส่งพร้อมงาน

# ภาคผนวก I คำสั่ง Discord และ option

```text
/play query
```

ชื่อ/URL บังคับอยู่ voice ค้นแล้วคิวไม่รับรองเสียง

```text
/queue
```

แสดงคิว guild ใน RAM

```text
/skip
```

ข้ามเพลงปกติที่ current ไม่มีข้ามไม่ได้

```text
/stop
```

ล้างคิวสุ่มวิทยุหยุดเสียงยังอยู่ห้อง

```text
/pause /resume
```

หยุดชั่วคราว/ต่อ player เดิม

```text
/nowplaying
```

แสดงสถานะเพลง/วิทยุตาม handler

```text
/leave
```

หยุด stream ทำลาย connection/stateguild

```text
/randommusic
```

ต้อง voice สุ่มค้น SoundCloud ต่อเนื่อง

```text
/radio list area
```

พื้นที่ optional แปดกลุ่มตามรายการ

```text
/radio play station area
```

สถานีบังคับชื่อ/คลื่น areaoptional ผลคลุมเครือให้ชื่อชัด

```text
/calendar setup channel pin
```

GuildText/PIN บังคับคง offset เดิม

```text
/calendar add title starts
```

ชื่อ/เวลาไทยบังคับ duration1..10080default60 reminder0..10080guilddefault15 repeat description500

```text
/calendar list
```

30 วันแรกสิบรายการขยาย

```text
/calendar delete id
```

ID บวกบังคับลบ custom ของ guild

```text
/calendar config reminder
```

offset0..10080 บังคับต้องตั้งห้องก่อน

```text
/calendar test
```

ส่งข้อความพร้อมจริงไปห้อง ต่าง adminembedtest

สี event และ all-day ใช้ฟอร์มเว็บ คำสั่ง add Discord ปัจจุบันไม่มี option สี/all-day แม้ฐานข้อมูลรองรับ อย่าเข้าใจว่า frontend ทุกฟังก์ชันมี slash ตรงกัน
