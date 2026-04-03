import React, { useState, useEffect } from 'react';

// 1. Define the TypeScript types for your props
type EditCourseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  course: any; 
  onSave: (courseId: string, updatedData: any) => void;
};

// 2. Apply the types to the component
export default function EditCourseModal({ isOpen, onClose, course, onSave }: EditCourseModalProps) {
  const [formData, setFormData] = useState({ name: '', code: '', startDate: '', endDate: '' });

  // Pre-fill the form whenever the selected course changes
  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || '',
        code: course.code || '',
        // Format dates to YYYY-MM-DD for HTML date inputs
        startDate: course.startDate ? course.startDate.split('T')[0] : '',
        endDate: course.endDate ? course.endDate.split('T')[0] : ''
      });
    }
  }, [course]);

  if (!isOpen) return null;

  // 3. Add TypeScript event type for input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. Add TypeScript event type for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(course._id, formData); // Pass the ID and new data back to the parent
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Edit Course</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Course Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Course Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded p-2 text-sm"
                required
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded p-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}