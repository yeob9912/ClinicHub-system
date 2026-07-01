import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Users, Pill, Store, AlertCircle, Settings, FileText, HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalUsers: number;
  totalPharmacies: number;
  totalMedicines: number;
  pendingApprovals: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPharmacies: 0,
    totalMedicines: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard statistics
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/admin/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: any;
    label: string;
    value: number;
    color: string;
  }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <Icon className={`w-12 h-12 ${color.replace('border', 'text')}`} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, Administrator</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          color="border-blue-500"
        />
        <StatCard
          icon={Store}
          label="Total Pharmacies"
          value={stats.totalPharmacies}
          color="border-green-500"
        />
        <StatCard
          icon={Pill}
          label="Total Medicines"
          value={stats.totalMedicines}
          color="border-purple-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Approvals"
          value={stats.pendingApprovals}
          color="border-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          href="/admin/user-management"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <Users className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="font-semibold text-gray-900">User Management</h3>
          <p className="text-gray-600 text-sm mt-2">Manage users and roles</p>
        </Link>

        <Link
          href="/admin/pharmacy-management"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <Store className="w-8 h-8 text-green-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Pharmacy Management</h3>
          <p className="text-gray-600 text-sm mt-2">Approve and manage pharmacies</p>
        </Link>

        <Link
          href="/admin/medicine-management"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <Pill className="w-8 h-8 text-purple-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Medicine Management</h3>
          <p className="text-gray-600 text-sm mt-2">Manage medicine catalog</p>
        </Link>

        <Link
          href="/admin/reports"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <BarChart3 className="w-8 h-8 text-orange-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Reports</h3>
          <p className="text-gray-600 text-sm mt-2">View analytics and reports</p>
        </Link>
      </div>

      {/* Additional Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/complaints"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Complaints</h3>
          <p className="text-gray-600 text-sm mt-2">Handle user complaints and issues</p>
        </Link>

        <Link
          href="/admin/backups"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <HardDrive className="w-8 h-8 text-indigo-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Backups</h3>
          <p className="text-gray-600 text-sm mt-2">Manage database backups</p>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <Settings className="w-8 h-8 text-gray-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Settings</h3>
          <p className="text-gray-600 text-sm mt-2">System configuration</p>
        </Link>

        <Link
          href="/admin/profile"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <FileText className="w-8 h-8 text-teal-500 mb-4" />
          <h3 className="font-semibold text-gray-900">Admin Profile</h3>
          <p className="text-gray-600 text-sm mt-2">View and edit profile</p>
        </Link>
      </div>
    </div>
  );
}
