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
