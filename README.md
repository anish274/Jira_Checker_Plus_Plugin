# Jira Checker Plus

A Chrome/Edge browser extension that validates Jira issues and highlights missing or inconsistent information with red flags.

## Features

### Validation Rules

✅ **Description Missing** - Flags when issue description is empty  
✅ **Acceptance Criteria Missing** - For Stories/Tasks without AC  
✅ **Assignee Missing** - When no one is assigned  
✅ **Priority Missing** - When priority is not set  
✅ **Story Points Missing** - For Stories without estimation  
✅ **Time Logged but Status Unchanged** - Time logged but still in To Do/Backlog  
✅ **Parent Not Started** - Subtask in progress but parent still in To Do  

## Installation

### Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `Jira_Checker_Plus_Plugin` folder
5. The extension is now installed!

### Icons (Optional)

Add icon files to the `icons/` folder:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

You can use any red flag or warning icon. If icons are missing, the extension will still work.

## Usage

1. Navigate to any Jira issue page (e.g., `https://yourcompany.atlassian.net/browse/PROJ-123`)
2. The extension automatically validates the issue
3. If validation issues are found:
   - A red panel appears in the top-right corner
   - Missing fields are highlighted with red borders
   - Click the × to close the panel

## Customization

Edit `content.js` to add/modify validation rules in the `VALIDATION_RULES` object and `validateIssue()` function.

## Permissions

- `activeTab` - To read Jira page content
- `storage` - For future settings storage
- `*://*.atlassian.net/*` - To run on Jira Cloud instances

## Compatibility

- Chrome 88+
- Edge 88+
- Jira Cloud (atlassian.net)

## License

MIT
