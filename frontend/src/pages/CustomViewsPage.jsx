import React from 'react';
import BotActivityTimeline from '../components/BotActivityTimeline';
import TaskErrorHeatmap from '../components/TaskErrorHeatmap';
import WorkflowRunbookPdf from '../components/WorkflowRunbookPdf';
import BotScheduleRulesEditor from '../components/BotScheduleRulesEditor';

function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ color: '#f1f5f9', margin: 0, fontSize: 26 }}>RPA Custom Views</h1>
        <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>
          Four RPA-choreography views: bot activity timeline, task error heatmap, workflow runbook PDF,
          and bot scheduling rules editor.
        </p>
      </div>

      <BotActivityTimeline />
      <TaskErrorHeatmap />
      <WorkflowRunbookPdf />
      <BotScheduleRulesEditor />
    </div>
  );
}

export default CustomViewsPage;
