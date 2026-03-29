function sendWeddingInvites() {
  var config = {
    sheetName: 'Sheet1',
    websiteBaseUrl: 'https://peterliston93personal.github.io/wedding-website/',
    inviteImageUrl: 'https://peterliston93personal.github.io/wedding-website/images/Invitation-straight.png',
    googleCalendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Tara+and+Peter+Wedding&details=Ceremony+Friday+3%3A00+PM+%28arrive+by+2%3A30+PM%29+at+Dunmore+House+Hotel.+Followed+by+drinks%2C+dinner+and+dancing.&location=Dunmore+House+Hotel%2C+Clonakilty%2C+Co.+Cork&dates=20260918T140000Z%2F20260918T223000Z',
    icsLink: 'https://peterliston93personal.github.io/wedding-website/email/wedding-weekend-2026.ics',
    outlookLink: 'https://outlook.live.com/calendar/0/action/compose?subject=Tara%20and%20Peter%20Wedding&startdt=2026-09-18T15:00:00%2B01:00&enddt=2026-09-18T23:30:00%2B01:00&location=Dunmore%20House%20Hotel%2C%20Clonakilty%2C%20Co.%20Cork&body=Ceremony%20Friday%203%3A00%20PM%20(arrive%20by%202%3A30%20PM)%20at%20Dunmore%20House%20Hotel.%20Followed%20by%20drinks%2C%20dinner%20and%20dancing.',
    subject: 'You are invited: Tara and Peter Wedding Weekend',
    fromName: 'Tara and Peter Wedding',
    sendOnePerGroup: true,
    pilotMode: true,
    pilotGroupIds: ['1', '2', '3', '4', '5', '6'],
    pilotEmails: [],
    testMode: true,
    testRecipient: 'tara.e.power@gmail.com',
    maxPerRun: 20
  };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(config.sheetName) || ss.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var headers = values[0];
  var idx = mapHeaders_(headers);
  ensureColumns_(sheet, headers, ['RSVP Link', 'Google Calendar Link', 'ICS Link', 'Outlook Link', 'Email Sent', 'Email Sent At']);

  values = sheet.getDataRange().getValues();
  headers = values[0];
  idx = mapHeaders_(headers);

  var pilotGroupSet = toStringSet_(config.pilotGroupIds || []);
  var pilotEmailSet = toLowerSet_(config.pilotEmails || []);

  var sentCount = 0;
  var sentGroups = {};
  for (var i = 1; i < values.length; i++) {
    if (sentCount >= config.maxPerRun) break;

    var row = values[i];
    var name = (row[idx['Name']] || '').toString().trim();
    var email = (row[idx['Email']] || '').toString().trim();
    var groupId = idx['Group ID'] != null ? (row[idx['Group ID']] || '').toString().trim() : '';
    var alreadySent = ((row[idx['Email Sent']] || '').toString().trim().toLowerCase() === 'yes');

    if (!name || !email || alreadySent) continue;

    if (config.pilotMode) {
      var inPilotGroup = !!groupId && !!pilotGroupSet[groupId];
      var inPilotEmails = !!pilotEmailSet[email.toLowerCase()];
      if (!inPilotGroup && !inPilotEmails) continue;
    }

    if (config.sendOnePerGroup && groupId && sentGroups[groupId]) continue;

    var rsvpLink = config.websiteBaseUrl + '?email=' + encodeURIComponent(email);
    var replacements = {
      NAME: name,
      RSVP_LINK: rsvpLink,
      GOOGLE_CALENDAR_LINK: config.googleCalendarLink,
      ICS_LINK: config.icsLink,
      OUTLOOK_LINK: config.outlookLink,
      INVITE_IMAGE_URL: config.inviteImageUrl
    };

    var htmlBody = renderTemplate_(getHtmlTemplate_(), replacements);

    var recipient = config.testMode ? config.testRecipient : email;
    GmailApp.sendEmail(recipient, config.subject, buildPlainText_(replacements), {
      name: config.fromName,
      htmlBody: htmlBody
    });

    sheet.getRange(i + 1, idx['RSVP Link'] + 1).setValue(rsvpLink);
    sheet.getRange(i + 1, idx['Google Calendar Link'] + 1).setValue(config.googleCalendarLink);
    sheet.getRange(i + 1, idx['ICS Link'] + 1).setValue(config.icsLink);
    sheet.getRange(i + 1, idx['Outlook Link'] + 1).setValue(config.outlookLink);

    // In test mode we do not mark rows as fully sent, so a live run is never blocked.
    if (config.testMode) {
      sheet.getRange(i + 1, idx['Email Sent'] + 1).setValue('Test');
      sheet.getRange(i + 1, idx['Email Sent At'] + 1).setValue(new Date().toISOString());
    } else {
      sheet.getRange(i + 1, idx['Email Sent'] + 1).setValue('Yes');
      sheet.getRange(i + 1, idx['Email Sent At'] + 1).setValue(new Date().toISOString());
    }

    if (config.sendOnePerGroup && groupId) {
      sentGroups[groupId] = true;
    }

    sentCount++;
    Utilities.sleep(250);
  }
}

function resetEmailSentFlags() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var idx = mapHeaders_(values[0]);
  if (idx['Email Sent'] == null || idx['Email Sent At'] == null) return;

  for (var i = 1; i < values.length; i++) {
    sheet.getRange(i + 1, idx['Email Sent'] + 1).clearContent();
    sheet.getRange(i + 1, idx['Email Sent At'] + 1).clearContent();
  }
}

