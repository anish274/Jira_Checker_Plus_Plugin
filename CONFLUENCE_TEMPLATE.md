# Confluence Table Template for JCP Analytics Sync

## Table Structure

Create a table in your Confluence page with the following columns:

| Issue Key | Issue Type | Last Scanned | Error Count | Description | Story Points | Estimates | Financial Category | Target Start | Target End |
|-----------|------------|--------------|-------------|-------------|--------------|-----------|-------------------|--------------|------------|
| PROJ-123  | Story      | 2024-01-15   | 2           | Yes         | No           | Yes       | Yes               | Yes          | No         |
| PROJ-124  | Bug        | 2024-01-15   | 0           | Yes         | N/A          | Yes       | Yes               | N/A          | N/A        |

## How to Sync

1. Go to JCP Analytics Dashboard
2. Enter your Confluence page URL in the sync section
3. Click "Sync to Confluence" 
4. Export the CSV data using the "Export Data (CSV)" button
5. Copy the data from CSV and paste it into your Confluence table
6. The plugin will automatically update existing entries based on Issue Key

## Column Descriptions

- **Issue Key**: Jira issue identifier (e.g., PROJ-123)
- **Issue Type**: Type of issue (Story, Bug, Task, Sub-task, Epic)
- **Last Scanned**: Date when the issue was last scanned by JCP
- **Error Count**: Number of validation errors found in the last scan
- **Description**: Whether the issue has a description (Yes/No)
- **Story Points**: Whether the issue has story points estimated (Yes/No/N/A)
- **Estimates**: Whether the issue has original estimate (Yes/No/N/A)
- **Financial Category**: Whether the issue has financial category set (Yes/No/N/A)
- **Target Start**: Whether the issue has target start date set (Yes/No/N/A)
- **Target End**: Whether the issue has target end date set (Yes/No/N/A)

## Notes

- The sync is currently manual - you need to copy data from the exported CSV
- Existing entries will be updated based on Issue Key matching
- N/A values indicate the field is not applicable for that issue type