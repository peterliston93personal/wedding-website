# Gmail Wedding Email Build and Send

This setup sends professional wedding invites directly from Gmail using Google Apps Script, with unique RSVP links and calendar options.

## Files in this folder

- gmail-mail-merge.gs: Google Apps Script sender code.
- gmail-invite-template.html: standalone HTML version of the invite template.
- wedding-weekend-2026.ics: Apple Calendar and Outlook calendar file.
- Wedding RSVPs - MailMerge Ready.csv: optional seed CSV with mail-merge columns.

## 1. Put this folder on your live website

Your script points to this ICS URL:

https://peterliston93personal.github.io/wedding-website/email/wedding-weekend-2026.ics

To make that work, commit and push the new email folder to your website repository so the ICS file is publicly reachable.

## 2. Prepare the Google Sheet

In your Google Sheet tab used for guests, make sure these columns exist:

- Name
- Email
- Party Size
- Group ID
- RSVP Status
- Attending Count
- Phone
- Dietary Requirements
- Events Attending
- Message
- Timestamp

Optional mail merge columns (script can auto-add):

- RSVP Link
- Google Calendar Link
- ICS Link
- Outlook Link
- Email Sent
- Email Sent At

Only rows with both Name and Email are sent.

## 3. Add the sender script

1. Open your Google Sheet.
2. Extensions > Apps Script.
3. Create a script file named gmail-mail-merge.gs.
4. Paste the contents of email/gmail-mail-merge.gs.
5. Save.

## 4. Configure before sending

Inside sendWeddingInvites() config:

- sheetName: set to your guest tab name (currently Sheet1).
- websiteBaseUrl: your RSVP site URL.
- sendOnePerGroup: true sends only one invite per Group ID (recommended).
- pilotMode: true limits sending to pilot groups/emails only.
- pilotGroupIds: e.g. ['1','3'] for family-first test groups.
- pilotEmails: optional exact email allowlist for pilot sending.
- testMode: set true for testing, false for live send.
- testRecipient: your own email.
- maxPerRun: emails per run (start 10-20).

How `sendOnePerGroup` works:

- If true: only the first emailable row for each Group ID is sent.
- If false: every row with Name + Email is sent.
- Practical tip: put the person you want as the household contact first within each group.

How pilot mode works:

- If `pilotMode` is true, only rows matching `pilotGroupIds` or `pilotEmails` are processed.
- If `pilotMode` is false, all eligible rows are processed.
- Recommended first run for your current data: `pilotMode: true` and `pilotGroupIds: ['1','3']`.

## 5. Test safely

1. Keep testMode as true.
2. Run sendWeddingInvites.
3. Authorize script permissions.
4. Check Gmail inbox for rendering and links.
5. Confirm RSVP button opens personalized link with email query param.
6. Confirm calendar links work:
   - Google Calendar opens event draft.
   - Apple Calendar downloads ICS.
   - Outlook link opens compose event.
7. In test mode, rows are marked as `Test` (not `Yes`) so your real send is not blocked.

## 6. Send for real

1. Set testMode to false.
2. Run sendWeddingInvites.
3. Verify Email Sent and Email Sent At are filled.
4. Run again to continue next batch; sent rows are skipped.

## 7. Important notes

- Gmail daily send limits apply.
- Keep maxPerRun conservative to reduce spam risk.
- If you need a full resend, run resetEmailSentFlags().
- Guests with blank Email will be skipped.

## 8. Suggested subject and sender

- Subject: You are invited: Tara and Peter Wedding Weekend
- Sender name: Tara and Peter Wedding
