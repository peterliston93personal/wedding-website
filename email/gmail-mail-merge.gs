function sendWeddingInvites() {
  var websiteBaseUrl = 'https://peterliston93personal.github.io/wedding-website/';
  var emailBaseUrl = websiteBaseUrl + 'email/';
  var emailAssetsBaseUrl = emailBaseUrl + 'assets/';

  var config = {
    sheetName: 'Sheet1',
    websiteBaseUrl: websiteBaseUrl,
    inviteImageUrl: emailAssetsBaseUrl + 'invitation/Invitation-straight.png',
    timeIconUrl: emailAssetsBaseUrl + 'icons/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Time.png',
    locationIconUrl: emailAssetsBaseUrl + 'icons/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Location.png',
    dressIconUrl: emailAssetsBaseUrl + 'icons/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Black_Tie.png',
    glassesIllustrationUrl: emailAssetsBaseUrl + 'illustrations/TP_WEDDING_WEBSITE_ILLUSTRATIONS_Glasses.png',
    lovebirdsIllustrationUrl: emailAssetsBaseUrl + 'illustrations/TP_WEDDING_WEBSITE_ILLUSTRATIONS_LoveBirds.png',
    googleCalendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Tara+and+Peter+Wedding&details=Ceremony+Friday+3%3A00+PM+%28arrive+by+2%3A30+PM%29+at+Dunmore+House+Hotel.+Followed+by+drinks%2C+dinner+and+dancing.&location=Dunmore+House+Hotel%2C+Clonakilty%2C+Co.+Cork&dates=20260918T140000Z%2F20260918T223000Z',
    icsLink: emailBaseUrl + 'wedding-weekend-2026.ics',
    outlookLink: 'https://outlook.live.com/calendar/0/action/compose?subject=Tara%20and%20Peter%20Wedding&startdt=2026-09-18T15:00:00%2B01:00&enddt=2026-09-18T23:30:00%2B01:00&location=Dunmore%20House%20Hotel%2C%20Clonakilty%2C%20Co.%20Cork&body=Ceremony%20Friday%203%3A00%20PM%20(arrive%20by%202%3A30%20PM)%20at%20Dunmore%20House%20Hotel.%20Followed%20by%20drinks%2C%20dinner%20and%20dancing.',
    subject: 'You are invited: Tara and Peter Wedding Weekend',
    fromName: 'Tara and Peter Wedding',
    sendOnePerGroup: true,
    pilotMode: true,
    // pilotGroupIds: ['1', '2'],
    pilotGroupIds: ['1', '2', '3', '4', '5', '6'],
    
    pilotEmails: [],
    testMode: true,
    // testRecipient: 'peterliston93@gmail.com',
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
      INVITE_IMAGE_URL: config.inviteImageUrl,
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

/**
 * Run this function directly in the Apps Script editor to test that
 * the RSVP write handler is working before testing through the website.
 * Check the execution log (View > Execution log) for the result.
 */
function testRsvpWrite() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: 'updateGroupRSVP',
        timestamp: new Date().toISOString(),
        groupId: '1',
        primaryEmail: 'tara.e.power@gmail.com',
        sharedMessage: 'Test write from Apps Script editor',
        guests: [
          {
            groupId: '1',
            email: 'tara.e.power@gmail.com',
            name: 'Tara Power',
            phone: 'Not provided',
            attending: "Yes, I'll be there!",
            attendingCount: 1,
            dietary: 'None',
            events: 'Friday Ceremony & Reception',
            message: 'Test write from Apps Script editor'
          },
          {
            groupId: '1',
            email: 'peterliston93@gmail.com',
            name: 'Peter Liston',
            phone: 'Not provided',
            attending: "Yes, I'll be there!",
            attendingCount: 1,
            dietary: 'None',
            events: 'Friday Ceremony & Reception',
            message: 'Test write from Apps Script editor'
          }
        ]
      })
    }
  };

  var result = doPost(fakeEvent);
  Logger.log('testRsvpWrite result: ' + result.getContent());
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
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Tara and Peter Wedding Invitation</title>',
    '<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400;1,8..60,600&display=swap" rel="stylesheet">',
    '<!--[if mso]><style>* { font-family: Georgia, serif !important; }</style><![endif]-->',
    '</head>',
    '<body style="margin:0; padding:0; background-color:#E8E4DC;">',
    '<div style="display:none; font-size:1px; color:#E8E4DC; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">You\'re invited to Tara and Peter\'s wedding weekend in West Cork. RSVP via your personal link.</div>',

    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#E8E4DC;">',
    '<tr><td align="center" style="padding:24px 12px 32px 12px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;">',

    // Invitation image header
    '<tr><td style="padding:0; font-size:0; line-height:0;">',
    '<img src="{{INVITE_IMAGE_URL}}" width="620" alt="Tara and Peter — Wedding Invitation" style="display:block; width:100%; height:auto; border:0;">',
    '</td></tr>',

    // WGM strip
    '<tr><td style="background-color:#E8E4DC; padding:11px 0; text-align:center; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#1a1a1a; border-top:1px solid rgba(26,26,26,0.18); border-bottom:1px solid rgba(26,26,26,0.18); overflow:hidden; white-space:nowrap;">',
    'We\u2019re Getting Married \u00a0\u2764\uFE0E\u00a0 We\u2019re Getting Married \u00a0\u2764\uFE0E\u00a0 We\u2019re Getting Married \u00a0\u2764\uFE0E\u00a0 We\u2019re Getting Married',
    '</td></tr>',

    // Names + intro
    '<tr><td style="padding:52px 40px 18px 40px; text-align:center; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; color:#1a1a1a; background-color:#E8E4DC;">',
    '<p style="margin:0; font-size:62px; line-height:0.95; font-style:italic;">Tara</p>',
    '<p style="margin:6px 0; font-size:42px; line-height:1; font-style:italic;">&amp;</p>',
    '<p style="margin:0; font-size:62px; line-height:0.95; font-style:italic;">Peter</p>',
    '<p style="margin:30px auto 0 auto; max-width:430px; font-size:18px; line-height:1.7; color:#2f2c27;">We would love to celebrate with you. Please RSVP using your personal link below.</p>',
    '</td></tr>',

    // Detail rows
    '<tr><td style="padding:32px 40px 0 40px; background-color:#E8E4DC;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid rgba(26,26,26,0.2); border-bottom:1px solid rgba(26,26,26,0.2);">',

    // Time row
    '<tr><td style="padding:22px 0; border-bottom:1px solid rgba(26,26,26,0.1);">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="64" valign="top" style="padding-right:12px;"><img src="{{TIME_ICON_URL}}" width="48" alt="Time" style="display:block; width:48px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; color:#1a1a1a;">',
    '<p style="margin:0; font-size:11px; line-height:1.2; letter-spacing:2.6px; text-transform:uppercase; color:#5a544a; font-weight:600;">The Weekend</p>',
    '<p style="margin:6px 0 0 0; font-size:22px; line-height:1.2;">Friday 18th September</p>',
    '<p style="margin:4px 0 0 0; font-size:15px; line-height:1.5; color:#2f2c27;">Ceremony at 3pm</p>',
    '</td>',
    '<td align="right" valign="middle" style="font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; font-size:13px; line-height:1.4; padding-left:8px;"><a href="{{GOOGLE_CALENDAR_LINK}}" style="color:#1a1a1a; text-decoration:underline; white-space:nowrap;">Add to Calendar</a></td>',
    '</tr></table></td></tr>',

    // Venue row
    '<tr><td style="padding:22px 0; border-bottom:1px solid rgba(26,26,26,0.1);">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="64" valign="top" style="padding-right:12px;"><img src="{{LOCATION_ICON_URL}}" width="48" alt="Location" style="display:block; width:48px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; color:#1a1a1a;">',
    '<p style="margin:0; font-size:11px; line-height:1.2; letter-spacing:2.6px; text-transform:uppercase; color:#5a544a; font-weight:600;">Venue</p>',
    '<p style="margin:6px 0 0 0; font-size:22px; line-height:1.2;">Dunmore House Hotel</p>',
    '<p style="margin:4px 0 0 0; font-size:14px; line-height:1.6; color:#5a544a;">Muckross, Dunmore,<br>Clonakilty, Co. Cork<br>P85 HC03</p>',
    '</td>',
    '<td align="right" valign="middle" style="font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; font-size:13px; line-height:1.4; padding-left:8px;"><a href="https://maps.google.com/?q=Dunmore+House+Hotel+Clonakilty" style="color:#1a1a1a; text-decoration:underline; white-space:nowrap;">View Location</a></td>',
    '</tr></table></td></tr>',

    // Dress code row
    '<tr><td style="padding:22px 0;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="64" valign="top" style="padding-right:12px;"><img src="{{DRESS_ICON_URL}}" width="48" alt="Dress code" style="display:block; width:48px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; color:#1a1a1a;">',
    '<p style="margin:0; font-size:11px; line-height:1.2; letter-spacing:2.6px; text-transform:uppercase; color:#5a544a; font-weight:600;">Dress Code</p>',
    '<p style="margin:6px 0 0 0; font-size:22px; line-height:1.2;">Black Tie</p>',
    '</td><td>&nbsp;</td>',
    '</tr></table></td></tr>',

    '</table></td></tr>',

    // RSVP button
    '<tr><td align="center" style="padding:42px 40px 10px 40px; background-color:#E8E4DC;">',
    '<a href="{{RSVP_LINK}}" style="display:inline-block; background-color:#1a1a1a; color:#E8E4DC; text-decoration:none; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; font-size:15px; line-height:1; letter-spacing:2px; text-transform:uppercase; padding:14px 40px; border-radius:999px;">RSVP</a>',
    '</td></tr>',

    // RSVP deadline
    '<tr><td align="center" style="padding:8px 40px 40px 40px; background-color:#E8E4DC; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; color:#5a544a; font-size:14px; line-height:1.5; font-style:italic;">',
    'Please RSVP by the 18th of July.',
    '</td></tr>',

    // Wave into footer
    '<tr><td style="padding:0; font-size:0; line-height:0; background-color:#E8E4DC;">',
    '<svg xmlns="http://www.w3.org/2000/svg" width="620" height="40" viewBox="0 0 620 40" style="display:block; width:100%; height:auto;"><path d="M0 16 C40 4 78 4 118 16 C158 28 196 28 236 16 C276 4 314 4 354 16 C394 28 432 28 472 16 C512 4 550 4 620 16 L620 40 L0 40 Z" fill="#d3cec6" /></svg>',
    '</td></tr>',

    // Calendar footer
    '<tr><td align="center" style="padding:18px 26px 4px 26px; background-color:#d3cec6; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#3a3630; line-height:1.6;">Calendar Links</td></tr>',
    '<tr><td align="center" style="padding:4px 26px 12px 26px; background-color:#d3cec6; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; font-size:13px; line-height:1.8; color:#3a3630;">',
    '<a href="{{GOOGLE_CALENDAR_LINK}}" style="color:#1a1a1a; text-decoration:underline;">Google</a>&nbsp;|&nbsp;<a href="{{ICS_LINK}}" style="color:#1a1a1a; text-decoration:underline;">Apple (ICS)</a>&nbsp;|&nbsp;<a href="{{OUTLOOK_LINK}}" style="color:#1a1a1a; text-decoration:underline;">Outlook</a>',
    '</td></tr>',
    '<tr><td style="padding:6px 26px 26px 26px; background-color:#d3cec6; font-family:\'Source Serif 4\', Georgia, \'Times New Roman\', serif; color:#5a544a; font-size:12px; line-height:1.7; text-align:center;">',
    '<p style="margin:8px 0 0 0;">If the RSVP button does not work, copy and paste this link:</p>',
    '<p style="margin:8px 0 0 0; word-break:break-all;"><a href="{{RSVP_LINK}}" style="color:#2a2520;">{{RSVP_LINK}}</a></p>',
    '</td></tr>',

    '</table></td></tr></table></body></html>'
  ].join('\n');
}

