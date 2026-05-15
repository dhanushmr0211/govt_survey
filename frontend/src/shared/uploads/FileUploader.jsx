import { useState } from 'react';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';

export const FileUploader = ({ onUpload }) => {
  const [files, setFiles] = useState([]);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const mappedFiles = newFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    const updated = [...files, ...mappedFiles];
    setFiles(updated);
    // Pass real File objects to parent (PoleForm will upload them on submit)
    onUpload(updated.map((f) => f.file));
  };

  const removeFile = (id) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    onUpload(updated.map((f) => f.file));
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
        <Upload className="mx-auto text-gray-400 mb-2" size={32} />
        <p className="text-sm text-gray-600">Drag & drop files here, or click to select</p>
        <p className="text-xs text-gray-400 mt-1">Supports images, PDFs, etc.</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded flex items-center justify-center">
                {f.preview ? (
                  <img src={f.preview} alt="preview" className="w-full h-full object-cover rounded" />
                ) : (
                  <File className="text-gray-400" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.file.name}</p>
                <p className="text-xs text-gray-500">{(f.file.size / 1024).toFixed(1)} KB</p>
                
                {f.status === 'uploading' && (
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${f.progress}%` }}></div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {f.status === 'pending' && <span className="text-xs text-green-600 font-medium">Ready</span>}
                <button onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
