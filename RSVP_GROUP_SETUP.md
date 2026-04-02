# Group-Based RSVP Setup Guide

## Overview

The RSVP system has been updated to support **group RSVPs**. One email link can now RSVP multiple people (e.g., a couple) individually, with each person's response updating their own row in the Google Sheet.

## How It Works

1. **Tara** (primary contact) receives an email with her personalized link
2. She opens the link and sees radio buttons: "RSVP as Tara Power" and "RSVP as Peter Liston"
3. She selects "Tara" and completes her RSVP form
4. She submits — Tara's row updates in the sheet
5. The form resets and she sees the radio buttons again
6. She selects "Peter" and completes his RSVP
7. She submits — Peter's row updates in the sheet
8. Done!

## CSV Structure

Your guest list CSV now includes a **Group ID** column:

```
Name,Email,Party Size,Group ID,RSVP Status,Attending Count,Phone,Dietary Requirements,Events Attending,Message,Timestamp
Tara Power,tara.e.power@gmail.com,1,1,...
Peter Liston,peterliston93@gmail.com,2,1,...
Eimear Moroney,EimearMoroney726@gmail.com,1,2,...
```

**Group ID 1** = Tara + Peter (same group)
**Group ID 2** = Eimear (solo guest)

## Google Sheets Setup

### Step 1: Add the Group ID Column

In your existing "Wedding RSVPs" sheet, insert a new column after "Party Size":

1. Right-click on column D (next to Party Size)
2. Select "Insert 1 left"
3. Name the header "Group ID"
4. Fill in Group IDs for each guest:
   - Couples/groups: same ID (e.g., 1, 1)
   - Solo guests: unique ID each (e.g., 2, 3, 4...)

### Step 2: Update Google Apps Script

You need to update the Google Apps Script code to handle:
1. Fetching a guest's group ID when given their email
2. Returning all members of that group
3. Updating individual guest rows (by name + email)

**Here's the updated Apps Script code:**

```javascript
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const action = e.parameter.action || 'get';
  
  if (action === 'getGroup') {
    return doGetGroup(e, sheet);
  } else {
    return doGetGuest(e, sheet);
  }
}

function doGetGuest(e, sheet) {
  const email = e.parameter.email;
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toLowerCase() === email.toLowerCase()) {
      // Return guest data - adjust column indices based on your sheet structure
      // Expected: Name, Email, Party Size, Group ID, RSVP Status, Attending Count, Phone, Dietary, Events, Message, Timestamp
      const guest = {
        name: data[i][0],
        email: data[i][1],
        partySize: data[i][2],
        groupId: data[i][3]
      };
      return ContentService.createTextOutput(JSON.stringify({
        found: true,
        guest: guest
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    found: false
  })).setMimeType(ContentService.MimeType.JSON);
}

function doGetGroup(e, sheet) {
  const email = e.parameter.email;
  const data = sheet.getDataRange().getValues();
  let groupId = null;
  
  // Find the guest and their group ID
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toLowerCase() === email.toLowerCase()) {
      groupId = data[i][3];
      break;
    }
  }
  
  if (!groupId) {
    return ContentService.createTextOutput(JSON.stringify({
      found: false
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Return all guests in this group
  const group = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === groupId) {
      group.push({
        name: data[i][0],
        email: data[i][1]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    found: true,
    group: group
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (payload.action === 'updateRSVP') {
    updateGuestRSVP(payload, sheet);
  }
  
  return ContentService.createTextOutput('OK');
}

function updateGuestRSVP(data, sheet) {
  const sheetData = sheet.getDataRange().getValues();
  
  // Find the row matching both name AND email (to identify the individual)
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === data.name && sheetData[i][1].toLowerCase() === data.email.toLowerCase()) {
      // Update columns: RSVP Status (col 4), Attending Count (col 5), Phone (col 6), Dietary (col 7), Events (col 8), Message (col 9), Timestamp (col 10)
      // Column indices: 0=Name, 1=Email, 2=Party Size, 3=Group ID, 4=RSVP Status, 5=Attending Count, 6=Phone, 7=Dietary, 8=Events, 9=Message, 10=Timestamp
      sheet.getRange(i + 1, 5).setValue(data.attending);          // RSVP Status
      sheet.getRange(i + 1, 6).setValue(data.attendingCount);     // Attending Count
      sheet.getRange(i + 1, 7).setValue(data.phone);              // Phone
      sheet.getRange(i + 1, 8).setValue(data.dietary);            // Dietary
      sheet.getRange(i + 1, 9).setValue(data.events);             // Events
      sheet.getRange(i + 1, 10).setValue(data.message);           // Message
      sheet.getRange(i + 1, 11).setValue(data.timestamp);         // Timestamp
      break;
    }
  }
}
```

### Step 3: Deploy the Script

1. In Google Apps Script editor:
   - Click **Deploy** → **New Deployment**
   - Select **Web App**
   - Execute as: Your account
   - Allow access to: Anyone
   - Click **Deploy**
2. Copy the new **Deployment URL**
3. Update [script.js](/script.js) line 145 with your new URL:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec';
   ```

## Testing

1. Open Tara's personalized link: `index.html?email=tara.e.power@gmail.com`
2. You should see:
   - "Select who you'd like to RSVP for?" with radio buttons for Tara and Peter
   - Form prefilled with Tara's name/email
3. Fill out Tara's RSVP and submit
4. Form should reset and show radio buttons again
5. Select Peter and fill his RSVP
6. Submit — both rows in your Google Sheet should be updated individually

## Column Reference

Your Google Sheet should have columns in this order:

| Index | Name | Expected Header |
|-------|------|-----------------|
| 0 | Name | Name |
| 1 | Email | Email |
| 2 | Party Size | Party Size |
| 3 | Group ID | **Group ID (NEW)** |
| 4 | RSVP Status | RSVP Status |
| 5 | Attending Count | Attending Count |
| 6 | Phone | Phone |
| 7 | Dietary | Dietary Requirements |
| 8 | Events | Events Attending |
| 9 | Message | Message |
| 10 | Timestamp | Timestamp |

If your columns are in a different order, adjust the column indices in the Apps Script accordingly.

## Troubleshooting

- **"Guest not found" error**: Check that the email in the link matches exactly in your Google Sheet (case-insensitive)
- **Only showing one person**: Guest's group has only 1 member, so radio selector won't show
- **Data not updating in sheet**: Verify the Apps Script deployment and that you've updated the GOOGLE_SCRIPT_URL in script.js

## Summary of Changes

✅ **Website changes** (Already done):
- Group selector UI added to form
- Form now handles multiple group members
- Individual RSVP submission for each person

📋 **Your tasks**:
1. Add "Group ID" column to your Google Sheet
2. Assign Group IDs to link guests together
3. Update the Google Apps Script with the new code above
4. Deploy the script and update the URL in script.js
5. Test with your guest list
