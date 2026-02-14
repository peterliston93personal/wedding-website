# Peter & Tara's Wedding Website

Welcome! This is your wedding website with RSVP functionality and Google Sheets integration.

## 🎉 What's Included

- **Beautiful wedding website** matching your design
- **RSVP form** for guests to respond
- **Google Sheets integration** to track responses automatically
- **Fully responsive** - works on phones, tablets, and computers
- **All your content** - ceremony details, schedule, venue info

## 📂 Files in This Folder

- `index.html` - Main website file
- `styles.css` - All the styling and design
- `script.js` - Interactive features and form handling
- `link-generator.html` - **Tool to create personalized RSVP links easily**
- `SAMPLE_GUEST_LIST.csv` - Template for your guest list (import to Google Sheets)
- `Fonts/` - Your Source Serif 4 fonts
- `Links/` - Your SVG graphics (hearts and hands) and background texture

## 🚀 Quick Start - Test Locally

1. **Open the website:**
   - Double-click `index.html` in File Explorer
   - OR Right-click `index.html` → Open with → Browser (Chrome, Edge, Firefox)

2. **That's it!** The website will open in your browser. You can:
   - Navigate through all sections
   - Test the RSVP form (responses will show in console for now)
   - Check how it looks on different screen sizes

## 📊 Setting Up Google Sheets (To Track RSVPs)

### Step 1: Create and Pre-Populate Your Guest List

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Wedding RSVPs"
4. In the first row, add these column headers:
   ```
   Name | Email | Party Size | RSVP Status | Attending Count | Phone | Dietary Requirements | Events Attending | Message | Timestamp
   ```

