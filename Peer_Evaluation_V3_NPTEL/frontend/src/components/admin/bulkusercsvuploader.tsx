import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import axios from 'axios';

type CSVUploaderProps = {
  currentPalette: any;
  token: string | null;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
};

export default function CSVUploader({ currentPalette, token, onSuccess, showToast }: CSVUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  
  // 1. React DOM ref for safely clearing the input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      showToast("Please upload a valid .csv file", "error");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // 2. The Header Fix: Automatically lowercase and trim all column headers
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        const data = results.data as any[];
        
        if (data.length > 0) {
          const keys = Object.keys(data[0]);
          if (!keys.includes('name') || !keys.includes('email') || !keys.includes('role')) {
            showToast("CSV must contain 'name', 'email', and 'role' columns.", "error");
            setPreview([]);
            return;
          }
        }
        
        // 3. Pass data directly, no manual fallback mapping required
        setPreview(data);
      },
      error: (error) => {
        showToast(`Error reading file: ${error.message}`, 'error');
      }
    });
  };

  const handleImport = async () => {
    if (preview.length === 0 || !token) return;

    setIsUploading(true);
    try {
      const response = await axios.post(
        `http://localhost:${PORT}/api/admin/users/bulk`,
        { users: preview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Handle the 207 Partial Success status
      if (response.status === 207) {
         showToast(response.data.message, 'error');
         console.log("Skipped emails:", response.data.skipped);
         console.log("Invite email failures:", response.data.inviteFailed);
      } else {
         showToast(response.data.message, 'success');
      }
      
      setPreview([]); 
      onSuccess(); 
      
      // 4. Safely clear the input using the ref
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data?.message || "Failed to upload users.";
      showToast(serverMsg, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="p-6 rounded-xl border w-full mt-8"
      style={{
        backgroundColor: currentPalette['bg-secondary'],
        borderColor: currentPalette['border-soft'],
        boxShadow: `0 8px 20px ${currentPalette['shadow-medium']}`,
      }}
    >
      <h3 className="text-xl font-bold mb-2" style={{ color: currentPalette['text-dark'] }}>
        Bulk Invite Users
      </h3>
      <p className="text-sm mb-6" style={{ color: currentPalette['text-muted'] }}>
        Upload a CSV file. It <strong>must</strong> have headers for: <code>name</code>, <code>email</code>, and <code>role</code>.
        Valid roles are <em>student, teacher, admin</em>. New users will receive a one-time invite email to set their password.
        Re-uploading a pending invite will send a fresh invite link.
      </p>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
        {/* Attach the ref here */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100 cursor-pointer"
          style={{ color: currentPalette['text-dark'] }}
        />
        <button
          onClick={handleImport}
          disabled={preview.length === 0 || isUploading}
          className={`whitespace-nowrap px-6 py-2 rounded-lg font-semibold shadow-md transition-transform ${preview.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          style={{ backgroundColor: currentPalette['accent-purple'], color: 'white' }}
        >
          {isUploading ? 'Sending Invites...' : 'Send Invites'}
        </button>
      </div>

      {/* Real-time Preview */}
      {preview.length > 0 && (
        <div className="mt-4 border rounded-lg p-4 overflow-hidden" style={{ borderColor: currentPalette['border-soft'], backgroundColor: currentPalette['bg-primary'] }}>
          <p className="text-sm font-semibold mb-3" style={{ color: currentPalette['text-dark'] }}>
            Previewing {preview.length} rows:
          </p>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-opacity-90 backdrop-blur-sm" style={{ backgroundColor: currentPalette['bg-primary'], color: currentPalette['text-muted'] }}>
                <tr>
                  <th className="py-2 px-2 border-b">Name</th>
                  <th className="py-2 px-2 border-b">Email</th>
                  <th className="py-2 px-2 border-b">Role</th>
                </tr>
              </thead>
              <tbody style={{ color: currentPalette['text-dark'] }}>
                {preview.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0" style={{ borderColor: currentPalette['border-soft'] }}>
                    <td className="py-2 px-2">{row.name}</td>
                    <td className="py-2 px-2">{row.email}</td>
                    <td className="py-2 px-2">{row.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="text-center text-xs mt-3 italic" style={{ color: currentPalette['text-muted'] }}>
                ...and {preview.length - 10} more rows.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
