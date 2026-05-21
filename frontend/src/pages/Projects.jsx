import { useState, useEffect } from 'react';
import TopNav from '../components/TopNav';
import { useProjects } from '../shared/hooks/useProjects';
import { Search, FolderKanban, MapPin, Calendar, Clock, Edit, Trash2, X } from 'lucide-react';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { getLocalDateString } from '../shared/utils/date';

export default function Projects() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { data: projects = [], isLoading: loading } = useProjects();

  const [selectedProject, setSelectedProject] = useState(null);
  const [projectView, setProjectView] = useState(null); // 'summary', 'today_summary', 'issues'


  return (
    <div className="app-container">
      <TopNav user={user} />
      

      <main className="main-content">
        {!selectedProject ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Projects & Surveys</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage all government survey projects across regions.</p>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 1, margin: 0, flexDirection: 'row', alignItems: 'center', background: '#f9fafb', padding: '0 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Search size={20} color="var(--text-muted)" />
                <input type="text" placeholder="Search projects by name..." style={{ border: 'none', background: 'transparent', width: '100%', padding: '0.75rem', outline: 'none' }} />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading projects...</div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <FolderKanban size={48} color="var(--border-color)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No projects found</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Get started by creating your first survey project.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {projects.map(project => (
                  <div 
                    key={project.id} 
                    className="card" 
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <button className="btn" style={{ padding: '4px', background: 'transparent', color: 'var(--text-muted)' }}><Edit size={16}/></button>
                      <button className="btn" style={{ padding: '4px', background: 'transparent', color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>
                    
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', paddingRight: '3rem' }}>{project.name}</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="var(--primary-purple)" />
                        <span>Multiple Locations</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="#3b82f6" />
                        <span>Created: {new Date(project.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="var(--primary-green)" />
                        <span style={{ color: 'var(--primary-green)', fontWeight: '500' }}>Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <button 
                className="btn" 
                style={{ padding: '8px 12px' }} 
                onClick={() => {
                  if (projectView) setProjectView(null);
                  else setSelectedProject(null);
                }}
              >
                ← Back
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem' }}>{selectedProject.name}</h1>
                <p style={{ color: 'var(--text-muted)' }}>Select an option to manage or view data.</p>
              </div>
            </div>

            {!projectView ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ cursor: 'pointer' }} onClick={() => setProjectView('summary')}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Summary</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>View overall project summary and details.</p>
                </div>
                <div className="card" style={{ cursor: 'pointer' }} onClick={() => setProjectView('today_summary')}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Today's Summary</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>View summary of data collected today.</p>
                </div>
                <div className="card" style={{ cursor: 'pointer' }} onClick={() => setProjectView('issues')}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Issues</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage and resolve reported issues.</p>
                </div>
                <div className="card" style={{ cursor: 'pointer' }} onClick={() => alert('Download Report flow will be implemented later.')}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Download Report</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Export project data to CSV/Excel.</p>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {projectView === 'summary' && (
                  <SummaryView projectId={selectedProject.id} onViewDetails={(ulb) => console.log('View details for ULB', ulb)} />
                )}
                {projectView === 'today_summary' && (
                  <SummaryView projectId={selectedProject.id} date={getLocalDateString()} onViewDetails={(ulb) => console.log('View details for ULB', ulb)} />
                )}
                {projectView === 'issues' && (
                  <SubmissionQueueView projectId={selectedProject.id} />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
