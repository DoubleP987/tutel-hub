# Calendar Feedback inbox / กล่อง Feedback

The main Control Panel has an admin-only **กล่อง Feedback** page for Calendar submissions. It lists unread messages, supports status/category filters and 50-message pagination, displays submission details and attachments, and offers statuses New / In progress / Done. Opening a message marks it read; changing status is a separate action.

หน้า **กล่อง Feedback** ใช้ได้เฉพาะบัญชีแอดมินของ Control Panel หลัก ดูชื่อผู้ส่ง กลุ่ม เวลา ข้อความและรูปแนบได้ กดรูปเพื่อเปิดภาพใหญ่ เปลี่ยนสถานะใหม่ / กำลังดูแล / เสร็จแล้วได้ แอดมินกลุ่มปฏิทินไม่ได้รับสิทธิ์นี้

## Integration

- Requires existing `CALENDAR_SERVICE_URL` and `CALENDAR_CONTROL_SECRET`; no additional key.
- `/api/calendar-admin/feedback` forwards only allowed routes and query keys after main-panel login/admin checks.
- All write requests also require the panel CSRF token.
- Images are retrieved by the server using the control secret and returned as private, uncached WebP responses. Images are not embedded using public Calendar URLs or secrets in query strings.
- `src/web/public/feedback-inbox.js` renders content with DOM text nodes, never user HTML. Preview links stay on the panel's origin.
- `src/integrations/calendar/client.js` has a bounded binary-image response mode; ordinary callers keep JSON behavior.

Calendar owns messages, image processing, storage and upload limits. See the Calendar repository's `docs/FEEDBACK.md` for the complete contract and backup requirements. Updating only this panel does not create the Calendar tables/routes; deploy both components together. Restarting the main panel service currently also restarts the music bot process, so schedule deployment to avoid interrupting music. No Discord command registration is required.

There is no reply conversation, automatic user follow-up, image retention purge or deletion button in this initial inbox. If the Calendar service is unavailable, the page shows an error and retry action.
