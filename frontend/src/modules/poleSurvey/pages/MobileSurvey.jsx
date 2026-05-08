import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SwitchPointForm } from '../components/SwitchPointForm';
import { PoleForm } from '../components/PoleForm';

export default function MobileSurvey() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [view, setView] = useState(null); // 'switch_point' or 'pole'

  const projectId = 2; // Updated to match database id

  const { data: ulbs = [] } = useQuery({
    queryKey: ['ulbs', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://127.0.0.1:3000/api/v1/projects/${projectId}/pole-survey/ulbs/search?q=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.ulbs || [];
    },
    enabled: searchTerm.length >= 2,
  });

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 text-center">Mobile Survey</h1>

      {!selectedUlb ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Enter Taluk / ULB Name</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. CMC RANIBENNURU"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            {ulbs.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                {ulbs.map((ulb) => (
                  <div
                    key={ulb.id}
                    onClick={() => {
                      setSelectedUlb(ulb);
                      setSearchTerm(ulb.name);
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    {ulb.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Selected ULB</p>
              <p className="font-semibold text-gray-900">{selectedUlb.name}</p>
            </div>
            <button
              onClick={() => {
                setSelectedUlb(null);
                setSearchTerm('');
                setView(null);
              }}
              className="text-xs text-primary font-medium"
            >
              Change
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setView('switch_point')}
              className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${
                view === 'switch_point'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <span className="text-sm font-medium">Create Switch Point</span>
            </button>
            <button
              onClick={() => setView('pole')}
              className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${
                view === 'pole'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <span className="text-sm font-medium">Pole Details</span>
            </button>
          </div>
        </div>
      )}

      {view === 'switch_point' && selectedUlb && (
        <SwitchPointForm ulb={selectedUlb} onBack={() => setView(null)} />
      )}

      {view === 'pole' && selectedUlb && (
        <PoleForm ulb={selectedUlb} onBack={() => setView(null)} />
      )}
    </div>
  );
}
