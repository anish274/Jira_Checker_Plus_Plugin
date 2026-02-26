async function loadAnalytics() {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(['jcpMetrics'], result => {
        resolve(result.jcpMetrics || []);
      });
    });
    
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

    // Timeline with rescan info
    const timeline = data.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
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
    chrome.storage.sync.get(['jcpMetrics'], result => {
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
  const confluenceUrl = document.getElementById('confluence-url').value.trim();
  const statusDiv = document.getElementById('confluence-status');
  
  if (!confluenceUrl) {
    statusDiv.innerHTML = '<span style="color: #de350b;">Please enter a Confluence page URL</span>';
    return;
  }
  
  statusDiv.innerHTML = '<span style="color: #0052cc;">Syncing to Confluence...</span>';
  
  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(['jcpMetrics'], result => {
        resolve(result.jcpMetrics || []);
      });
    });
    
    // Create table data for Confluence
    const tableData = data.map(m => ({
      issueKey: m.issueKey,
      issueType: m.issueType || '',
      lastScanned: new Date(m.timestamp).toLocaleDateString(),
      errorCount: m.afterErrors,
      hasDescription: m.hasDescription ? 'Yes' : 'No',
      hasStoryPoints: m.hasStoryPoints ? 'Yes' : 'No',
      hasEstimates: m.hasOriginalEstimate ? 'Yes' : 'No',
      hasFinancialCategory: m.hasFinancialCategory ? 'Yes' : 'No',
      hasTargetStart: m.hasTargetStart ? 'Yes' : 'No',
      hasTargetEnd: m.hasTargetEnd ? 'Yes' : 'No'
    }));
    
    // Store confluence URL and show template
    chrome.storage.sync.set({ confluenceUrl }, () => {
      statusDiv.innerHTML = `
        <div style="color: #36b37e; margin-bottom: 10px;">✓ Data prepared for Confluence sync!</div>
        <div style="font-size: 12px; color: #5e6c84;">
          <strong>Confluence Table Template:</strong><br>
          Create a table in your Confluence page with these columns:<br>
          <code>Issue Key | Issue Type | Last Scanned | Error Count | Description | Story Points | Estimates | Financial Category | Target Start | Target End</code><br><br>
          <strong>Note:</strong> Manual sync required. Copy the exported CSV data to your Confluence table.
        </div>
      `;
    });
    
  } catch (error) {
    statusDiv.innerHTML = '<span style="color: #de350b;">Error preparing data for sync</span>';
  }
});

loadAnalytics();

// Load saved Confluence URL
chrome.storage.sync.get(['confluenceUrl'], result => {
  if (result.confluenceUrl) {
    document.getElementById('confluence-url').value = result.confluenceUrl;
  }
});
