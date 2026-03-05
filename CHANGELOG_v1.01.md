# Jira Checker Plus - Version 1.01 Release Notes

## 🎯 Overview
Version 1.01 introduces permanent analytics data storage and improved data management with the ability to sync and clear recent scans while preserving historical overview metrics.

## ✨ New Features

### 1. **Permanent Analytics Overview Data**
- Analytics Overview metrics (Total Scans, Total Issues, Avg Issues/Scan, Rescan Count, Issues Fixed) are now stored permanently
- Overview data is NEVER deleted, even when clearing recent scans
- Field completion rates are preserved across all scans

### 2. **Separated Storage Architecture**
- **jcpOverview**: Permanent storage for aggregate metrics (never deleted)
- **jcpScans**: Recent scan entries (can be deleted after Confluence sync)
- Automatic migration from old `jcpMetrics` structure to new dual-storage system

### 3. **Reorganized Recent Scans UI**
- Moved action buttons next to "Recent Scans" heading for better UX
- Buttons now appear in a horizontal row beside the section title
- Cleaner, more intuitive layout

### 4. **New "Sync + Delete Scans" Button**
- Syncs all data to Confluence
- Deletes ONLY the Recent Scans list
- Preserves all Analytics Overview data permanently
- Red button styling to indicate destructive action
- Confirmation message shows what was preserved

## 🔧 Technical Changes

### Storage Structure
```javascript
// Old structure (v1.0)
jcpMetrics: [{ issueKey, timestamp, issueCount, ... }]

// New structure (v1.01)
jcpOverview: {
  totalScans: number,
  totalIssues: number,
  rescanCount: number,
  issuesFixed: number,
  fieldStats: { descPct, storyPointsPct, ... }
}
jcpScans: [{ issueKey, timestamp, issueCount, ... }]
```

### Updated Files
1. **analytics.js**
   - Separated data loading into overview and scans
   - Added sync-delete functionality
   - Enhanced migration logic for backward compatibility
   - Overview metrics calculated incrementally

2. **analytics.html**
   - Repositioned buttons beside "Recent Scans" heading
   - Added new "Sync + Delete Scans" button with red styling
   - Improved button layout with flexbox

3. **content.js**
   - Updated trackMetrics to save to both jcpOverview and jcpScans
   - Incremental overview updates on each scan
   - Field stats recalculated from all scans

4. **manifest.json & package.json**
   - Version bumped to 1.01

## 📊 Data Preservation Guarantee

### What Gets Deleted
- ✅ Recent Scans timeline entries (when using "Sync + Delete Scans")

### What NEVER Gets Deleted
- ✅ Total Scans count
- ✅ Total Issues Found count
- ✅ Average Issues per Scan
- ✅ Rescan Count
- ✅ Issues Fixed count
- ✅ Field Completion Rates (Description, Story Points, Estimates, Financial Category, Target Start, Target End)

## 🔄 Migration Path

Users upgrading from v1.0 to v1.01:
1. Old `jcpMetrics` data automatically migrated to new structure
2. Overview metrics calculated from historical data
3. All existing scans preserved in `jcpScans`
4. No data loss during migration

## 🎨 UI Improvements

### Before (v1.0)
```
Recent Scans
[Timeline entries]
[Export Data] [Sync to Confluence]
```

### After (v1.01)
```
Recent Scans    [Export Data] [Sync to Confluence] [Sync + Delete Scans]
[Timeline entries]
```

## 🚀 Usage

### Export Data
- Exports all recent scans to CSV
- Does not delete any data

### Sync to Confluence
- Syncs all data to configured Confluence page
- Does not delete any data

### Sync + Delete Scans (NEW)
- Syncs all data to Confluence
- Deletes recent scan entries
- **Preserves all Analytics Overview metrics**
- Shows confirmation message

## 📝 Notes

- Storage limit: 500 recent scans (auto-cleanup of oldest entries)
- Overview metrics have no limit and accumulate indefinitely
- Confluence sync uses most recent entry per issue key
- All buttons now positioned for better accessibility

## 🐛 Bug Fixes
- None (new feature release)

## 🔮 Future Enhancements
- Manual refresh button for Analytics Overview
- Export overview metrics separately
- Date range filtering for recent scans
- Bulk delete with date selection

---

**Version**: 1.01  
**Release Date**: 2024  
**Previous Version**: 1.0.0
