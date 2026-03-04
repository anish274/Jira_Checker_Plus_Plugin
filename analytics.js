async function loadAnalytics() {
  try {
    // First try to migrate data from sync to local storage
    await migrateStorageData();
    
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['jcpMetrics'], result => {
        resolve(result.jcpMetrics || []);
      });
    });
    
    console.log('Analytics: Total entries loaded from storage:', data.length);
    console.log('Analytics: Last 3 entries:', data.slice(-3));
    
    if (data.length === 0) {
      document.getElementById('total-scans').textContent = '0';
      document.getElementById('total-issues').textContent = '0';
      document.getElementById('avg-issues').textContent = '0';
      document.getElementById('rescan-count').textContent = '0';
      document.getElementById('issues-fixed').textContent = '0';
      document.getElementById('timeline').innerHTML = '<div class="no-data">No data available yet. Visit a Jira issue page to start tracking.</div>';
      return;
    }

    const totalIssues = data.reduce((sum, m) => sum + m.issueCount, 0);
    const avgIssues = (totalIssues / data.length).toFixed(1);
    
    // Calculate rescans (same issue key scanned multiple times)
    const issueKeys = {};
    let rescanCount = 0;
    let issuesFixed = 0;
    
    data.forEach(m => {
      if (issueKeys[m.issueKey]) {
        rescanCount++;
        // Check if issues were fixed in rescan
        if (m.beforeErrors !== null && m.afterErrors < m.beforeErrors) {
          issuesFixed += (m.beforeErrors - m.afterErrors);
        }
      } else {
        issueKeys[m.issueKey] = true;
      }
    });

    document.getElementById('total-scans').textContent = data.length;
    document.getElementById('total-issues').textContent = totalIssues;
    document.getElementById('avg-issues').textContent = avgIssues;
    document.getElementById('rescan-count').textContent = rescanCount;
    document.getElementById('issues-fixed').textContent = issuesFixed;

    // Field completion rates - updated fields
    const descPct = ((data.filter(m => m.hasDescription).length / data.length) * 100).toFixed(1);
    const storyPointsPct = ((data.filter(m => m.hasStoryPoints).length / data.length) * 100).toFixed(1);
    const estimatesPct = ((data.filter(m => m.hasOriginalEstimate).length / data.length) * 100).toFixed(1);
    const financialPct = ((data.filter(m => m.hasFinancialCategory).length / data.length) * 100).toFixed(1);
    const targetStartPct = ((data.filter(m => m.hasTargetStart).length / data.length) * 100).toFixed(1);
    const targetEndPct = ((data.filter(m => m.hasTargetEnd).length / data.length) * 100).toFixed(1);

    updateProgressBar('desc', descPct);
    updateProgressBar('story-points', storyPointsPct);
    updateProgressBar('estimates', estimatesPct);
    updateProgressBar('financial', financialPct);
    updateProgressBar('target-start', targetStartPct);
    updateProgressBar('target-end', targetEndPct);

    // Timeline with rescan info - show all entries
    const timeline = data.sort((a, b) => b.timestamp - a.timestamp);
    console.log('Timeline entries to display:', timeline.length);
    const timelineHTML = timeline.map(t => {
      const date = new Date(t.timestamp).toLocaleString();
      const beforeAfter = t.beforeErrors !== null ? `${t.beforeErrors} → ${t.afterErrors}` : `${t.afterErrors}`;
      const rescanInfo = t.beforeErrors !== null ? 'Rescan' : 'First scan';
      const color = t.beforeErrors !== null && t.afterErrors < t.beforeErrors ? '#36b37e' : (t.afterErrors > 0 ? '#ff5630' : '#6b778c');
      return `<div class="timeline-item">
        <span><strong>${t.issueKey}</strong> (${t.issueType})</span>
        <span style="color:${color};font-weight:600">${beforeAfter} errors</span>
        <span style="font-size:12px;color:#6b778c">${rescanInfo}</span>
        <span style="font-size:12px;color:#6b778c">${date}</span>
      </div>`;
    }).join('');
    document.getElementById('timeline').innerHTML = timelineHTML;
  } catch (error) {
    console.error('Analytics load error:', error);
    document.getElementById('timeline').innerHTML = '<div class="no-data">Error loading analytics.</div>';
  }
}

