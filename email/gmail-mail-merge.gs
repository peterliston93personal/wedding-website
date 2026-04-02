function sendWeddingInvites() {
  var config = {
    sheetName: 'Sheet1',
    websiteBaseUrl: 'https://peterliston93personal.github.io/wedding-website/',
    inviteImageUrl: 'https://peterliston93personal.github.io/wedding-website/email/Invitation-straight.png',
    envelopeImageUrl: 'https://peterliston93personal.github.io/wedding-website/email/TP_WEDDING_INVITATION_WORKING_OUTSIDE_09.png',
    timeIconUrl: 'https://peterliston93personal.github.io/wedding-website/email/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Time.png',
    locationIconUrl: 'https://peterliston93personal.github.io/wedding-website/email/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Location.png',
    dressIconUrl: 'https://peterliston93personal.github.io/wedding-website/email/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Black_Tie.png',
    glassesIllustrationUrl: 'https://peterliston93personal.github.io/wedding-website/email/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Glasses.png',
    lovebirdsIllustrationUrl: 'https://peterliston93personal.github.io/wedding-website/email/TP_WEDDING_WEBSITE_ILLUSTRATIONS_LoveBirds.png',
    googleCalendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Tara+and+Peter+Wedding&details=Ceremony+Friday+3%3A00+PM+%28arrive+by+2%3A30+PM%29+at+Dunmore+House+Hotel.+Followed+by+drinks%2C+dinner+and+dancing.&location=Dunmore+House+Hotel%2C+Clonakilty%2C+Co.+Cork&dates=20260918T140000Z%2F20260918T223000Z',
    icsLink: 'https://peterliston93personal.github.io/wedding-website/email/wedding-weekend-2026.ics',
    outlookLink: 'https://outlook.live.com/calendar/0/action/compose?subject=Tara%20and%20Peter%20Wedding&startdt=2026-09-18T15:00:00%2B01:00&enddt=2026-09-18T23:30:00%2B01:00&location=Dunmore%20House%20Hotel%2C%20Clonakilty%2C%20Co.%20Cork&body=Ceremony%20Friday%203%3A00%20PM%20(arrive%20by%202%3A30%20PM)%20at%20Dunmore%20House%20Hotel.%20Followed%20by%20drinks%2C%20dinner%20and%20dancing.',
    subject: 'You are invited: Tara and Peter Wedding Weekend',
    fromName: 'Tara and Peter Wedding',
    sendOnePerGroup: true,
    pilotMode: true,
    // pilotGroupIds: ['1', '2'],
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
      ENVELOPE_LINK: rsvpLink,
      GOOGLE_CALENDAR_LINK: config.googleCalendarLink,
      ICS_LINK: config.icsLink,
      OUTLOOK_LINK: config.outlookLink,
      INVITE_IMAGE_URL: config.inviteImageUrl,
      ENVELOPE_IMAGE_URL: config.envelopeImageUrl,
      TIME_ICON_URL: config.timeIconUrl,
      LOCATION_ICON_URL: config.locationIconUrl,
      DRESS_ICON_URL: config.dressIconUrl,
      GLASSES_ILLUSTRATION_URL: config.glassesIllustrationUrl,
      LOVEBIRDS_ILLUSTRATION_URL: config.lovebirdsIllustrationUrl
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
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tara and Peter Wedding Invitation</title></head>',
    '<body style="margin:0; padding:0; background-color:#e8e4dc;">',
    '<div style="display:none; font-size:1px; color:#e8e4dc; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">You\'re invited to Tara and Peter\'s wedding weekend in West Cork. RSVP via your personal link.</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#e8e4dc;">',
    '<tr><td align="center" style="padding:20px 12px 28px 12px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px; background-color:#f6f2ea; border:1px solid #d8d1c4;">',
    '<tr><td style="background-color:#000000; padding:20px 22px; text-align:center;">',
    '<a href="{{ENVELOPE_LINK}}" style="display:block; text-decoration:none;">',
    '<img src="{{ENVELOPE_IMAGE_URL}}" alt="Open your wedding invitation" width="576" style="display:block; width:100%; max-width:576px; height:auto; border:0; margin:0 auto;">',
    '</a>',
    '</td></tr>',
    '<tr><td style="padding:0; border-top:1px solid #dfd7c8; border-bottom:1px solid #dfd7c8;">',
    '<svg xmlns="http://www.w3.org/2000/svg" width="620" height="68" viewBox="0 0 620 68" style="display:block; width:100%; height:auto; background-color:#f6f2ea;">',
    '<path id="bannerCurve" d="M0 22 C52 8 100 8 152 22 C204 36 252 36 304 22 C356 8 404 8 456 22 C508 36 556 36 620 22" fill="none" stroke="none"/>',
    '<path d="M0 22 C52 8 100 8 152 22 C204 36 252 36 304 22 C356 8 404 8 456 22 C508 36 556 36 620 22" fill="none" stroke="#2a2722" stroke-width="1.25"/>',
    '<text font-family="Georgia, Times New Roman, serif" font-size="13" fill="#1f1c18" letter-spacing="0.5" style="text-transform:uppercase;">',
    '<textPath href="#bannerCurve" startOffset="2%">We\'re Getting Married     ♥     We\'re Getting Married     ♥     We\'re Getting Married</textPath>',
    '</text>',
    '</svg>',
    '</td></tr>',
    '<tr><td style="padding:30px 30px 6px 30px; text-align:center; font-family:Georgia, Times New Roman, serif; color:#1d1b18;">',
    '<p style="margin:0 0 6px 0; font-size:12px; line-height:1.3; letter-spacing:2px; text-transform:uppercase; color:#5a544a;">Dunmore House Hotel</p>',
    '<p style="margin:0; font-size:58px; line-height:0.95; font-style:italic;">Tara</p>',
    '<p style="margin:4px 0; font-size:38px; line-height:1; font-style:italic;">&amp;</p>',
    '<p style="margin:0; font-size:58px; line-height:0.95; font-style:italic;">Peter</p>',
    '<p style="margin:12px 0 0 0; font-size:12px; line-height:1.3; letter-spacing:2px; text-transform:uppercase; color:#5a544a;">Friday 18th September 2026</p>',
    '<p style="margin:20px auto 0 auto; max-width:430px; font-size:18px; line-height:1.65; color:#2b2722;">We would love to celebrate with you. Please RSVP using your personal link below and join us for a weekend in West Cork.</p>',
    '</td></tr>',
    '<tr><td align="center" style="padding:18px 30px 10px 30px;"><img src="{{GLASSES_ILLUSTRATION_URL}}" width="92" alt="Weekend celebration illustration" style="display:block; width:92px; max-width:92px; height:auto; border:0; margin:0 auto;"></td></tr>',
    '<tr><td style="padding:4px 30px 0 30px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #dbd3c5; border-bottom:1px solid #dbd3c5;">',
    '<tr><td style="padding:18px 0; border-bottom:1px solid #e4ddcf;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="54" valign="top" style="padding-right:10px;"><img src="{{TIME_ICON_URL}}" width="32" alt="Time" style="display:block; width:32px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:Georgia, Times New Roman, serif; color:#201e1a;">',
    '<p style="margin:0; font-size:12px; line-height:1.2; letter-spacing:1.7px; text-transform:uppercase; color:#5a544a;">The Weekend</p>',
    '<p style="margin:4px 0 0 0; font-size:22px; line-height:1.2;">Friday 18th September</p>',
    '<p style="margin:4px 0 0 0; font-size:16px; line-height:1.4; color:#2f2a24;">Ceremony at 3pm</p>',
    '<p style="margin:2px 0 0 0; font-size:14px; line-height:1.45; color:#5b554b;">Please arrive by 2:30pm. Drinks, dinner and dancing to follow.</p>',
    '</td>',
    '<td align="right" valign="middle" style="font-family:Georgia, Times New Roman, serif; font-size:13px; line-height:1.4; padding-left:8px;"><a href="{{GOOGLE_CALENDAR_LINK}}" style="color:#2a2722; text-decoration:underline; white-space:nowrap;">Add to Calendar</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:18px 0; border-bottom:1px solid #e4ddcf;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="54" valign="top" style="padding-right:10px;"><img src="{{LOCATION_ICON_URL}}" width="32" alt="Location" style="display:block; width:32px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:Georgia, Times New Roman, serif; color:#201e1a;">',
    '<p style="margin:0; font-size:12px; line-height:1.2; letter-spacing:1.7px; text-transform:uppercase; color:#5a544a;">Venue</p>',
    '<p style="margin:4px 0 0 0; font-size:22px; line-height:1.2;">Dunmore House Hotel</p>',
    '<p style="margin:4px 0 0 0; font-size:14px; line-height:1.5; color:#5b554b;">Muckross, Dunmore,<br>Clonakilty, Co. Cork</p>',
    '</td>',
    '<td align="right" valign="middle" style="font-family:Georgia, Times New Roman, serif; font-size:13px; line-height:1.4; padding-left:8px;"><a href="https://maps.google.com/?q=Dunmore+House+Hotel+Clonakilty" style="color:#2a2722; text-decoration:underline; white-space:nowrap;">View Location</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:18px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="54" valign="top" style="padding-right:10px;"><img src="{{DRESS_ICON_URL}}" width="32" alt="Dress code" style="display:block; width:32px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:Georgia, Times New Roman, serif; color:#201e1a;">',
    '<p style="margin:0; font-size:12px; line-height:1.2; letter-spacing:1.7px; text-transform:uppercase; color:#5a544a;">Dress Code</p>',
    '<p style="margin:4px 0 0 0; font-size:22px; line-height:1.2;">Black Tie Requested</p>',
    '<p style="margin:4px 0 0 0; font-size:14px; line-height:1.5; color:#5b554b;">An elegant evening, in keeping with the weekend.</p>',
    '</td><td>&nbsp;</td>',
    '</tr></table></td></tr>',
    '</table></td></tr>',
    '<tr><td align="center" style="padding:22px 30px 8px 30px;"><img src="{{LOVEBIRDS_ILLUSTRATION_URL}}" width="120" alt="Love birds illustration" style="display:block; width:120px; max-width:120px; height:auto; border:0; margin:0 auto;"></td></tr>',
    '<tr><td align="center" style="padding:0 30px 4px 30px; font-family:Georgia, Times New Roman, serif; color:#1d1b18;">',
    '<p style="margin:0; font-size:34px; line-height:1.05; font-style:italic;">RSVP</p>',
    '<p style="margin:10px auto 0 auto; max-width:420px; font-size:16px; line-height:1.65; color:#403a31;">Hi {{NAME}}, we have included your personal RSVP link below so your reply is quick and easy.</p>',
    '</td></tr>',
    '<tr><td align="center" style="padding:20px 30px 8px 30px; font-family:Georgia, Times New Roman, serif;"><a href="{{RSVP_LINK}}" style="display:inline-block; background-color:#000000; color:#f6f2ea; text-decoration:none; font-size:16px; line-height:1; letter-spacing:1px; padding:13px 34px; border-radius:999px; border:1px solid #000000;">RSVP</a></td></tr>',
    '<tr><td align="center" style="padding:0 30px 24px 30px; font-family:Georgia, Times New Roman, serif; color:#3f3a31; font-size:14px; line-height:1.5;">Please RSVP by the 18th of July.</td></tr>',
    '<tr><td style="padding:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:0; line-height:0;"><svg xmlns="http://www.w3.org/2000/svg" width="620" height="42" viewBox="0 0 620 42" style="display:block; width:100%; height:auto; background-color:#f6f2ea;"><path d="M0 18 C40 6 78 6 118 18 C158 30 196 30 236 18 C276 6 314 6 354 18 C394 30 432 30 472 18 C512 6 550 6 620 18 L620 42 L0 42 Z" fill="#ffffff" /></svg></td></tr></table></td></tr>',
    '<tr><td align="center" style="padding:18px 26px 6px 26px; background-color:#ffffff; font-family:Georgia, Times New Roman, serif; font-size:13px; line-height:1.8; color:#302d27; border-top:1px solid #ebe4d9;">',
    '<p style="margin:0; text-transform:uppercase; letter-spacing:1.3px; font-size:11px; color:#6b6458;">Calendar Links</p>',
    '<p style="margin:6px 0 0 0;"><a href="{{GOOGLE_CALENDAR_LINK}}" style="color:#2f2a22; text-decoration:underline;">Google</a>&nbsp;|&nbsp;<a href="{{ICS_LINK}}" style="color:#2f2a22; text-decoration:underline;">Apple (ICS)</a>&nbsp;|&nbsp;<a href="{{OUTLOOK_LINK}}" style="color:#2f2a22; text-decoration:underline;">Outlook</a></p>',
    '</td></tr>',
    '<tr><td style="padding:0 26px 26px 26px; background-color:#ffffff; font-family:Georgia, Times New Roman, serif; color:#5a544a; font-size:12px; line-height:1.7; text-align:center; border-top:1px solid #ebe4d9;">',
    '<p style="margin:14px 0 0 0;">If the RSVP button does not work, copy and paste this link:</p>',
    '<p style="margin:8px 0 0 0; word-break:break-all;"><a href="{{RSVP_LINK}}" style="color:#2f2a22;">{{RSVP_LINK}}</a></p>',
    '</td></tr>',
    '</table></td></tr></table></body></html>'
  ].join('');
}
