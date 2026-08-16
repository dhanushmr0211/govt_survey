export function CcmsInspectModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Inspect CCMS Point</h3>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Close</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">CCMS Number</p>
            <p className="font-semibold text-slate-900">{item.ccms_number || item.identifier || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Ward</p>
            <p className="font-semibold text-slate-900">{item.ward_name || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">DTC Number</p>
            <p className="font-semibold text-slate-900">{item.dtc_number || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">DTC Capacity</p>
            <p className="font-semibold text-slate-900">{item.dtc_capacity || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Submitted By</p>
            <p className="font-semibold text-slate-900">{item.user_name || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Submitted At</p>
            <p className="font-semibold text-slate-900">{item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
