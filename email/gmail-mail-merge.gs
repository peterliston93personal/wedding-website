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
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tara and Peter Wedding Invitation</title></head>',
    '<body style="margin:0; padding:0; background-color:#e8e4dc;">',
    '<div style="display:none; font-size:1px; color:#e8e4dc; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">You\'re invited to Tara and Peter\'s wedding weekend in West Cork. RSVP via your personal link.</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#e8e4dc;">',
    '<tr><td align="center" style="padding:20px 12px 28px 12px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px; background-color:#f6f2ea; border:1px solid #d8d1c4;">',
    '<tr><td style="padding:30px 30px 6px 30px; text-align:center; font-family:Georgia, Times New Roman, serif; color:#1d1b18;">',
    '<p style="margin:0; font-size:58px; line-height:0.95; font-style:italic;">Tara</p>',
    '<p style="margin:4px 0; font-size:38px; line-height:1; font-style:italic;">&amp;</p>',
    '<p style="margin:0; font-size:58px; line-height:0.95; font-style:italic;">Peter</p>',
    '<p style="margin:12px 0 0 0; font-size:12px; line-height:1.3; letter-spacing:2px; text-transform:uppercase; color:#5a544a;">Friday 18th September 2026</p>',
    '<p style="margin:20px auto 0 auto; max-width:430px; font-size:18px; line-height:1.65; color:#2b2722;">We would love to celebrate with you. Please RSVP using your personal link below.</p>',
    '</td></tr>',
    '<tr><td style="padding:24px 30px 0 30px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #dbd3c5; border-bottom:1px solid #dbd3c5;">',
    '<tr><td style="padding:18px 0; border-bottom:1px solid #e4ddcf;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="64" valign="top" style="padding-right:10px;"><img src="{{TIME_ICON_URL}}" width="48" alt="Time" style="display:block; width:48px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:Georgia, Times New Roman, serif; color:#201e1a;">',
    '<p style="margin:0; font-size:12px; line-height:1.2; letter-spacing:1.7px; text-transform:uppercase; color:#5a544a;">The Weekend</p>',
    '<p style="margin:4px 0 0 0; font-size:22px; line-height:1.2;">Friday 18th September</p>',
    '<p style="margin:4px 0 0 0; font-size:16px; line-height:1.4; color:#2f2a24;">Ceremony at 3pm</p>',
    '</td>',
    '<td align="right" valign="middle" style="font-family:Georgia, Times New Roman, serif; font-size:13px; line-height:1.4; padding-left:8px;"><a href="{{GOOGLE_CALENDAR_LINK}}" style="color:#2a2722; text-decoration:underline; white-space:nowrap;">Add to Calendar</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:18px 0; border-bottom:1px solid #e4ddcf;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="64" valign="top" style="padding-right:10px;"><img src="{{LOCATION_ICON_URL}}" width="48" alt="Location" style="display:block; width:48px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:Georgia, Times New Roman, serif; color:#201e1a;">',
    '<p style="margin:0; font-size:12px; line-height:1.2; letter-spacing:1.7px; text-transform:uppercase; color:#5a544a;">Venue</p>',
    '<p style="margin:4px 0 0 0; font-size:22px; line-height:1.2;">Dunmore House Hotel</p>',
    '<p style="margin:4px 0 0 0; font-size:14px; line-height:1.5; color:#5b554b;">Muckross, Dunmore,<br>Clonakilty, Co. Cork<br>P85 HC03</p>',
    '</td>',
    '<td align="right" valign="middle" style="font-family:Georgia, Times New Roman, serif; font-size:13px; line-height:1.4; padding-left:8px;"><a href="https://maps.google.com/?q=Dunmore+House+Hotel+Clonakilty" style="color:#2a2722; text-decoration:underline; white-space:nowrap;">View Location</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:18px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>',
    '<td width="64" valign="top" style="padding-right:10px;"><img src="{{DRESS_ICON_URL}}" width="48" alt="Dress code" style="display:block; width:48px; height:auto; border:0; margin-top:2px;"></td>',
    '<td valign="top" style="font-family:Georgia, Times New Roman, serif; color:#201e1a;">',
    '<p style="margin:0; font-size:12px; line-height:1.2; letter-spacing:1.7px; text-transform:uppercase; color:#5a544a;">Dress Code</p>',
    '<p style="margin:4px 0 0 0; font-size:22px; line-height:1.2;">Black Tie</p>',
    '</td><td>&nbsp;</td>',
    '</tr></table></td></tr>',
    '</table></td></tr>',
    '<tr><td align="center" style="padding:28px 30px 8px 30px; font-family:Georgia, Times New Roman, serif;"><a href="{{RSVP_LINK}}" style="display:inline-block; background-color:#000000; color:#f6f2ea; text-decoration:none; font-size:16px; line-height:1; letter-spacing:1px; padding:13px 34px; border-radius:999px; border:1px solid #000000;">RSVP</a></td></tr>',
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
