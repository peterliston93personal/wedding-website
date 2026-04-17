var RSVP_CHANGE_CONTACT_EMAIL = 'taraandpeter2026@gmail.com';

function doGet(e) {
  try {
    var sheet = getRsvpSheet_();
    var columns = getColumnIndexes_(sheet);
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
    var columns = getColumnIndexes_(sheet);
    var payload = parseRequestBody_(e);
    var response;

    if (!payload || !payload.action) {
      return jsonResponse_({ success: false, error: 'Missing action in request payload.' });
    }

    if (payload.action === 'updateGroupRSVP') {
      response = updateGroupRSVP_(payload, sheet, columns);
    } else if (payload.action === 'updateRSVP') {
      response = updateGuestRSVP_(payload, sheet, columns);
    } else {
      return jsonResponse_({ success: false, error: 'Unsupported action: ' + payload.action });
    }

    if (response && response.success) {
      try {
        response.confirmationEmail = sendRsvpConfirmationEmail_(payload, response, sheet, columns);
      } catch (emailError) {
        response.confirmationEmail = {
          sent: false,
          error: String(emailError)
        };
      }
    }

    return jsonResponse_(response);
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

  var rows = sheet.getDataRange().getValues();
  var preparedUpdates = [];
  var results = [];

  for (var index = 0; index < guests.length; index++) {
    var guestPayload = copyGuestPayload_(guests[index], payload);
    var prepared = prepareGuestUpdate_(guestPayload, rows, columns);
    results.push(prepared.result);

    if (!prepared.ok) {
      return {
        success: false,
        locked: prepared.result && prepared.result.locked === true,
        error: prepared.result && prepared.result.error ? prepared.result.error : 'Unable to update RSVP.',
        results: results
      };
    }

    preparedUpdates.push(prepared);
  }

  for (var updateIndex = 0; updateIndex < preparedUpdates.length; updateIndex++) {
    var preparedUpdate = preparedUpdates[updateIndex];
    writeGuestValues_(sheet, preparedUpdate.rowNumber, columns, preparedUpdate.payload);
    results[updateIndex] = preparedUpdate.result;
  }

  return {
    success: true,
    locked: false,
    results: results
  };
}

function updateGuestRSVP_(payload, sheet, columns) {
  var rows = sheet.getDataRange().getValues();
  var prepared = prepareGuestUpdate_(payload, rows, columns);

  if (!prepared.ok) {
    return {
      success: false,
      locked: prepared.result && prepared.result.locked === true,
      error: prepared.result && prepared.result.error ? prepared.result.error : 'Unable to update RSVP.',
      result: prepared.result
    };
  }

  writeGuestValues_(sheet, prepared.rowNumber, columns, prepared.payload);

  return {
    success: true,
    locked: false,
    result: prepared.result
  };
}

function prepareGuestUpdate_(payload, rows, columns) {
  var rowNumber = findGuestRowNumber_(rows, columns, payload);
  var result = {
    updated: false,
    rowNumber: rowNumber,
    name: normalizeString_(payload.name),
    email: normalizeString_(payload.email),
    groupId: normalizeString_(payload.groupId)
  };

  if (!rowNumber) {
    result.error = 'Guest row not found.';
    return {
      ok: false,
      rowNumber: 0,
      payload: payload,
      result: result
    };
  }

  if (isRowLocked_(rows[rowNumber - 1], columns)) {
    result.locked = true;
    result.error = 'This RSVP has already been submitted. If you need to make changes, please email ' + RSVP_CHANGE_CONTACT_EMAIL + '.';
    return {
      ok: false,
      rowNumber: rowNumber,
      payload: payload,
      result: result
    };
  }

  result.updated = true;

  return {
    ok: true,
    rowNumber: rowNumber,
    payload: payload,
    result: result
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
  setCellValueIfPresent_(sheet, rowNumber, columns.dietary, dietary);
  setCellValueIfPresent_(sheet, rowNumber, columns.events, events);
  setCellValueIfPresent_(sheet, rowNumber, columns.message, message);
  setCellValueIfPresent_(sheet, rowNumber, columns.timestamp, timestamp);
  setCellValueIfPresent_(sheet, rowNumber, columns.locked, 'Yes');
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
  var eventsValue = columns.events > -1 ? normalizeString_(row[columns.events]) : '';

  return {
    name: row[columns.name],
    email: row[columns.email],
    partySize: columns.partySize > -1 ? row[columns.partySize] : 1,
    groupId: columns.groupId > -1 ? row[columns.groupId] : '',
    rsvpStatus: columns.rsvpStatus > -1 ? normalizeString_(row[columns.rsvpStatus]) : '',
    attendingCount: columns.attendingCount > -1 ? Number(row[columns.attendingCount] || 0) : 0,
    dietary: columns.dietary > -1 ? normalizeString_(row[columns.dietary]) : '',
    events: parseEvents_(eventsValue),
    message: columns.message > -1 ? normalizeString_(row[columns.message]) : '',
    timestamp: columns.timestamp > -1 ? normalizeString_(row[columns.timestamp]) : '',
    locked: isRowLocked_(row, columns)
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
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

function getColumnIndexes_(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var aliases = {
    name: ['Name'],
    email: ['Email'],
    partySize: ['Party Size'],
    groupId: ['Group ID'],
    rsvpStatus: ['RSVP Status'],
    attendingCount: ['Attending Count'],
    dietary: ['Dietary Requirements', 'Dietary'],
    events: ['Events Attending', 'Events'],
    message: ['Message'],
    timestamp: ['Timestamp'],
    locked: ['RSVP Locked', 'Locked'],
    confirmationSent: ['Confirmation Sent'],
    confirmationSentAt: ['Confirmation Sent At']
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

function isRowLocked_(row, columns) {
  var explicitLockValue = columns.locked > -1 ? normalizeString_(row[columns.locked]).toLowerCase() : '';
  var status = columns.rsvpStatus > -1 ? normalizeString_(row[columns.rsvpStatus]) : '';
  var timestamp = columns.timestamp > -1 ? normalizeString_(row[columns.timestamp]) : '';

  if (explicitLockValue) {
    return ['true', 'yes', 'y', 'locked'].indexOf(explicitLockValue) > -1;
  }

  return Boolean(status && timestamp);
}

function parseEvents_(value) {
  var normalizedValue = normalizeString_(value);

  if (!normalizedValue || normalizedValue === 'Not attending' || normalizedValue === 'None selected') {
    return [];
  }

  return normalizedValue.split(',').map(function(eventName) {
    return normalizeString_(eventName);
  }).filter(function(eventName) {
    return Boolean(eventName);
  });
}

function sendRsvpConfirmationEmail_(payload, response, sheet, columns) {
  var guests = payload.action === 'updateGroupRSVP' ? payload.guests : [payload];
  var recipient = normalizeEmail_(payload.primaryEmail || payload.email || (guests[0] && guests[0].email));
  var hasAnyAttending = guests.some(function(guest) {
    return normalizeString_(guest.attending) === 'Yes, I\'ll be there!';
  });
  var introText = hasAnyAttending
    ? 'Thank you for responding to our wedding invitation. We\'re delighted you can make it.'
    : 'Thank you for responding to our wedding invitation. We\'re sorry you can\'t make it, but we really appreciate you letting us know.';
  var summaryItems = guests.map(function(guest) {
    var guestName = normalizeString_(guest.name) || 'Guest';
    var guestReply = normalizeString_(guest.attending) || 'Response received';
    return '<li style="margin:0 0 6px;">' + escapeHtml_(guestName) + ': ' + escapeHtml_(guestReply) + '</li>';
  }).join('');

  if (!recipient) {
    return {
      sent: false,
      error: 'No email address available for confirmation.'
    };
  }

  GmailApp.sendEmail(
    recipient,
    'RSVP received – Tara & Peter\'s Wedding',
    introText + '\n\nYour RSVP has been received. If you need to make any changes to your RSVP, please email ' + RSVP_CHANGE_CONTACT_EMAIL + '.',
    {
      htmlBody: buildConfirmationEmailHtml_(introText, summaryItems),
      name: 'Tara & Peter'
    }
  );

  markConfirmationEmailSent_(sheet, columns, response);

  return {
    sent: true,
    to: recipient
  };
}

function buildConfirmationEmailHtml_(introText, summaryItems) {
  return '' +
    '<div style="margin:0;padding:24px;background:#f7f2ea;font-family:Georgia,serif;color:#1a1a1a;">' +
      '<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e6ddd1;padding:32px 28px;">' +
        '<p style="margin:0 0 16px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a6f61;">Tara & Peter</p>' +
        '<h2 style="margin:0 0 16px;font-size:28px;font-weight:400;">RSVP received</h2>' +
        '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">' + escapeHtml_(introText) + '</p>' +
        '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your RSVP has been received. If you need to make any changes to your RSVP, please email <a href="mailto:' + RSVP_CHANGE_CONTACT_EMAIL + '" style="color:#1a1a1a;">' + RSVP_CHANGE_CONTACT_EMAIL + '</a>.</p>' +
        '<div style="margin:20px 0 0;padding:16px 18px;background:#faf7f2;border:1px solid #ede3d7;">' +
          '<p style="margin:0 0 10px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#7a6f61;">Your response</p>' +
          '<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6;">' + summaryItems + '</ul>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function markConfirmationEmailSent_(sheet, columns, response) {
  var rowNumbers = [];

  if (response && response.result && response.result.rowNumber) {
    rowNumbers.push(response.result.rowNumber);
  }

  if (response && Array.isArray(response.results)) {
    response.results.forEach(function(result) {
      if (result && result.rowNumber && rowNumbers.indexOf(result.rowNumber) === -1) {
        rowNumbers.push(result.rowNumber);
      }
    });
  }

  rowNumbers.forEach(function(rowNumber) {
    setCellValueIfPresent_(sheet, rowNumber, columns.confirmationSent, 'Yes');
    setCellValueIfPresent_(sheet, rowNumber, columns.confirmationSentAt, new Date().toISOString());
  });
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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