import { useState, useEffect } from 'react';
import { offlineDb } from '../../../db/offlineDb';
import { offlineSyncService } from '../services/offlineSyncService';
import { RefreshCw, Trash2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export const OfflineQueueView = () => {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const all = await offlineDb.submissions.orderBy('createdAt').reverse().toArray();
      setSubmissions(all);
    } catch (err) {
      console.error('Failed to fetch offline submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubmissions();
    }, 0);
    
    // Refresh list when sync happens
    const interval = setInterval(fetchSubmissions, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await offlineSyncService.sync();
    await fetchSubmissions();
    setIsSyncing(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this offline submission?')) {
      await offlineDb.submissions.delete(id);
      await fetchSubmissions();
    }
  };

  if (isLoading && submissions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary/50" />
        <p>Loading offline queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div>
          <h3 className="font-semibold text-blue-900">Offline Queue</h3>
          <p className="text-xs text-blue-700">
            {submissions.length} items waiting for internet connection.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing || !navigator.onLine || submissions.length === 0}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {!navigator.onLine && submissions.length > 0 && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-md text-xs border border-amber-100">
          <Clock size={14} />
          <span>You are currently offline. Submissions will upload automatically when you get signal.</span>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No pending submissions</p>
          <p className="text-gray-400 text-sm mt-1">Everything is synced to the server.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isInstallation = sub.data?.survey_type === 'installation';
            const badgeText = isInstallation 
              ? 'INSTALLATION' 
              : (sub.type === 'pole' ? 'SURVEY POLE' : 'SWITCH POINT');
            const badgeClass = isInstallation
              ? 'bg-orange-100 text-orange-700'
              : (sub.type === 'pole' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700');
            
            const displayTitle = isInstallation
              ? `Ward ${sub.wardNumber} - CCMS ${sub.data?.ccms_number || 'N/A'} (Pole ${sub.data?.pole_number || 'N/A'})`
              : (sub.type === 'pole' 
                  ? `Ward ${sub.wardNumber} - Pole ${sub.data?.pole_number || 'N/A'}` 
                  : `Ward ${sub.wardNumber} - Switch Point ${sub.data?.switch_point_number || 'N/A'}`);

            return (
              <div key={sub.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeClass}`}>
                      {badgeText}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(sub.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {displayTitle}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{sub.images.length} Photos</span>
                    {sub.status === 'failed' && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {sub.errorMessage || 'Failed'}
                      </span>
                    )}
                    {sub.status === 'syncing' && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin" />
                        Uploading...
                      </span>
                    )}
                    {sub.status === 'pending' && (
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <Clock size={12} />
                        Waiting
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
