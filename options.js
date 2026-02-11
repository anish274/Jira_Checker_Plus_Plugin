// Default settings
const DEFAULT_SETTINGS = {
  descSubtask: false,
  descEpic: false,
  descTask: false,
  assigneeEpic: false,
  priorityEpic: false,
  weeklyHours: 40,
  timelogMessage: 'Please log your hours for this week!',
  timesheetMessage: 'Please submit your timesheet for this month!'
};

// Load settings
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    document.getElementById('desc-subtask').checked = settings.descSubtask;
    document.getElementById('desc-epic').checked = settings.descEpic;
    document.getElementById('desc-task').checked = settings.descTask;
    document.getElementById('assignee-epic').checked = settings.assigneeEpic;
    document.getElementById('priority-epic').checked = settings.priorityEpic;
    document.getElementById('weekly-hours').value = settings.weeklyHours;
    document.getElementById('timelog-message').value = settings.timelogMessage;
    document.getElementById('timesheet-message').value = settings.timesheetMessage;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    descSubtask: document.getElementById('desc-subtask').checked,
    descEpic: document.getElementById('desc-epic').checked,
    descTask: document.getElementById('desc-task').checked,
    assigneeEpic: document.getElementById('assignee-epic').checked,
    priorityEpic: document.getElementById('priority-epic').checked,
    weeklyHours: parseInt(document.getElementById('weekly-hours').value) || 40,
    timelogMessage: document.getElementById('timelog-message').value || DEFAULT_SETTINGS.timelogMessage,
    timesheetMessage: document.getElementById('timesheet-message').value || DEFAULT_SETTINGS.timesheetMessage
  };

  chrome.storage.sync.set(settings, () => {
    showStatus('Settings saved successfully!');
  });
}

// Reset to defaults
function resetSettings() {
  chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
    loadSettings();
    showStatus('Settings reset to defaults!');
  });
}

// Show status message
function showStatus(message) {
  const statusMsg = document.getElementById('status-msg');
  statusMsg.textContent = message;
  statusMsg.className = 'status-msg success show';
  
  setTimeout(() => {
    statusMsg.classList.remove('show');
  }, 3000);
}

// Event listeners
document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('reset-btn').addEventListener('click', resetSettings);

// Load settings on page load
loadSettings();