5. **Add your guests** - Fill in rows with your guest list:
   - **Name**: Full name(s) - e.g., "John & Jane Smith"
   - **Email**: Their email address (must match the link you send them)
   - **Party Size**: Number in their party (e.g., 2 for a couple)
   - Leave other columns empty (they'll be filled when they RSVP)
   
   **Quick Tip:** You can import the `SAMPLE_GUEST_LIST.csv` file:
   - In Google Sheets: File → Import → Upload → Select SAMPLE_GUEST_LIST.csv
   - Replace the sample data with your actual guests

**Example:**
| Name | Email | Party Size | RSVP Status | Attending Count | Phone | Dietary | Events | Message | Timestamp |
|------|-------|------------|-------------|-----------------|-------|---------|---------|---------|-----------|
| John & Jane Smith | john@example.com | 2 | | | | | | | |
| Sarah Connor | sarah@example.com | 1 | | | | | | | |
| Mike & Lisa Brown | mike@example.com | 2 | | | | | | | |

### Step 2: Create Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code
3. Copy and paste this code:

```javascript
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const email = e.parameter.email;
    
    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({
        'found': false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find guest by email
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1].toLowerCase() === email.toLowerCase()) {
        return ContentService.createTextOutput(JSON.stringify({
          'found': true,
          'guest': {
            'name': data[i][0],
            'email': data[i][1],
            'partySize': data[i][2]
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      'found': false
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'found': false,
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Find and update the guest's row
    const sheetData = sheet.getDataRange().getValues();
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][1].toLowerCase() === data.email.toLowerCase()) {
        // Update columns: RSVP Status, Attending Count, Phone, Dietary, Events, Message, Timestamp
        sheet.getRange(i + 1, 4).setValue(data.attending);
        sheet.getRange(i + 1, 5).setValue(data.attendingCount);
        sheet.getRange(i + 1, 6).setValue(data.phone);
        sheet.getRange(i + 1, 7).setValue(data.dietary);
        sheet.getRange(i + 1, 8).setValue(data.events);
        sheet.getRange(i + 1, 9).setValue(data.message);
        sheet.getRange(i + 1, 10).setValue(data.timestamp);
        
        return ContentService.createTextOutput(JSON.stringify({
          'status': 'success'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': 'Guest not found'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (disk icon)
5. Click **Deploy** → **New deployment**
6. Click the gear icon ⚙️ next to "Select type" → Choose **Web app**
7. Configure:
   - Description: "Wedding RSVP Form"
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy**
9. Click **Authorize access** and follow the prompts
10. **Copy the Web App URL** - it will look like:
    `https://script.google.com/macros/s/YOUR_ID_HERE/exec`

### Step 3: Connect to Your Website

1. Open `script.js` in VS Code or Notepad
2. Find this line near the top:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';
   ```
3. Replace `'YOUR_GOOGLE_SCRIPT_URL_HERE'` with your actual URL:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID_HERE/exec';
   ```
4. Save the file

### Step 4: Test It!

1. Open `index.html` in your browser with an email parameter:
   - Example: `file:///C:/Users/tara.power/VSC/TP_WEDDING_WEBSITE_V1_Folder/index.html?email=john@example.com`
   - Or after publishing: `https://yourwebsite.com?email=john@example.com`
2. The form should pre-fill with the guest's name and party size
3. Fill out the RSVP details and submit
4. Check your Google Sheet - the guest's row should be updated!

### Step 5: Create Personalized Email Links

When you send invitations, each guest gets a unique link with their email:

**Format:** `https://yourwebsite.com?email=GUEST_EMAIL`

**Examples:**
- For john@example.com: `https://yourwebsite.com?email=john@example.com`
- For sarah@example.com: `https://yourwebsite.com?email=sarah@example.com`

**Easy Method - Use the Link Generator:**
1. Open `link-generator.html` in your browser
2. Enter your website URL (or leave as "index.html" for testing)
3. Enter each guest's email
4. Click "Generate" and copy the link
5. Click "Open in Browser" to test it immediately!

**Manual Method - Create in Google Sheets:**
1. In your Google Sheet, add a column called "Invite Link"
2. Use this formula in row 2 (assuming email is in column B):
   ```
   ="https://yourwebsite.com?email="&B2
   ```
3. Drag the formula down for all guests
4. Copy the links into your email invitations

**Email Template Example:**
```
Dear John & Jane,

You're invited to Peter & Tara's Wedding!
September 18, 2026 at Dunmore House

Please RSVP using your personal link:
https://yourwebsite.com?email=john@example.com

We can't wait to celebrate with you!

Love,
Peter & Tara
```

### Tracking Your RSVPs

Once guests start responding, your Google Sheet will automatically update:

**Before RSVP:**
| Name | Email | Party Size | RSVP Status | Attending Count | Phone | Dietary | Events | Message | Timestamp |
|------|-------|------------|-------------|-----------------|-------|---------|---------|---------|-----------|
| John & Jane Smith | john@example.com | 2 | | | | | | | |

**After RSVP:**
| Name | Email | Party Size | RSVP Status | Attending Count | Phone | Dietary | Events | Message | Timestamp |
|------|-------|------------|-------------|-----------------|-------|---------|---------|---------|-----------|
| John & Jane Smith | john@example.com | 2 | Yes, I'll be there! | 2 | 555-0123 | Jane is vegetarian | Friday Ceremony & Reception, Saturday Pub & Grub | Can't wait! | 2026-02-15... |

**Tips for Managing Responses:**
- Sort by "RSVP Status" to see who has responded
- Use filters to view only attending guests
- Check "Attending Count" to get your final headcount
- Create a pivot table for event attendance counts
- Add conditional formatting to highlight incomplete responses

## 🌐 Publishing Your Website

Once you're happy with the website, you need to host it online:

### Option 1: GitHub Pages (FREE & Easy)
1. Create a GitHub account (if you don't have one)
2. Create a new repository called "wedding-website"
3. Upload all your files
4. Go to Settings → Pages → Enable GitHub Pages
5. Your website will be live at: `https://yourusername.github.io/wedding-website`

### Option 2: Netlify (FREE & Super Easy)
1. Go to [Netlify](https://www.netlify.com)
2. Sign up for free
3. Drag and drop your entire folder
4. Get a free URL like: `https://peter-tara-wedding.netlify.app`

### Option 3: Buy a Custom Domain
- Purchase a domain like `peterandtara.com` from Namecheap, GoDaddy, etc.
- Use with GitHub Pages or Netlify (both support custom domains)

## 📱 Mobile Friendly

Your website is fully responsive and will look great on:
- iPhones and Android phones
- iPads and tablets
- Desktop computers
- All modern browsers

## ✏️ Making Changes

### Update Content
- Open `index.html` in VS Code or any text editor
- Find the text you want to change and edit it
- Save and refresh your browser to see changes

### Change Colors
- Open `styles.css`
- Look for color codes like `#E8E4DC` (background) or `#1a1a1a` (text)
- Search and replace with your preferred colors

### Add Photos
1. Create an `images` folder
2. Add your photos there
3. In `index.html`, add image tags like:
   ```html
   <img src="images/your-photo.jpg" alt="Description">
   ```

## ❓ Troubleshooting

**RSVP form not sending to Google Sheets?**
- Make sure you've set up the Google Apps Script correctly
- Check that the URL in `script.js` matches your Web App URL
- Ensure the script is deployed with "Anyone" access

**Fonts not showing?**
- Check that the Fonts folder is in the same directory as index.html
- Try refreshing your browser with Ctrl+F5 (hard refresh)

**Website looks different from design?**
- Make sure all files (HTML, CSS, JS) are in the same folder
- Check that the Links folder with SVG files is present
- Try opening in a different browser

**Background texture not showing?**
- The `.psd` file needs to be converted to `.png` or `.jpg`
- Open the PSD in Photoshop or similar
- Export as PNG and update the CSS reference

## 📧 Need Help?

If you need assistance:
1. Check that all files are in the correct locations
2. Open the browser console (F12) to see any error messages
3. Test in a different browser
4. Feel free to ask for help!

## 🎊 Enjoy Your Wedding Website!

Your website is ready to share with guests. They can:
- View all wedding details
- See the weekend schedule
- Find accommodation info
- Submit their RSVP

Congratulations on your upcoming wedding! 🎉💍
