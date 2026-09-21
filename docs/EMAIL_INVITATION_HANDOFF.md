# Email invitation integration handoff

Status: Paused at user request on 2026-09-21. Resume provider integration in a future session.

## Completed locally
- Web patient invitations now require a valid email instead of a phone number.
- Send, bulk send, and resend use email only; removed the SMS logging placeholder.
- Delivery errors and non-delivery mailers (log/array) no longer report success.
- Failed resends preserve the previous token.
- Updated web instructions and mobile activation instructions to describe email activation.
- Added migration: backend/database/migrations/2026_09_21_000001_make_patient_invitation_phone_nullable.php.
- Added backend/tests/Feature/PatientInvitationEmailTest.php.
- Verification: 5 tests passed (18 assertions); frontend production build passed with a chunk-size warning.
- No live emails sent. No provider configured or production deployment performed.

## Remaining work
1. Confirm email provider choice. Brevo was recommended for its free transactional email allowance (300/day as checked on 2026-09-21).
2. Create/configure the provider account and verify the sender.
3. Implement Brevo HTTPS API delivery with Laravel HTTP client or a supported transport. The current controller uses Laravel Mail and does NOT yet support Brevo API.
4. Keep the API key in backend deployment secrets, never frontend/mobile assets.
5. Add mocked provider success/failure tests; verify recipient and activation-code email content.
6. Configure Railway variables. The local backend/.env.railway currently uses MAIL_MAILER=log, which does not deliver email.
7. Deploy backend/frontend and run the nullable-phone migration against the deployed database.
8. Send a controlled invitation and verify receipt and activation end to end.
9. Rebuild the mobile APK to include updated activation instructions.

## Hosting notes
- Use HTTPS API for Railway plans without SMTP access.
- Railway documentation checked on 2026-09-21 states SMTP is available on Pro and above.
- Receiving email in Gmail does not require sending from a Gmail account.
- Recheck provider limits and hosting restrictions before integration.

References:
- https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan
- https://developers.brevo.com/docs/send-a-transactional-email
- https://docs.railway.com/networking/outbound-networking

## Existing local branding changes
The mobile app display name is ABTCare with the generated 3D paw launcher icon for Android, iOS, and web. Master image: mobile/assets/images/abtcare-app-icon.png. APK rebuild was not performed in this session.