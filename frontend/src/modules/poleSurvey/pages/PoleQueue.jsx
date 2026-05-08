import { useQuery } from '@tanstack/react-query';
import { getPoles } from '../services/poleSurveyService';
import { DataTable } from '../../../shared/tables/DataTable';
import { useState } from 'react';
import { PoleInspectModal } from '../components/PoleInspectModal';

export default function PoleQueue() {
  const projectId = 1; // Hardcoded for now, should be dynamic
  const [selectedPole, setSelectedPole] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['poles', projectId],
    queryFn: () => getPoles(projectId, 'PENDING'),
  });

  const columns = [
    { key: 'pole_number', label: 'Pole Number' },
    { key: 'ward_number', label: 'Ward' },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <button
          onClick={() => setSelectedPole(row)}
          className="bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary-dark transition-colors"
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pole Survey Queue</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <DataTable
          columns={columns}
          data={data?.poles || []}
          isLoading={isLoading}
          emptyMessage="No pending poles to inspect."
        />
      </div>

      {selectedPole && (
        <PoleInspectModal
          pole={selectedPole}
          onClose={() => setSelectedPole(null)}
          onSuccess={() => {
            setSelectedPole(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
