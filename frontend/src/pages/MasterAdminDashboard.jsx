import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';

export default function MasterAdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null); // e.g. 'Pole Survey'
  const [selectedUlb, setSelectedUlb] = useState(null);

  return (
    <div className="flex h-screen bg-gray-50 -m-6"> {/* -m-6 to override parent padding if any */}
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Govt Survey</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => { setActiveView('projects'); setSelectedUlb(null); }}
            className={`w-full text-left p-2 rounded text-sm ${activeView === 'projects' ? 'bg-primary/5 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Projects
          </button>
          
          {selectedProject === 'Pole Survey' && (
            <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
              <button
                onClick={() => { setActiveView('pole_survey_summary'); setSelectedUlb(null); }}
                className={`w-full text-left p-2 text-xs rounded ${activeView === 'pole_survey_summary' ? 'text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                1: SUMMARY
              </button>
              <button
                onClick={() => { setActiveView('pole_survey_today'); setSelectedUlb(null); }}
                className={`w-full text-left p-2 text-xs rounded ${activeView === 'pole_survey_today' ? 'text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                2: TODAY'S SUMMARY
              </button>
              <button
                onClick={() => { setActiveView('pole_survey_issues'); setSelectedUlb(null); }}
                className={`w-full text-left p-2 text-xs rounded ${activeView === 'pole_survey_issues' ? 'text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                3: ISSUES
              </button>
            </div>
          )}
          
          <button
            onClick={() => alert('Download Report flow will be implemented later.')}
            className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
          >
            DOWNLOAD REPORT
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeView === 'projects' ? 'All Projects' : selectedProject}
            </h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>

        </div>

        {activeView === 'projects' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                onClick={() => {
                  setSelectedProject('Pole Survey');
                  setActiveView('pole_survey_summary');
                }}
                className="p-6 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors"
              >
                <h3 className="font-semibold text-gray-900">Pole Survey</h3>
                <p className="text-sm text-gray-500 mt-1">Manage pole survey project details, summaries, and approvals.</p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'pole_survey_summary' && !selectedUlb && (
          <SummaryView onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}
        
        {activeView === 'pole_survey_summary' && selectedUlb && (
          <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {activeView === 'pole_survey_today' && !selectedUlb && (
          <SummaryView date={new Date().toISOString().split('T')[0]} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}

        {activeView === 'pole_survey_today' && selectedUlb && (
          <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {activeView === 'pole_survey_issues' && (
          <SubmissionQueueView />
        )}
      </div>
      <CreateAdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