var RSVP_WEB_APP_SHEET_NAME = 'Sheet1';

function doGet(e) {
  try {
    var sheet = getRsvpSheet_();
    var columns = getRsvpColumnIndexes_(sheet);
    var action = e && e.parameter && e.parameter.action ? e.parameter.action : 'get';

    if (action === 'getGroup') {
      return handleGetGroup_(e, sheet, columns);
    }

    return handleGetGuest_(e, sheet, columns);
  } catch (error) {
    return jsonResponse_({ found: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    var sheet = getRsvpSheet_();
    var columns = getRsvpColumnIndexes_(sheet);
    var payload = parseRequestBody_(e);

    if (!payload || !payload.action) {
      return jsonResponse_({ success: false, error: 'Missing action in request payload.' });
    }

    if (payload.action === 'updateGroupRSVP') {
      return jsonResponse_(updateGroupRSVP_(payload, sheet, columns));
    }

    if (payload.action === 'updateRSVP') {
      return jsonResponse_(updateGuestRSVP_(payload, sheet, columns));
    }

    return jsonResponse_({ success: false, error: 'Unsupported action: ' + payload.action });
  } catch (error) {
    return jsonResponse_({ success: false, error: String(error) });
  }
}

function handleGetGuest_(e, sheet, columns) {
  var email = normalizeEmail_(e && e.parameter ? e.parameter.email : '');
  if (!email) {
    return jsonResponse_({ found: false, error: 'Missing email parameter.' });
  }

  var rows = sheet.getDataRange().getValues();
  for (var index = 1; index < rows.length; index++) {
    if (normalizeEmail_(rows[index][columns.email]) === email) {
      return jsonResponse_({
        found: true,
        guest: buildGuestResponse_(rows[index], columns)
      });
    }
  }

  return jsonResponse_({ found: false });
}

function handleGetGroup_(e, sheet, columns) {
  var email = normalizeEmail_(e && e.parameter ? e.parameter.email : '');
  if (!email) {
    return jsonResponse_({ found: false, error: 'Missing email parameter.' });
  }

  var rows = sheet.getDataRange().getValues();
  var primaryRow = null;

  for (var index = 1; index < rows.length; index++) {
    if (normalizeEmail_(rows[index][columns.email]) === email) {
      primaryRow = rows[index];
      break;
    }
  }

  if (!primaryRow) {
    return jsonResponse_({ found: false });
  }

  var primaryGroupId = columns.groupId > -1 ? normalizeString_(primaryRow[columns.groupId]) : '';
  var group = [];

  if (!primaryGroupId) {
    group.push(buildGuestResponse_(primaryRow, columns));
  } else {
    for (var rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      if (normalizeString_(rows[rowIndex][columns.groupId]) === primaryGroupId) {
        group.push(buildGuestResponse_(rows[rowIndex], columns));
      }
    }
  }

  return jsonResponse_({ found: true, group: group });
}

function updateGroupRSVP_(payload, sheet, columns) {
  var guests = Array.isArray(payload.guests) ? payload.guests : [];
  if (!guests.length) {
    return { success: false, error: 'Grouped RSVP payload did not contain any guests.' };
  }

  var results = [];
  for (var index = 0; index < guests.length; index++) {
    var guestPayload = copyGuestPayload_(guests[index], payload);
    results.push(writeGuestRSVPFromPayload_(guestPayload, sheet, columns));
  }

  return {
    success: results.every(function(result) { return result.updated; }),
    results: results
  };
}

function updateGuestRSVP_(payload, sheet, columns) {
  var result = writeGuestRSVPFromPayload_(payload, sheet, columns);
  return {
    success: result.updated,
    result: result
  };
}

function writeGuestRSVPFromPayload_(payload, sheet, columns) {
  var rows = sheet.getDataRange().getValues();
  var rowNumber = findGuestRowNumber_(rows, columns, payload);

  if (!rowNumber) {
    return {
      updated: false,
      name: normalizeString_(payload.name),
      email: normalizeString_(payload.email),
      groupId: normalizeString_(payload.groupId),
      error: 'Guest row not found.'
    };
  }

  writeGuestValues_(sheet, rowNumber, columns, payload);

  return {
    updated: true,
    rowNumber: rowNumber,
    name: normalizeString_(payload.name),
    email: normalizeString_(payload.email),
    groupId: normalizeString_(payload.groupId)
  };
}

function writeGuestValues_(sheet, rowNumber, columns, payload) {
  var attending = normalizeString_(payload.attending);
  var isAttending = attending === 'Yes, I\'ll be there!';
  var attendingCount = typeof payload.attendingCount === 'number'
    ? payload.attendingCount
    : Number(payload.attendingCount || (isAttending ? 1 : 0));
  var dietary = normalizeString_(payload.dietary);
  var events = Array.isArray(payload.events) ? payload.events.join(', ') : normalizeString_(payload.events);
  var message = normalizeString_(payload.message || payload.sharedMessage);
  var phone = normalizeString_(payload.phone) || 'Not provided';
  var timestamp = normalizeString_(payload.timestamp) || new Date().toISOString();

  if (!dietary) {
    dietary = isAttending ? 'None' : 'Not attending';
  }

  if (!events) {
    events = isAttending ? 'None selected' : 'Not attending';
  }

  if (!message) {
    message = 'No message';
  }

  setCellValueIfPresent_(sheet, rowNumber, columns.rsvpStatus, attending);
  setCellValueIfPresent_(sheet, rowNumber, columns.attendingCount, attendingCount);
  setCellValueIfPresent_(sheet, rowNumber, columns.phone, phone);
  setCellValueIfPresent_(sheet, rowNumber, columns.dietary, dietary);
  setCellValueIfPresent_(sheet, rowNumber, columns.events, events);
  setCellValueIfPresent_(sheet, rowNumber, columns.message, message);
  setCellValueIfPresent_(sheet, rowNumber, columns.timestamp, timestamp);
}

function findGuestRowNumber_(rows, columns, payload) {
  var targetName = normalizeString_(payload.name);
  var targetEmail = normalizeEmail_(payload.email);
  var targetGroupId = normalizeString_(payload.groupId);
  var fallbackRowNumber = 0;

  for (var index = 1; index < rows.length; index++) {
    var row = rows[index];
    var rowName = normalizeString_(row[columns.name]);
    var rowEmail = normalizeEmail_(row[columns.email]);
    var rowGroupId = columns.groupId > -1 ? normalizeString_(row[columns.groupId]) : '';
    var sameGroup = !targetGroupId || rowGroupId === targetGroupId;

    if (targetEmail && rowEmail === targetEmail) {
      if (!targetName || rowName === targetName) {
        return index + 1;
      }

      if (!fallbackRowNumber && sameGroup) {
        fallbackRowNumber = index + 1;
      }
    }

    if (targetName && rowName === targetName) {
      if (sameGroup && (!targetEmail || !rowEmail || rowEmail === targetEmail)) {
        return index + 1;
      }

      if (!fallbackRowNumber && sameGroup) {
        fallbackRowNumber = index + 1;
      }
    }
  }

  return fallbackRowNumber;
}

function buildGuestResponse_(row, columns) {
  return {
    name: row[columns.name],
    email: row[columns.email],
    partySize: columns.partySize > -1 ? row[columns.partySize] : 1,
    groupId: columns.groupId > -1 ? row[columns.groupId] : ''
  };
}

function copyGuestPayload_(guestPayload, parentPayload) {
  var copy = {};
  var key;

  for (key in guestPayload) {
    if (guestPayload.hasOwnProperty(key)) {
      copy[key] = guestPayload[key];
    }
  }

  if (!copy.message) {
    copy.message = parentPayload.sharedMessage || parentPayload.message || '';
  }

  if (!copy.timestamp) {
    copy.timestamp = parentPayload.timestamp || new Date().toISOString();
  }

  if (!copy.groupId && parentPayload.groupId) {
    copy.groupId = parentPayload.groupId;
  }

  return copy;
}

function getRsvpSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(RSVP_WEB_APP_SHEET_NAME) || spreadsheet.getActiveSheet();
}

function getRsvpColumnIndexes_(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var aliases = {
    name: ['Name'],
    email: ['Email'],
    partySize: ['Party Size'],
    groupId: ['Group ID'],
    rsvpStatus: ['RSVP Status'],
    attendingCount: ['Attending Count'],
    phone: ['Phone'],
    dietary: ['Dietary Requirements', 'Dietary'],
    events: ['Events Attending', 'Events'],
    message: ['Message'],
    timestamp: ['Timestamp']
  };
  var columns = {};
  var key;

  for (key in aliases) {
    if (aliases.hasOwnProperty(key)) {
      columns[key] = findHeaderIndex_(headerRow, aliases[key]);
    }
  }

  if (columns.name === -1 || columns.email === -1) {
    throw new Error('The RSVP sheet must contain Name and Email headers.');
  }

  if (columns.rsvpStatus === -1 || columns.attendingCount === -1 || columns.message === -1 || columns.timestamp === -1) {
    throw new Error('The RSVP sheet is missing one or more response columns.');
  }

  return columns;
}

function findHeaderIndex_(headerRow, acceptedNames) {
  for (var index = 0; index < headerRow.length; index++) {
    var headerName = normalizeString_(headerRow[index]);

    for (var aliasIndex = 0; aliasIndex < acceptedNames.length; aliasIndex++) {
      if (headerName === acceptedNames[aliasIndex]) {
        return index;
      }
    }
  }

  return -1;
}

function parseRequestBody_(e) {
  var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(rawBody);
}

function setCellValueIfPresent_(sheet, rowNumber, columnIndex, value) {
  if (columnIndex > -1) {
    sheet.getRange(rowNumber, columnIndex + 1).setValue(value);
  }
}

function normalizeString_(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeEmail_(value) {
  return normalizeString_(value).toLowerCase();
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