function updateProgressBar(field, percentage) {
  document.getElementById(field + '-pct').textContent = percentage + '%';
  document.getElementById(field + '-bar').style.width = percentage + '%';
  document.getElementById(field + '-bar').textContent = percentage + '%';
}

document.getElementById('export-btn').addEventListener('click', async () => {
  const data = await new Promise(resolve => {
    chrome.storage.local.get(['jcpMetrics'], result => {
      resolve(result.jcpMetrics || []);
    });
  });

  const csv = [
    ['Timestamp', 'Issue Key', 'Issue Type', 'Before Errors', 'After Errors', 'Has Description', 'Has Story Points', 'Has Estimates', 'Has Financial Category', 'Has Target Start', 'Has Target End', 'Status'],
    ...data.map(m => [
      new Date(m.timestamp).toISOString(),
      m.issueKey,
      m.issueType || '',
      m.beforeErrors !== null ? m.beforeErrors : 'N/A',
      m.afterErrors,
      m.hasDescription ? 'Yes' : 'No',
      m.hasStoryPoints ? 'Yes' : 'No',
      m.hasOriginalEstimate ? 'Yes' : 'No',
      m.hasFinancialCategory ? 'Yes' : 'No',
      m.hasTargetStart ? 'Yes' : 'No',
      m.hasTargetEnd ? 'Yes' : 'No',
      m.status
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jcp-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
});

// Confluence sync functionality
document.getElementById('sync-confluence-btn').addEventListener('click', async () => {
  // Get saved Confluence URL from storage
  const result = await new Promise(resolve => {
    chrome.storage.sync.get(['confluenceUrl'], resolve);
  });
  
  const confluenceUrl = result.confluenceUrl;
  const statusDiv = document.getElementById('sync-status');
  
  if (!confluenceUrl) {
    statusDiv.innerHTML = '<span style="color: #de350b;">Please save Confluence URL in Analytics Settings first</span>';
    return;
  }
  
  statusDiv.innerHTML = '<span style="color: #0052cc;">Syncing to Confluence...</span>';
  
  try {
    // Extract page ID from Confluence URL (pageId=567904864)
    const pageIdMatch = confluenceUrl.match(/pageId=(\d+)/);
    if (!pageIdMatch) {
      statusDiv.innerHTML = '<span style="color: #de350b;">Invalid Confluence URL format. URL should contain pageId parameter</span>';
      return;
    }
    
    const pageId = pageIdMatch[1];
    
    // Extract base URL (https://confluence.tenerity.com)
    const baseUrlMatch = confluenceUrl.match(/(https?:\/\/[^\/]+)/);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : window.location.origin;
    
    // Get analytics data
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['jcpMetrics'], result => {
        resolve(result.jcpMetrics || []);
      });
    });
    
    if (data.length === 0) {
      statusDiv.innerHTML = '<span style="color: #de350b;">No analytics data to sync</span>';
      return;
    }
    
    // Get current page content
    const pageResponse = await fetch(`${baseUrl}/rest/api/content/${pageId}?expand=body.storage,version`);
    if (!pageResponse.ok) {
      if (pageResponse.status === 401 || pageResponse.status === 403) {
        throw new Error('Authentication failed. Please log in to Confluence first.');
      }
      throw new Error(`Failed to fetch Confluence page: ${pageResponse.status} ${pageResponse.statusText}`);
    }
    
    const pageData = await pageResponse.json().catch(() => {
      throw new Error('Authentication failed. Please log in to Confluence first.');
    });
    let content = pageData.body.storage.value;
    
    // Create a map of existing data for quick lookup (use most recent entry per issue)
    const dataMap = new Map();
    // Sort by timestamp to ensure we process entries in chronological order
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
    sortedData.forEach(m => {
      // For first scans, put error count in Before column; for rescans, use actual before/after
      const isFirstScan = m.beforeErrors === null;
      dataMap.set(m.issueKey, {
        issueType: m.issueType || '',
        lastScanned: new Date(m.timestamp).toLocaleDateString(),
        beforeErrorCount: isFirstScan ? m.afterErrors : (m.beforeErrors !== null ? m.beforeErrors : 'N/A'),
        afterErrorCount: isFirstScan ? 'N/A' : m.afterErrors,
        hasDescription: m.hasDescription ? 'Yes' : 'No',
        hasStoryPoints: m.hasStoryPoints ? 'Yes' : 'No',
        hasEstimates: m.hasOriginalEstimate ? 'Yes' : 'No',
        hasFinancialCategory: m.hasFinancialCategory ? 'Yes' : 'No',
        hasTargetStart: m.hasTargetStart ? 'Yes' : 'No',
        hasTargetEnd: m.hasTargetEnd ? 'Yes' : 'No'
      });
    });
    
    // Check if table exists
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/i;
    const tableMatch = content.match(tableRegex);
    
    if (tableMatch) {
      // Update existing table
      const tableContent = tableMatch[1];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let updatedTableContent = tableContent;
      let updatedIssues = new Set();
      
      // Update existing rows
      updatedTableContent = updatedTableContent.replace(rowRegex, (match, rowContent) => {
        const cellRegex = /<td[^>]*>([^<]*)<\/td>/gi;
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          cells.push(cellMatch[1].trim());
        }
        
        if (cells.length > 0 && dataMap.has(cells[0])) {
          const issueKey = cells[0];
          const issueData = dataMap.get(issueKey);
          updatedIssues.add(issueKey);
          
          return `<tr>
            <td>${issueKey}</td>
            <td>${issueData.issueType}</td>
            <td>${issueData.lastScanned}</td>
            <td>${issueData.beforeErrorCount}</td>
            <td>${issueData.afterErrorCount}</td>
            <td>${issueData.hasDescription}</td>
            <td>${issueData.hasStoryPoints}</td>
            <td>${issueData.hasEstimates}</td>
            <td>${issueData.hasFinancialCategory}</td>
            <td>${issueData.hasTargetStart}</td>
            <td>${issueData.hasTargetEnd}</td>
          </tr>`;
        }
        return match; // Keep original row if not in our data
      });
      
      // Add new rows for issues not already in table
      const newRows = [];
      dataMap.forEach((issueData, issueKey) => {
        if (!updatedIssues.has(issueKey)) {
          newRows.push(`<tr>
            <td>${issueKey}</td>
            <td>${issueData.issueType}</td>
            <td>${issueData.lastScanned}</td>
            <td>${issueData.beforeErrorCount}</td>
            <td>${issueData.afterErrorCount}</td>
            <td>${issueData.hasDescription}</td>
            <td>${issueData.hasStoryPoints}</td>
            <td>${issueData.hasEstimates}</td>
            <td>${issueData.hasFinancialCategory}</td>
            <td>${issueData.hasTargetStart}</td>
            <td>${issueData.hasTargetEnd}</td>
          </tr>`);
        }
      });
      
      if (newRows.length > 0) {
        updatedTableContent += newRows.join('');
      }
      
      const updatedTable = `<table>${updatedTableContent}</table>`;
      content = content.replace(tableRegex, updatedTable);
    } else {
      // Create new table if none exists
      const tableRows = Array.from(dataMap.entries()).map(([issueKey, issueData]) => {
        return `<tr>
          <td>${issueKey}</td>
          <td>${issueData.issueType}</td>
          <td>${issueData.lastScanned}</td>
          <td>${issueData.beforeErrorCount}</td>
          <td>${issueData.afterErrorCount}</td>
          <td>${issueData.hasDescription}</td>
          <td>${issueData.hasStoryPoints}</td>
          <td>${issueData.hasEstimates}</td>
          <td>${issueData.hasFinancialCategory}</td>
          <td>${issueData.hasTargetStart}</td>
          <td>${issueData.hasTargetEnd}</td>
        </tr>`;
      }).join('');
      
      const tableHtml = `
      <h2>JCP Analytics Data</h2>
      <table>
        <thead>
          <tr>
            <th>Issue Key</th>
            <th>Issue Type</th>
            <th>Last Scanned</th>
            <th>Before Error Count</th>
            <th>After Error Count</th>
            <th>Description</th>
            <th>Story Points</th>
            <th>Estimates</th>
            <th>Financial Category</th>
            <th>Target Start</th>
            <th>Target End</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>`;
      
      content += tableHtml;
    }
    
    // Update page
    const updateResponse = await fetch(`${baseUrl}/rest/api/content/${pageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: pageId,
        type: 'page',
        title: pageData.title,
        body: {
          storage: {
            value: content,
            representation: 'storage'
          }
        },
        version: {
          number: pageData.version.number + 1
        }
      })
    });
    
    if (!updateResponse.ok) {
      if (updateResponse.status === 401 || updateResponse.status === 403) {
        throw new Error('Authentication failed. Please log in to Confluence first.');
      }
      throw new Error(`Failed to update Confluence page: ${updateResponse.status}`);
    }
    
    statusDiv.innerHTML = `
      <div style="color: #36b37e; margin-bottom: 10px;">✓ Successfully synced ${dataMap.size} records to Confluence!</div>
      <div style="font-size: 12px; color: #5e6c84;">
        <a href="${confluenceUrl}" target="_blank">View updated page</a>
      </div>
    `;
    
  } catch (error) {
    console.error('Confluence sync error:', error);
    statusDiv.innerHTML = `<span style="color: #de350b;">Sync failed: ${error.message}</span>`;
  }
});

// Save Confluence URL
document.getElementById('save-confluence-btn').addEventListener('click', () => {
  const confluenceUrl = document.getElementById('confluence-url').value.trim();
  const statusDiv = document.getElementById('confluence-status');
  
  if (!confluenceUrl) {
    statusDiv.innerHTML = '<span style="color: #de350b;">Please enter a Confluence URL</span>';
    return;
  }
  
  chrome.storage.sync.set({ confluenceUrl }, () => {
    statusDiv.innerHTML = '<span style="color: #36b37e;">✓ Confluence URL saved successfully!</span>';
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 3000);
  });
});

loadAnalytics();

// Migration function to move data from sync to local storage
async function migrateStorageData() {
  try {
    // Check if local storage already has data
    const localData = await new Promise(resolve => {
      chrome.storage.local.get(['jcpMetrics'], result => {
        resolve(result.jcpMetrics || []);
      });
    });
    
    // If local storage is empty, try to migrate from sync storage
    if (localData.length === 0) {
      const syncData = await new Promise(resolve => {
        chrome.storage.sync.get(['jcpMetrics'], result => {
          resolve(result.jcpMetrics || []);
        });
      });
      
      if (syncData.length > 0) {
        console.log('JCP: Migrating', syncData.length, 'entries from sync to local storage');
        await new Promise(resolve => {
          chrome.storage.local.set({ jcpMetrics: syncData }, resolve);
        });
      }
    }
  } catch (error) {
    console.warn('JCP: Migration failed:', error);
  }
}

// Load saved Confluence URL
chrome.storage.sync.get(['confluenceUrl'], result => {
  if (result.confluenceUrl) {
    document.getElementById('confluence-url').value = result.confluenceUrl;
  }
});

// Sidebar navigation
document.querySelectorAll('.nav-item').forEach(item => {
  if (!item.classList.contains('analytics-link')) {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = e.target.dataset.section;
      
      // Update active nav item
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      e.target.classList.add('active');
      
      // Show corresponding section
      document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(section + '-section').classList.add('active');
    });
  }
});
