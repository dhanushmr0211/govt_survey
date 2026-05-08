const cron = require('node-cron');
const { query } = require('../config/db');

const ESCALATION_RULES = {
  0: 12,
  1: 6,
  2: 6,
  3: 6,
};

async function escalateIssues() {
  console.log('[Escalation Worker] Running issue escalation check...');

  try {
    for (const [levelStr, hours] of Object.entries(ESCALATION_RULES)) {
      const currentLevel = parseInt(levelStr, 10);
      const nextLevel = currentLevel + 1;

      // We calculate the cumulative hours required to reach the next level from the initial raised_at
      let cumulativeHours = 0;
      for (let i = 0; i <= currentLevel; i++) {
        cumulativeHours += ESCALATION_RULES[i];
      }

      const result = await query(
        `UPDATE issues
         SET current_level = $1
         WHERE status = 'OPEN' 
           AND current_level = $2
           AND raised_at <= NOW() - ($3::int * interval '1 hour')
         RETURNING id`,
        [nextLevel, currentLevel, cumulativeHours]
      );

      if (result.rowCount > 0) {
        console.log(`[Escalation Worker] Escalated ${result.rowCount} issues from level ${currentLevel} to ${nextLevel}.`);
        
        // Log to issue_escalation_log
        for (const row of result.rows) {
          await query(
            `INSERT INTO issue_escalation_log (issue_id, from_level, to_level) VALUES ($1, $2, $3)`,
            [row.id, currentLevel, nextLevel]
          );
        }
      }
    }
  } catch (error) {
    console.error('[Escalation Worker] Failed to run escalation:', error);
  }
}

function startWorker() {
  cron.schedule('*/30 * * * *', escalateIssues);
  console.log('Issue Escalation Worker scheduled (runs every 30 minutes).');
}

module.exports = { startWorker, escalateIssues };
