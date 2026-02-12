// Jira Checker Plus - Content Script v0.3
(function() {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================
  const VALIDATION_RULES = {
    DESCRIPTION_MISSING: 'Description is missing',
    ASSIGNEE_MISSING: 'Assignee not assigned',
    PRIORITY_MISSING: 'Priority not set',
    FINANCIAL_CATEGORY_MISSING: 'Financial Category is missing',
    STORY_POINTS_MISSING: 'Story points not estimated.',
    ORIGINAL_ESTIMATE_MISSING: 'Original Estimate missing.',
    TIME_LOGGED_IN_EPIC_STORY: 'Time log now allowed in Epic/Story (only in Sub-tasks and Bugs)',
    TIME_LOGGED_IN_TODO: 'Time logged but issue still in To Do status',
    SUBTASK_100_PERCENT_IN_PROGRESS: 'Sub-task 100% logged - still open',
    STORY_NO_SUBTASKS: 'Story status beyond NEW but no Sub-tasks linked',
    RELEASED_VERSION_NOT_DONE: 'Fix Version is Released but issue status is not Done',
    VERSION_PAST_DATE_NOT_RELEASED: 'Fix Version release date is in the past but not marked as Released'
  };

  const STATUS_TODO = ['to do', 'backlog', 'open'];
  const STATUS_IN_PROGRESS = ['in progress', 'progress'];

  // ============================================================================
  // STATE
  // ============================================================================
  let validationButton = null;
  let validationPanel = null;
  let isPanelOpen = false;
  let currentIssueKey = null;
  let currentIssues = [];
  let settings = {
    descSubtask: false,
    descEpic: false,
    descTask: false,
    assigneeEpic: false,
    priorityEpic: false,
    weeklyHours: 40,
    timelogMessage: 'Please log your hours for this week!',
    timesheetMessage: 'Please submit your timesheet for this month!'
  };

  // ============================================================================
  // API SERVICE
  // ============================================================================
  const JiraAPI = {
    async getIssue(issueKey) {
      try {
        const response = await fetch(`/rest/api/2/issue/${issueKey}`);
        return response.ok ? await response.json() : null;
      } catch (e) {
        return null;
      }
    },

    async getSubtasks(parentKey) {
      try {
        const response = await fetch(`/rest/api/2/search?jql=parent=${parentKey}&fields=issuetype,status,assignee,priority,description,timeoriginalestimate,timespent,aggregatetimeoriginalestimate,customfield_10350,customfield_10016,customfield_10026,fixVersions`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.issues || [];
      } catch (e) {
        return [];
      }
    },

    async getEpicStories(epicKey) {
      try {
        const response = await fetch(`/rest/api/2/search?jql=parent=${epicKey} OR "Epic Link"=${epicKey}&fields=issuetype,status,assignee,priority,description,timeoriginalestimate,timespent,customfield_10350,customfield_10016,customfield_10026,fixVersions`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.issues || [];
      } catch (e) {
        return [];
      }
    },

    getIssueKeyFromURL() {
      const match = window.location.pathname.match(/([A-Z]+-\d+)/);
      return match ? match[1] : null;
    },

    async getTempoWeeklyHours() {
      try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const from = startOfWeek.toISOString().split('T')[0];
        const to = endOfWeek.toISOString().split('T')[0];

        const response = await fetch(`/rest/tempo-timesheets/4/worklogs?dateFrom=${from}&dateTo=${to}`);
        if (!response.ok) return 0;
        
        const data = await response.json();
        const totalSeconds = data.reduce((sum, log) => sum + (log.timeSpentSeconds || 0), 0);
        return totalSeconds / 3600;
      } catch (e) {
        return 0;
      }
    }
  };

  // ============================================================================
  // DATA EXTRACTORS
  // ============================================================================
  const DataExtractor = {
    getIssueType(fields) {
      return fields.issuetype?.name?.toLowerCase() || '';
    },

    getStatus(fields) {
      return fields.status?.name?.toLowerCase() || '';
    },

    getStatusCategory(fields) {
      return fields.status?.statusCategory?.key?.toLowerCase() || '';
    },

    getFixVersions(fields) {
      return fields.fixVersions || [];
    },

    hasReleasedVersion(fields) {
      const versions = this.getFixVersions(fields);
      return versions.some(v => v.released === true);
    },

    hasPastDateUnreleasedVersion(fields) {
      const versions = this.getFixVersions(fields);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      return versions.some(v => {
        if (v.released === true) return false;
        if (!v.releaseDate) return false;
        
        const releaseDate = new Date(v.releaseDate);
        return releaseDate < now;
      });
    },

    hasDescription(fields) {
      return !!fields.description;
    },

    hasAssignee(fields) {
      return !!fields.assignee;
    },

    hasPriority(fields) {
      return !!fields.priority;
    },

    getFinancialCategory(fields) {
      return fields.customfield_10350;
    },

    getStoryPoints(fields) {
      return fields.customfield_10016 || fields.customfield_10026;
    },

    getOriginalEstimate(fields) {
      return fields.timeoriginalestimate;
    },

    getTimeSpent(fields) {
      return fields.timespent || 0;
    },

    getAggregateTimeOriginalEstimate(fields) {
      return fields.aggregatetimeoriginalestimate || fields.timeoriginalestimate || 0;
    }
  };

  // ============================================================================
  // VALIDATION RULES ENGINE
  // ============================================================================
  const ValidationEngine = {
    validateSingleIssue(fields, issueKey = null) {
      const issues = [];
      const issueType = DataExtractor.getIssueType(fields);
      const status = DataExtractor.getStatus(fields);
      const prefix = issueKey ? `[${issueKey}] ` : '';

      // Description validation with settings
      if (!DataExtractor.hasDescription(fields)) {
        const isStoryOrBug = issueType.includes('story') || issueType.includes('bug');
        const isSubtask = issueType.includes('sub');
        const isEpic = issueType.includes('epic');
        const isTask = issueType.includes('task') && !isSubtask;
        
        if (isStoryOrBug || 
            (isSubtask && settings.descSubtask) ||
            (isEpic && settings.descEpic) ||
            (isTask && settings.descTask)) {
          issues.push(prefix + VALIDATION_RULES.DESCRIPTION_MISSING);
        }
      }

      // Assignee validation with settings
      if (!DataExtractor.hasAssignee(fields)) {
        const isEpic = issueType.includes('epic');
        if (!isEpic || settings.assigneeEpic) {
          issues.push(prefix + VALIDATION_RULES.ASSIGNEE_MISSING);
        }
      }

      // Priority validation with settings
      if (!DataExtractor.hasPriority(fields)) {
        const isEpic = issueType.includes('epic');
        if (!isEpic || settings.priorityEpic) {
          issues.push(prefix + VALIDATION_RULES.PRIORITY_MISSING);
        }
      }

      // Financial Category required for Story, Task, Bug, and Sub-task only
      if (issueType.includes('story') || issueType.includes('task') || 
          issueType.includes('bug') || issueType.includes('sub')) {
        if (!DataExtractor.getFinancialCategory(fields)) {
          issues.push(prefix + VALIDATION_RULES.FINANCIAL_CATEGORY_MISSING);
        }
      }

      if (issueType.includes('story') && !issueType.includes('sub')) {
        if (!status.includes('new') && !DataExtractor.getStoryPoints(fields)) {
          issues.push(prefix + VALIDATION_RULES.STORY_POINTS_MISSING);
        }
      }

      if (issueType.includes('sub')) {
        if (!DataExtractor.getOriginalEstimate(fields)) {
          issues.push(prefix + VALIDATION_RULES.ORIGINAL_ESTIMATE_MISSING);
        }
      }

      const timeSpent = DataExtractor.getTimeSpent(fields);
      if (timeSpent > 0) {
        if (issueType.includes('epic') || (issueType.includes('story') && !issueType.includes('sub'))) {
          issues.push(prefix + VALIDATION_RULES.TIME_LOGGED_IN_EPIC_STORY);
        }
      }

      if (timeSpent > 0 && STATUS_TODO.some(s => status.includes(s))) {
        issues.push(prefix + VALIDATION_RULES.TIME_LOGGED_IN_TODO);
      }

      if (issueType.includes('sub') && STATUS_IN_PROGRESS.some(s => status.includes(s))) {
        const originalEstimate = DataExtractor.getAggregateTimeOriginalEstimate(fields);
        if (originalEstimate > 0 && timeSpent >= originalEstimate) {
          issues.push(prefix + VALIDATION_RULES.SUBTASK_100_PERCENT_IN_PROGRESS);
        }
      }

      // Released version but not Done
      if (DataExtractor.hasReleasedVersion(fields)) {
        const statusCategory = DataExtractor.getStatusCategory(fields);
        if (statusCategory !== 'done') {
          issues.push(prefix + VALIDATION_RULES.RELEASED_VERSION_NOT_DONE);
        }
      }

      // Past release date but not marked as Released
      if (DataExtractor.hasPastDateUnreleasedVersion(fields)) {
        issues.push(prefix + VALIDATION_RULES.VERSION_PAST_DATE_NOT_RELEASED);
      }

      return issues;
    },

    async validate(apiData, issueKey) {
      const issues = [];
      const fields = apiData.fields;
      const issueType = DataExtractor.getIssueType(fields);
      const status = DataExtractor.getStatus(fields);

      // Validate current issue
      issues.push(...this.validateSingleIssue(fields));

      // If Epic, validate all stories
      if (issueType.includes('epic')) {
        const stories = await JiraAPI.getEpicStories(issueKey);
        for (const story of stories) {
          const storyIssues = this.validateSingleIssue(story.fields, story.key);
          issues.push(...storyIssues);
        }
      }

      // If Story, validate all subtasks
      if (issueType.includes('story') && !issueType.includes('sub')) {
        const subtasks = await JiraAPI.getSubtasks(issueKey);
        
        // Check if Story beyond NEW has no subtasks
        if (!status.includes('new') && subtasks.length === 0) {
          issues.push(VALIDATION_RULES.STORY_NO_SUBTASKS);
        }
        
        for (const subtask of subtasks) {
          const subtaskIssues = this.validateSingleIssue(subtask.fields, subtask.key);
          issues.push(...subtaskIssues);
        }
      }

      return issues;
    }
  };

  // ============================================================================
  // TEMPO TIMESHEET MANAGER
  // ============================================================================
  const TempoManager = {
    isFriday() {
      return new Date().getDay() === 5;
    },

    isLastWorkingDayOfMonth() {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Find last working day (skip weekends)
      while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
        lastDay.setDate(lastDay.getDate() - 1);
      }
      
      return now.getDate() === lastDay.getDate() && now.getMonth() === lastDay.getMonth();
    },

    async isTimesheetSubmitted() {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const response = await fetch(`/rest/tempo-timesheets/4/timesheet-approval/current-user/${year}/${month}`);
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.status === 'APPROVED' || data.status === 'SUBMITTED';
      } catch (e) {
        return false;
      }
    },

    async checkAndApplyFadeEffect() {
      const messages = [];

      // Check Friday hours
      if (this.isFriday()) {
        const loggedHours = await JiraAPI.getTempoWeeklyHours();
        const requiredHours = settings.weeklyHours;
        
        if (loggedHours < requiredHours) {
          messages.push(`⏰ ${settings.timelogMessage} - Logged: ${loggedHours.toFixed(1)}h / ${requiredHours}h this week`);
        }
      }

      // Check last working day timesheet submission
      if (this.isLastWorkingDayOfMonth()) {
        const submitted = await this.isTimesheetSubmitted();
        if (!submitted) {
          messages.push(`📋 ${settings.timesheetMessage}`);
        }
      }

      if (messages.length > 0) {
        this.showWarnings(messages);
      }
    },

    showWarnings(messages) {
      const banner = document.getElementById('announcement-banner');
      if (!banner) return;

      banner.innerHTML = `
        <div style="background: #de350b; color: #fff; padding: 16px; text-align: center; font-weight: 600;">
          ${messages.join(' | ')}
        </div>
      `;
    }
  };

  // ============================================================================
  // UI MANAGER
  // ============================================================================
  const UIManager = {
    createButton(issues) {
      if (validationButton) {
        validationButton.remove();
      }

      const toolbar = document.querySelector('.aui-toolbar2-secondary');
      if (!toolbar) return;

      validationButton = document.createElement('div');
      validationButton.className = 'aui-buttons';
      validationButton.style.marginRight = '8px';

      const hasErrors = issues.length > 0;
      const buttonClass = hasErrors ? 'jcp-btn-error' : 'jcp-btn-success';
      const icon = hasErrors ? '⚠️' : '✓';
      const text = hasErrors ? `${issues.length} ${issues.length > 1 ? '' : ''}` : 'JCP: OK';

      validationButton.innerHTML = `
        <button class="aui-button ${buttonClass}" id="jcp-toolbar-btn">
          <span class="jcp-btn-icon">${icon}</span>
          <span class="jcp-btn-text">${text}</span>
        </button>
      `;

      toolbar.insertBefore(validationButton, toolbar.firstChild);

      validationButton.querySelector('#jcp-toolbar-btn').addEventListener('click', () => {
        if (hasErrors) {
          this.togglePanel(issues);
        }
      });
    },

    togglePanel(issues) {
      if (isPanelOpen) {
        this.closePanel();
      } else {
        this.openPanel(issues);
      }
    },

    openPanel(issues) {
      this.closePanel();

      validationPanel = document.createElement('div');
      validationPanel.id = 'jira-checker-panel';
      validationPanel.innerHTML = `
        <div class="jcp-header">
          <span class="jcp-icon">⚠️</span>
          <span class="jcp-title">Jira Checker Plus: Validation (${issues.length})</span>
          <button class="jcp-close">×</button>
        </div>
        <ul class="jcp-list">
          ${issues.map(issue => `<li class="jcp-item">🚩 ${issue}</li>`).join('')}
        </ul>
      `;

      document.body.appendChild(validationPanel);
      isPanelOpen = true;

      validationPanel.querySelector('.jcp-close').addEventListener('click', () => {
        this.closePanel();
      });
    },

    closePanel() {
      if (validationPanel) {
        validationPanel.remove();
        validationPanel = null;
      }
      isPanelOpen = false;
    },

    highlightFields(issues) {
      const fieldMap = {
        [VALIDATION_RULES.DESCRIPTION_MISSING]: '[data-testid="issue.views.field.description"]',
        [VALIDATION_RULES.ASSIGNEE_MISSING]: '[data-testid="issue.views.field.assignee"]',
        [VALIDATION_RULES.PRIORITY_MISSING]: '[data-testid="issue.views.field.priority"]'
      };

      Object.entries(fieldMap).forEach(([rule, selector]) => {
        if (issues.includes(rule)) {
          document.querySelector(selector)?.classList.add('jcp-highlight');
        }
      });
    }
  };

  // ============================================================================
  // UTILITIES
  // ============================================================================
  const Utils = {
    waitForElement(selector, timeout = 5000) {
      return new Promise((resolve) => {
        if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(() => {
          if (document.querySelector(selector)) {
            observer.disconnect();
            resolve(document.querySelector(selector));
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
      });
    }
  };

  // ============================================================================
  // SETTINGS MANAGER
  // ============================================================================
  const SettingsManager = {
    async load() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(settings, (result) => {
          settings = result;
          resolve();
        });
      });
    }
  };

  // ============================================================================
  // MAIN APPLICATION
  // ============================================================================
  const App = {
    async run() {
      const issueKey = JiraAPI.getIssueKeyFromURL();
      if (!issueKey) return;

      if (currentIssueKey !== issueKey) {
        currentIssueKey = issueKey;
        UIManager.closePanel();
      }

      const apiData = await JiraAPI.getIssue(issueKey);
      if (!apiData) return;

      const issues = await ValidationEngine.validate(apiData, issueKey);
      currentIssues = issues;

      UIManager.createButton(issues);
      if (issues.length > 0) {
        UIManager.highlightFields(issues);
      }
    },

    setupObserver() {
      const observer = new MutationObserver(() => {
        setTimeout(() => this.run(), 500);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    },

    async init() {
      await SettingsManager.load();
      await Utils.waitForElement('.aui-toolbar2-secondary');
      await this.run();
      this.setupObserver();
      await TempoManager.checkAndApplyFadeEffect();
    }
  };

  // ============================================================================
  // BOOTSTRAP
  // ============================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();
