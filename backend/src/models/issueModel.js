const { query } = require('../config/db');

async function createIssue(projectId, entityType, entityId, raisedBy, issueNote) {
  const result = await query(
    `INSERT INTO issues (project_id, entity_type, entity_id, raised_by, issue_note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [projectId, entityType, entityId, raisedBy, issueNote]
  );
  return result.rows[0];
}

async function getIssuesByProject(projectId, limit, offset, resolvedBy = null, status = null) {
  const sql = `
    SELECT * FROM issues 
    WHERE project_id = $1 
    AND ($4::int IS NULL OR resolved_by = $4)
    AND ($5::text IS NULL OR status = $5::issue_status)
    ORDER BY raised_at DESC LIMIT $2 OFFSET $3
  `;
  const result = await query(sql, [projectId, limit, offset, resolvedBy, status]);
  return result.rows;
}

async function resolveIssue(issueId, projectId, resolvedBy) {
  const result = await query(
    `UPDATE issues 
     SET status = 'RESOLVED', resolved_by = $3, resolved_at = NOW()
     WHERE id = $1 AND project_id = $2 AND status != 'RESOLVED'
     RETURNING *`,
    [issueId, projectId, resolvedBy]
  );
  return result.rows[0] || null;
}

async function escalateIssue(issueId, fromLevel, toLevel, escalatedBy = null) {
  const result = await query(
    `UPDATE issues SET current_level = $3 WHERE id = $1 AND current_level = $2 RETURNING *`,
    [issueId, fromLevel, toLevel]
  );
  if (result.rows.length > 0) {
    await query(
      `INSERT INTO issue_escalation_log (issue_id, from_level, to_level, escalated_by) VALUES ($1, $2, $3, $4)`,
      [issueId, fromLevel, toLevel, escalatedBy]
    );
  }
  return result.rows[0] || null;
}

async function getOpenIssuesForEscalation() {
  const result = await query(
    `SELECT * FROM issues WHERE status = 'OPEN'`
  );
  return result.rows;
}

module.exports = { createIssue, getIssuesByProject, resolveIssue, escalateIssue, getOpenIssuesForEscalation };
