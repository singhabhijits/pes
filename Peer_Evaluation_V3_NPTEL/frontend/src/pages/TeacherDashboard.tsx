import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiHome, FiKey, FiLogOut, FiShield, FiUser } from 'react-icons/fi';
import TeacherHome from '../components/teacher/TeacherHome';
import ManageRoles from '../components/teacher/ManageRoles';
import TeacherCourses from '../components/teacher/TeacherCourses';
import ChangePassword from '../components/teacher/ChangePassword';

type SectionKey = 'home' | 'roles' | 'courses';

type TeacherProfile = {
  name?: string;
  email?: string;
  role?: string;
};

const sections: Record<SectionKey, { label: string; icon: JSX.Element; content: JSX.Element }> = {
  home: {
    label: 'Home',
    icon: <FiHome className="text-lg" />,
    content: <TeacherHome />,
  },
  roles: {
    label: 'Manage Roles',
    icon: <FiShield className="text-lg" />,
    content: <ManageRoles />,
  },
  courses: {
    label: 'Courses',
    icon: <FiBook className="text-lg" />,
    content: <TeacherCourses />,
  },
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionKey>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>({});

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:5000/api/dashboard/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load profile');
        }

        return response.json();
      })
      .then((data) => setProfile(data))
      .catch((error) => {
        console.error('Failed to load teacher profile', error);
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#fff8ef] text-[#4b0082]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full rounded-[28px] bg-[#efe7ff] p-5 shadow-[0_16px_40px_rgba(75,0,130,0.08)] lg:w-72">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.25em] text-[#7b5ca7]">Teacher Panel</p>
            <h1 className="mt-2 text-2xl font-bold">Peer Evaluation</h1>
          </div>

          <nav className="space-y-3">
            {(Object.entries(sections) as [SectionKey, (typeof sections)[SectionKey]][]).map(([key, section]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  activeSection === key
                    ? 'bg-white shadow-[0_10px_30px_rgba(75,0,130,0.12)]'
                    : 'hover:bg-white/70'
                }`}
              >
                {section.icon}
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 space-y-3 border-t border-white/70 pt-5">
            <button
              type="button"
              onClick={() => setShowProfile((current) => !current)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-white/70"
            >
              <FiUser className="text-lg" />
              <span className="font-medium">Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-white/70"
            >
              <FiKey className="text-lg" />
              <span className="font-medium">Change Password</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-red-600 hover:bg-red-50"
            >
              <FiLogOut className="text-lg" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 rounded-[32px] bg-white p-6 shadow-[0_16px_40px_rgba(75,0,130,0.08)]">
          {showProfile && (
            <div className="mb-6 rounded-3xl border border-[#efe2ff] bg-[#fffaf2] p-5">
              <h2 className="text-lg font-semibold">Profile</h2>
              <p className="mt-3 text-sm text-[#7b5ca7]">Name: {profile.name || 'Unavailable'}</p>
              <p className="mt-1 text-sm text-[#7b5ca7]">Email: {profile.email || 'Unavailable'}</p>
              <p className="mt-1 text-sm text-[#7b5ca7]">Role: {profile.role || 'Teacher'}</p>
            </div>
          )}

          {sections[activeSection].content}
        </main>
      </div>

      {showPasswordModal && <ChangePassword onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
