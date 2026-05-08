import { Clock, AlertTriangle } from 'lucide-react';

export const IssueTracker = ({ issue, logs = [] }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Issue #{issue.id}</h3>
            <p className="text-sm text-gray-500">Raised by User {issue.raised_by}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          issue.current_level >= 3 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
        }`}>
          Level {issue.current_level}
        </span>
      </div>

      {/* Note */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
        {issue.issue_note}
      </div>

      {/* Time Remaining Placeholder */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock size={16} />
        <span>Time remaining before next escalation: ~4 hours</span>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Escalation Timeline</h4>
        
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
          {logs.map((log, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-6 top-1.5 w-4 h-4 bg-white border-2 border-primary rounded-full"></div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Escalated to Level {log.to_level}</p>
                <p className="text-xs text-gray-500">{new Date(log.escalated_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          
          <div className="relative">
            <div className="absolute -left-6 top-1.5 w-4 h-4 bg-primary rounded-full"></div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">Issue Raised</p>
              <p className="text-xs text-gray-500">{new Date(issue.raised_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
