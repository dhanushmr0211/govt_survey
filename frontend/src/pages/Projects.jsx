import { useState, useEffect } from 'react';
import TopNav from '../components/TopNav';
import { Plus, Search, FolderKanban, MapPin, Calendar, Clock, Edit, Trash2, X } from 'lucide-react';

export default function Projects() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:3000/api/v1/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      // project route returns { projects: [...] }
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:3000/api/v1/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newProjectName })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setNewProjectName('');
        fetchProjects(); // Refresh the list
      } else {
        alert("Error creating project: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    }
  };

  return (
    <div className="app-container">
      <TopNav user={user} />
      
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Create New Project</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="input-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Highway 44 Expansion" 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>Create Project</button>
            </form>
          </div>
        </div>
      )}

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Projects & Surveys</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage all government survey projects across regions.</p>
          </div>
          {user.role !== 'EMPLOYEE' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> New Project</button>
          )}
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
            {user.role !== 'EMPLOYEE' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Create Project</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {projects.map(project => (
              <div key={project.id} className="card" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '8px' }}>
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
                    <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
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
      </main>
    </div>
  )
}