function mapHeaders_(headers) {
  var out = {};
  for (var i = 0; i < headers.length; i++) {
    out[String(headers[i]).trim()] = i;
  }
  return out;
}

function toStringSet_(arr) {
  var set = {};
  for (var i = 0; i < arr.length; i++) {
    var key = String(arr[i]).trim();
    if (key) set[key] = true;
  }
  return set;
}

function toLowerSet_(arr) {
  var set = {};
  for (var i = 0; i < arr.length; i++) {
    var key = String(arr[i]).trim().toLowerCase();
    if (key) set[key] = true;
  }
  return set;
}

function ensureColumns_(sheet, headers, requiredColumns) {
  var existing = {};
  for (var i = 0; i < headers.length; i++) {
    existing[String(headers[i]).trim()] = true;
  }

  var appendCount = 0;
  requiredColumns.forEach(function(col) {
    if (!existing[col]) {
      sheet.getRange(1, headers.length + appendCount + 1).setValue(col);
      appendCount++;
    }
  });
}

function renderTemplate_(template, replacements) {
  var output = template;
  Object.keys(replacements).forEach(function(key) {
    var token = '{{' + key + '}}';
    var value = replacements[key] || '';
    output = output.split(token).join(value);
  });
  return output;
}

function buildPlainText_(data) {
  return [
    'Hi ' + data.NAME + ',',
    '',
    'You are invited to Tara and Peter wedding weekend.',
    'Friday 18 September 2026 - Ceremony 3:00 PM (arrive 2:30 PM) at Dunmore House Hotel, Clonakilty, Co. Cork.',
    'Reception to follow after the ceremony.',
    '',
    'RSVP: ' + data.RSVP_LINK,
    'Google Calendar: ' + data.GOOGLE_CALENDAR_LINK,
    'Apple Calendar (ICS): ' + data.ICS_LINK,
    'Outlook: ' + data.OUTLOOK_LINK
  ].join('\n');
}

function getHtmlTemplate_() {
  return '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tara and Peter Wedding Invitation</title></head>' +
    '<body style="margin:0; padding:0; background-color:#f4f1ea;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f1ea;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px; background-color:#ffffff; border:1px solid #e6e0d3;">' +
    '<tr><td align="center" style="padding:24px 24px 8px 24px;"><img src="{{INVITE_IMAGE_URL}}" alt="Tara and Peter wedding invitation" width="572" style="display:block; width:100%; max-width:572px; height:auto; border:0;"></td></tr>' +
    '<tr><td style="padding:8px 24px 0 24px; font-family:Georgia, Times New Roman, serif; color:#1f1f1f; text-align:center;">' +
    '<h1 style="margin:0; font-size:30px; line-height:1.2; font-weight:normal;">Tara and Peter</h1>' +
    '<p style="margin:10px 0 0 0; font-size:16px; line-height:1.6;">We would love to celebrate with you.<br>Please RSVP using your personal link below.</p></td></tr>' +
    '<tr><td style="padding:20px 24px 0 24px; font-family:Arial, Helvetica, sans-serif; color:#2a2a2a;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #eee7d8; border-bottom:1px solid #eee7d8;">' +
    '<tr><td style="padding:14px 0; font-size:14px; line-height:1.6;"><strong>Friday, 18 September 2026</strong><br>Ceremony at 3:00 PM (arrive by 2:30 PM)<br>Dunmore House Hotel, Clonakilty, Co. Cork<br>Reception to follow.</td></tr>' +
    '</table></td></tr>' +
    '<tr><td align="center" style="padding:24px 24px 6px 24px; font-family:Arial, Helvetica, sans-serif;"><a href="{{RSVP_LINK}}" style="display:inline-block; background-color:#1f1f1f; color:#ffffff; text-decoration:none; font-size:14px; letter-spacing:0.4px; padding:12px 28px; border-radius:3px;">RSVP NOW</a></td></tr>' +
    '<tr><td align="center" style="padding:0 24px 18px 24px; font-family:Arial, Helvetica, sans-serif; color:#6a6a6a; font-size:13px;">RSVP deadline: 18 July 2026</td></tr>' +
    '<tr><td align="center" style="padding:0 24px 10px 24px; font-family:Arial, Helvetica, sans-serif; color:#2a2a2a; font-size:14px;">Add to calendar:</td></tr>' +
    '<tr><td align="center" style="padding:0 24px 26px 24px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.8;">' +
    '<a href="{{GOOGLE_CALENDAR_LINK}}" style="color:#0d4e80;">Google Calendar</a>&nbsp;|&nbsp;' +
    '<a href="{{ICS_LINK}}" style="color:#0d4e80;">Apple Calendar (ICS)</a>&nbsp;|&nbsp;' +
    '<a href="{{OUTLOOK_LINK}}" style="color:#0d4e80;">Outlook</a></td></tr>' +
    '<tr><td style="padding:0 24px 24px 24px; font-family:Arial, Helvetica, sans-serif; color:#6a6a6a; font-size:12px; line-height:1.6; text-align:center; border-top:1px solid #eee7d8;">' +
    '<p style="margin:16px 0 0 0;">Hi {{NAME}}, if the RSVP button does not work, copy and paste this link:</p>' +
    '<p style="margin:8px 0 0 0; word-break:break-all;"><a href="{{RSVP_LINK}}" style="color:#0d4e80;">{{RSVP_LINK}}</a></p></td></tr>' +
    '</table></td></tr></table></body></html>';
}
