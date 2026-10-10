# Contributing to Tutel music bot / แนวทางส่งงาน

[Developer handbook](docs/DEVELOPMENT.md) · [คู่มือผู้พัฒนา](docs/DEVELOPMENT.th.md)

## Before editing / ก่อนแก้

1. Read the developer guide and the specialist document for the affected feature.
2. Use a development Discord application, test guild and isolated database. Production tokens/Atlas databases are not development fixtures.
3. Start a branch such as `feat/player-setting` or `fix/radio-timeout`.
4. Identify whether command definitions, persisted settings, audio cleanup or the Calendar contract will change.

## Scope and style / ขอบเขตและรูปแบบ

Follow repository Prettier settings. Use explicit ESM .js imports and named functions. Keep command/UI, audio, persistence, cluster and service integration responsibilities separate. Avoid unrelated formatting or dependency upgrades. Do not rename persistent identifiers just to improve appearance.

Keep playback requests cancellable and resource ownership clear. Validate permissions in component handlers as well as slash commands. Preserve the shared player message and the common private-reply expiry behavior.

## Verification / ตรวจงาน

The developer handbook lists existing Node tests and manual Discord checks. Run only the relevant checks when verification is requested and record exactly what ran. Do not call formatting a behavior test. Test command registration changes Discord state: use only the development guild/application.

## Commit and pull request / Commit และ PR

```powershell
git diff
git add docs/DEVELOPMENT.md
git diff --cached --name-only
git diff --cached
git commit -m "docs: improve developer setup"
```

Replace the staged path/message with your actual change. Review the staged content before pushing. A PR description should state the behavior, reason, changed contracts/migrations, checks performed, unchecked limitations and rollback. Cross-link a Calendar PR when changing the integration contract.

## Secrets / ข้อมูลลับ

Never commit .env, database files, private passwords, tunnel/service keys, MongoDB credentials, backups or personal snapshots. Examples use blank secret values. Review code/docs/generated assets and previous commits before a public push; .gitignore cannot remove a secret already committed. If a credential was published, revoke/rotate it through its owner and plan history remediation rather than just hiding the current line.

## Release / ปล่อยงาน

Git push and bot deployment are separate operations. Coordinate active-host election before service restarts. Back up the database, preserve .env/data, record the old revision and follow the rollback instructions. Do not enable the new Calendar worker while unmigrated channels still depend on legacy scheduling.

ภาษาไทย: ส่งเฉพาะงานที่ตั้งใจแก้ แจ้งผลตรวจจริงและข้อจำกัด ห้ามทดลองกับผู้ใช้จริงหรือคัดลอก secret ลง issue/PR งานเปลี่ยน contract ต้องประสานอีก repo และวางแผนย้อนกลับ
