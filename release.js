// Jira Checker Plus - Release Page Validator v0.95.0
(function() {
  'use strict';

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
    VERSION_PAST_DATE_NOT_RELEASED: 'Fix Version release date is in the past but not marked as Released',
    STORY_SHOULD_BE_CLOSED: 'Story not Done but all Sub-tasks and linked Bugs are closed'
  };

  const STATUS_TODO = ['to do', 'backlog', 'open'];
  const STATUS_IN_PROGRESS = ['in progress', 'progress'];

  let validationButton = null;
  let validationPanel = null;
  let isPanelOpen = false;
  let settings = {
    descSubtask: false,
    descEpic: false,
    descTask: false,
    assigneeEpic: false,
    priorityEpic: false
  };

  const JiraAPI = {
    getVersionIdFromURL() {
      const match = window.location.pathname.match(/versions\/(\d+)/);
      return match ? match[1] : null;
    },

    async getVersionIssues(versionId) {
      try {
        const response = await fetch(`/rest/api/2/search?jql=fixVersion=${versionId}&fields=issuetype,status,assignee,priority,description,timeoriginalestimate,timespent,aggregatetimeoriginalestimate,customfield_10350,customfield_10006,fixVersions&maxResults=1000`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.issues || [];
      } catch (e) {
        return [];
      }
    },

    async getSubtasks(parentKey) {
      try {
        const response = await fetch(`/rest/api/2/search?jql=parent=${parentKey}&fields=issuetype,status,assignee,priority,description,timeoriginalestimate,timespent,aggregatetimeoriginalestimate,customfield_10350,customfield_10006,fixVersions`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.issues || [];
      } catch (e) {
        return [];
      }
    }
  };

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
      return fields.customfield_10006;
    },

    getOriginalEstimate(fields) {
      return fields.timeoriginalestimate;
    },

    getTimeSpent(fields) {
      return fields.timespent || 0;
    },

    getAggregateTimeOriginalEstimate(fields) {
      return fields.aggregatetimeoriginalestimate || fields.timeoriginalestimate || 0;
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
    }
  };

  const ValidationEngine = {
    validateSingleIssue(fields, issueKey) {
      const issues = [];
      const issueType = DataExtractor.getIssueType(fields);
      const status = DataExtractor.getStatus(fields);
      const prefix = `[${issueKey}] `;

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

      if (!DataExtractor.hasAssignee(fields)) {
        const isEpic = issueType.includes('epic');
        if (!isEpic || settings.assigneeEpic) {
          issues.push(prefix + VALIDATION_RULES.ASSIGNEE_MISSING);
        }
      }

      if (!DataExtractor.hasPriority(fields)) {
        const isEpic = issueType.includes('epic');
        if (!isEpic || settings.priorityEpic) {
          issues.push(prefix + VALIDATION_RULES.PRIORITY_MISSING);
        }
      }

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

      if (DataExtractor.hasReleasedVersion(fields)) {
        const statusCategory = DataExtractor.getStatusCategory(fields);
        if (statusCategory !== 'done') {
          issues.push(prefix + VALIDATION_RULES.RELEASED_VERSION_NOT_DONE);
        }
      }

      if (DataExtractor.hasPastDateUnreleasedVersion(fields)) {
        issues.push(prefix + VALIDATION_RULES.VERSION_PAST_DATE_NOT_RELEASED);
      }

      return issues;
    },

    async validateRelease(versionId) {
      const allIssues = [];
      const versionIssues = await JiraAPI.getVersionIssues(versionId);

      // Collect all stories that need subtask validation
      const storyKeys = [];
      for (const issue of versionIssues) {
        const issueType = DataExtractor.getIssueType(issue.fields);
        const issues = this.validateSingleIssue(issue.fields, issue.key);
        allIssues.push(...issues);

        if (issueType.includes('story') && !issueType.includes('sub')) {
          storyKeys.push(issue.key);
        }
      }

      // Batch fetch all subtasks in parallel
      if (storyKeys.length > 0) {
        const subtaskPromises = storyKeys.map(key => JiraAPI.getSubtasks(key));
        const allSubtasksArrays = await Promise.all(subtaskPromises);

        // Validate all subtasks
        for (const subtasks of allSubtasksArrays) {
          for (const subtask of subtasks) {
            const subtaskIssues = this.validateSingleIssue(subtask.fields, subtask.key);
            allIssues.push(...subtaskIssues);
          }
        }
      }

      return allIssues;
    }
  };

  const UIManager = {
    createButton(issues) {
      if (validationButton) {
        validationButton.remove();
      }

      const headerActions = document.querySelector('.aui-page-header-actions');
      if (!headerActions) return;

      validationButton = document.createElement('div');
      validationButton.className = 'aui-buttons';
      validationButton.style.marginRight = '8px';

      const hasErrors = issues.length > 0;
      const buttonClass = hasErrors ? 'jcp-btn-error' : 'jcp-btn-success';
      const icon = hasErrors ? '⚠️' : '✓';
      const text = hasErrors ? `${issues.length}` : 'JCP: OK';

      validationButton.innerHTML = `
        <button class="aui-button ${buttonClass}" id="jcp-release-btn">
          <span class="jcp-btn-icon">${icon}</span>
          <span class="jcp-btn-text">${text}</span>
        </button>
      `;

      headerActions.insertBefore(validationButton, headerActions.firstChild);

      validationButton.querySelector('#jcp-release-btn').addEventListener('click', () => {
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
          <span class="jcp-title">Release Validation Issues (${issues.length})</span>
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
    }
  };

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

  const App = {
    async run() {
      const versionId = JiraAPI.getVersionIdFromURL();
      if (!versionId) return;

      const issues = await ValidationEngine.validateRelease(versionId);
      UIManager.createButton(issues);
    },

    async init() {
      await SettingsManager.load();
      await Utils.waitForElement('.aui-page-header-actions');
      await this.run();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();
