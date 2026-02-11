# Jira Checker Plus

A Chrome/Edge browser extension that validates Jira issues and highlights missing or inconsistent information with red flags.

## Features

### Validation Rules

✅ **Description Missing** - Mandatory for Story and Bug (configurable for Sub-task, Epic, Task)  
✅ **Assignee Missing** - Mandatory for all except Epic (configurable for Epic)  
✅ **Priority Missing** - Mandatory for all except Epic (configurable for Epic)  
✅ **Financial Category Missing** - For Story, Task, Bug, Sub-task  
✅ **Story Points Missing** - For Stories without estimation  
✅ **Original Estimate Missing** - For Sub-tasks  
✅ **Time Logged in Epic/Story** - Only allowed in Sub-tasks and Bugs  
✅ **Time Logged but Status in To Do** - Time logged but still in To Do/Backlog  
✅ **Sub-task 100% Logged** - Sub-task fully logged but still open  

## Installation

### Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `Jira_Checker_Plus_Plugin` folder
5. The extension is now installed!

## Usage

1. Navigate to any Jira issue page (e.g., `https://yourcompany.atlassian.net/browse/PROJ-123`)
2. The extension automatically validates the issue
3. If validation issues are found:
   - A warning button appears in the toolbar
   - Click the button to see all validation issues
   - Missing fields are highlighted with red borders

## Settings

Right-click the extension icon → **Options** to configure:

### Configurable Validations (Unchecked by default)
- ☐ Require description for Sub-task
- ☐ Require description for Epic
- ☐ Require description for Task
- ☐ Require assignee for Epic
- ☐ Require priority for Epic

### Strict Validations (Always enforced)
- Description mandatory for Story and Bug
- Assignee mandatory for Story, Task, Sub-task, Bug
- Priority mandatory for Story, Task, Sub-task, Bug
- All other validation rules

## Permissions

- `activeTab` - To read Jira page content
- `storage` - For settings storage
- `*://*.atlassian.net/*` - To run on Jira Cloud instances

## Compatibility

- Chrome 88+
- Edge 88+
- Jira Cloud (atlassian.net)

## License

MIT
