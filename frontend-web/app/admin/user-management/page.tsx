"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, SlidersHorizontal, UserPlus, Search, Edit, Trash2, Shield, UserX, UserCheck, Eye, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest } from "@/lib/api";

const roleMapToUI: Record<string, string> = {
  admin: "Admin",
  pharmacy_staff: "Staff",
  patient: "User",
};

const roleMapToDB: Record<string, string> = {
  Admin: "admin",
  Staff: "pharmacy_staff",
  User: "patient",
};

const springTransition = { type: "spring", stiffness: 380, damping: 28 };
const smoothEaseInOut = { ease: [0.4, 0, 0.2, 1], duration: 0.25 };

export default function UserManagementHub() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [selectedRestrictionFilter, setSelectedRestrictionFilter] = useState("All");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState({
    name: "",
    email: "",
    phone: "",
    role: "User",
    status: "Active",
    restriction: "Unblocked",
    joined: "2026-06-02"
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/api/v1/admin/users?limit=100", { auth: true });
      const usersList = Array.isArray(data) ? data : (data?.data ?? []);
      setUsers(usersList.map((u: any) => ({
        id: u._id,
        name: u.full_name,
        email: u.email,
        phone: u.phone || "",
        role: roleMapToUI[u.role] || u.role,
        status: u.is_active ? "Active" : "Inactive",
        restriction: u.is_active ? "Unblocked" : "Blocked",
        joined: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : "N/A",
        avatarUrl: u.avatar_url || null,
      })));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- Core Feature Triggers ---
  const handleOpenAddForm = () => {
    setEditingUserId(null);
    setFormFields({ name: "", email: "", phone: "", role: "User", status: "Active", restriction: "Unblocked", joined: new Date().toISOString().split('T')[0] });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (e: React.MouseEvent, user: any) => {
    e.stopPropagation(); 
    setEditingUserId(user.id);
    setFormFields({ ...user });
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (confirm("Are you sure you want to deactivate this user?")) {
      try {
        await apiRequest<any>(`/api/v1/admin/users/${id}`, {
          method: "PATCH",
          auth: true,
          body: JSON.stringify({ is_active: false })
        });
        await fetchUsers();
        if (selectedUserDetails?.id === id) {
          setSelectedUserDetails(null);
        }
      } catch (err: any) {
        alert(err.message || "Failed to deactivate user");
      }
    }
  };

  const toggleToggleStatus = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = users.find(u => u.id === id);
    if (!target) return;
    const nextStatus = target.status === "Active" ? false : true;
    try {
      await apiRequest<any>(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ is_active: nextStatus })
      });
      await fetchUsers();
      if (selectedUserDetails?.id === id) {
        setSelectedUserDetails((prev: any) => prev ? { ...prev, status: nextStatus ? "Active" : "Inactive", restriction: nextStatus ? "Unblocked" : "Blocked" } : null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const toggleBlockUser = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = users.find(u => u.id === id);
    if (!target) return;
    const nextActive = target.restriction === "Blocked" ? true : false;
    try {
      await apiRequest<any>(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ is_active: nextActive })
      });
      await fetchUsers();
      if (selectedUserDetails?.id === id) {
        setSelectedUserDetails((prev: any) => prev ? { ...prev, status: nextActive ? "Active" : "Inactive", restriction: nextActive ? "Unblocked" : "Blocked" } : null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update block state");
    }
  };

  const toggleUserRole = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = users.find(u => u.id === id);
    if (!target) return;
    const nextRoleDB = target.role === "Admin" ? "patient" : target.role === "Staff" ? "admin" : "pharmacy_staff";
    try {
      await apiRequest<any>(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ role: nextRoleDB })
      });
      await fetchUsers();
      if (selectedUserDetails?.id === id) {
        setSelectedUserDetails((prev: any) => prev ? { ...prev, role: roleMapToUI[nextRoleDB] || nextRoleDB } : null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update user role");
    }
  };

  const formatToE164 = (phone: string) => {
    let cleaned = phone.replace(/[\s\-\(\)]+/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "+251" + cleaned.substring(1);
    } else if (/^[79]\d{8}$/.test(cleaned)) {
      cleaned = "+251" + cleaned;
    } else if (!cleaned.startsWith("+") && cleaned.length > 0) {
      cleaned = "+" + cleaned;
    }
    return cleaned;
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const dbRole = roleMapToDB[formFields.role] || "patient";
    const nextActive = formFields.status === "Active" && formFields.restriction === "Unblocked";

    try {
      if (editingUserId) {
        await apiRequest<any>(`/api/v1/admin/users/${editingUserId}`, {
          method: "PATCH",
          auth: true,
          body: JSON.stringify({
            role: dbRole,
            is_active: nextActive
          })
        });
        if (selectedUserDetails?.id === editingUserId) {
          setSelectedUserDetails({ id: editingUserId, ...formFields });
        }
      } else {
        const formattedPhone = formatToE164(formFields.phone);
        if (!/^\+251[79]\d{8}$/.test(formattedPhone)) {
          throw new Error("Phone number must be a valid Ethiopian format starting with 09, 07, 9, 7 or +251");
        }
        
        // Register new user: uses standard registration
        const regRes = await apiRequest<any>("/api/v1/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: formFields.email,
            full_name: formFields.name,
            phone: formattedPhone,
            password: "Password123!",
            role: "patient" // register as patient, promote after
          })
        });

        // Promote role & status if needed
        if (regRes && regRes._id) {
          await apiRequest<any>(`/api/v1/admin/users/${regRes._id}`, {
            method: "PATCH",
            auth: true,
            body: JSON.stringify({
              role: dbRole,
              is_active: nextActive
            })
          });
        }
      }
      setIsFormOpen(false);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to save user registry");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRoleFilter === "All" || u.role === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === "All" || u.status === selectedStatusFilter;
    const matchesRestriction = selectedRestrictionFilter === "All" || u.restriction === selectedRestrictionFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesRestriction;
  });

  return (
    <div className="min-h-screen bg-[#edf4f9] text-[#334155] p-3 sm:p-6 font-sans antialiased overflow-y-auto selection:bg-[#cbdbe5]/60">
      <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        
        {/* --- Header Section --- */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#e2eaf1]"
        >
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0f2d4a] uppercase text-center lg:text-left">
            Identity Control Hub
          </h1>
          
          <div className="flex flex-col sm:flex-row flex-1 max-w-2xl items-stretch sm:items-center gap-2 lg:justify-end w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search users by name or email entry..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#cbdbe5] rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-[#42a3cf] focus:ring-4 focus:ring-[#42a3cf]/10 text-slate-700"
              />
            </div>
          </div>
        </motion.div>

        {/* --- Quick Analytics --- */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            { label: "Total Registries", value: users.length, icon: "👥", color: "bg-[#e0f2fe] text-[#0369a1]" },
            { label: "Administrative Roles", value: users.filter(u => u.role === "Admin").length, icon: "🛡️", color: "bg-[#f0fdf4] text-[#16a34a]" },
            { label: "Deactivated States", value: users.filter(u => u.status === "Inactive").length, icon: "💤", color: "bg-[#fff8e1] text-[#b76e00]" },
            { label: "Blocked Violations", value: users.filter(u => u.restriction === "Blocked").length, icon: "🚫", color: "bg-[#fee2e2] text-[#dc2626]" }
          ].map((card, idx) => (
            <motion.div 
              key={idx}
              variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={springTransition}
              whileHover={{ y: -4 }}
              className="bg-white p-4 rounded-xl border border-[#e2eaf1] flex items-center gap-4 shadow-sm"
            >
              <div className={`p-3 rounded-lg font-bold text-lg shrink-0 ${card.color}`}>{card.icon}</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                <h3 className="text-xl sm:text-2xl font-black text-[#0f2d4a]">{card.value}</h3>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* --- Top Action Strip --- */}
        <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 relative z-20">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-1.5 bg-[#2a9d8f] hover:bg-[#227c71] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all duration-200"
          >
            <UserPlus className="w-3.5 h-3.5" /> Provision New User
          </motion.button>
          
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center justify-center gap-1 bg-white border border-[#cbdbe5] hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm w-full"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-500" /> Filter Criteria <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-300 ${showFilterDropdown ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={smoothEaseInOut}
                  className="absolute right-0 mt-1.5 w-full sm:w-60 bg-white border border-[#cbdbe5] rounded-xl shadow-xl p-4 text-xs text-slate-700 space-y-3 z-30"
                >
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Functional Target Role</label>
                    <select 
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-1.5 outline-none font-semibold text-slate-700"
                    >
                      <option value="All">All Global Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Lifecycle Status</label>
                    <select 
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-1.5 outline-none font-semibold text-slate-700"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Restriction Type</label>
                    <select 
                      value={selectedRestrictionFilter}
                      onChange={(e) => setSelectedRestrictionFilter(e.target.value)}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-1.5 outline-none font-semibold text-slate-700"
                    >
                      <option value="All">All Restrictions</option>
                      <option value="Unblocked">Unblocked</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Main Datagrid Container --- */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 items-start relative z-10">
          <div className="space-y-4 w-full overflow-hidden">
            <div className="bg-white rounded-xl shadow-sm border border-[#e2eaf1] overflow-hidden">
              
              {/* Table Column Headers Frame (5 Equally Spaced Columns) */}
              <div className="bg-[#f1f6fa] border-b border-[#e2eaf1] p-3 hidden md:grid grid-cols-5 text-xs font-bold text-[#475569] uppercase tracking-wider items-center gap-4 select-none">
                <div>User Identity Profile</div>
                <div className="text-center">Role State</div>
                <div className="text-center">Lifecycle Status</div>
                <div className="text-center">Restriction Type</div>
                <div className="text-right pr-2">Control Matrix Actions</div>
              </div>

              {/* Dynamic Responsive User Data Loop */}
              <motion.div layout className="divide-y divide-[#f1f6fa]">
                <AnimatePresence initial={false}>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
                      <Loader2 className="animate-spin text-[#2a9d8f]" size={24} />
                      <span>Loading platform users...</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">No user matches calculated parameters.</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <motion.div 
                        key={user.id} 
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={springTransition}
                        onClick={() => setSelectedUserDetails(user)}
                        className="p-4 md:p-3 grid grid-cols-1 md:grid-cols-5 text-xs items-stretch md:items-center transition-all cursor-pointer hover:bg-[#e3f2fd]/40 gap-2.5 md:gap-4 relative"
                      >
                        {/* Column 1: Identity Block */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Avatar */}
                          <div className="shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#cbdbe5]" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#24D2A6] to-[#1eb08b] flex items-center justify-center text-white font-black text-sm border border-[#1eb08b]/20">
                                {user.name?.trim()[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Identity Profile</span>
                            <span className="font-bold text-slate-800 text-sm md:text-xs truncate block">{user.name}</span>
                            <span className="text-slate-400 block font-mono text-[11px] md:text-xs truncate">{user.email}</span>
                            {user.phone && <span className="text-slate-500 block font-mono text-[10px] md:text-[11px] truncate mt-0.5">📞 {user.phone}</span>}
                          </div>
                        </div>
                        
                        {/* Column 2: Role State */}
                        <div className="flex flex-col md:block md:text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Role State</span>
                          <div>
                            <span className={`inline-block font-bold px-2 py-0.5 rounded-md text-[10px] ${user.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                        
                        {/* Column 3: Lifecycle Status */}
                        <div className="flex flex-col md:block md:text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Lifecycle Status</span>
                          <div>
                            <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${user.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                        
                        {/* Column 4: Restriction Type */}
                        <div className="flex flex-col md:block md:text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Restriction Type</span>
                          <div>
                            <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${user.restriction === "Unblocked" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                              {user.restriction}
                            </span>
                          </div>
                        </div>
                        
                        {/* Column 5: Control Actions Matrix */}
                        <div className="flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 pt-2.5 md:pt-0 border-t md:border-none border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden tracking-wider">Control Actions</span>
                          <div className="flex items-center gap-1 md:gap-1.5 flex-wrap md:justify-end">
                            
                            {/* View Action */}
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); setSelectedUserDetails(user); }}
                              className="p-1.5 text-slate-600 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200"
                              title="View Detailed Specs"
                            >
                              <Eye className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>

                            {/* Toggle Role State (Admin <-> User) */}
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => toggleUserRole(e, user.id)}
                              className="p-1.5 text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                              title="Switch Authority Matrix Role"
                            >
                              <Shield className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>

                            {/* Activate/Deactivate Toggle */}
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => toggleToggleStatus(e, user.id)}
                              className={`p-1.5 rounded-md border ${user.status === 'Active' ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
                              title={user.status === "Active" ? "Deactivate User Node" : "Activate User Node"}
                            >
                              <UserCheck className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>

                            {/* Block/Unblock Toggle */}
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => toggleBlockUser(e, user.id)}
                              className={`p-1.5 rounded-md border ${user.restriction === 'Blocked' ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100'}`}
                              title={user.restriction === "Blocked" ? "Release Block Restrictions" : "Enforce Block Restriction"}
                            >
                              <UserX className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>

                            {/* Edit Action */}
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => handleOpenEditForm(e, user)}
                              className="p-1.5 text-[#2196f3] bg-[#e3f2fd] border border-[#bbdefb] rounded-md hover:bg-[#cbe3f7]"
                              title="Edit Registry Entry"
                            >
                              <Edit className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>

                            {/* Delete Action */}
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => handleDeleteUser(e, user.id)}
                              className="p-1.5 text-[#ef5350] bg-[#ffebee] border border-[#ffcdd2] rounded-md hover:bg-[#f9d2d6]"
                              title="Delete Record Block"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </motion.div>

            </div>
          </div>
        </div>

      </div>

      {/* --- OVERLAY SHEET: View User Details --- */}
      <AnimatePresence>
        {selectedUserDetails && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {selectedUserDetails.avatarUrl ? (
                      <img src={selectedUserDetails.avatarUrl} alt={selectedUserDetails.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-[#24D2A6]/30 shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#24D2A6] to-[#1eb08b] flex items-center justify-center text-white font-black text-2xl shadow-md">
                        {selectedUserDetails.name?.trim()[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2a9d8f] bg-[#2a9d8f]/10 px-3 py-1 rounded-full">
                      User Profile
                    </span>
                    <h4 className="text-xl font-black text-[#0f2d4a] mt-1.5">{selectedUserDetails.name}</h4>
                    <p className="font-mono text-slate-400 text-xs mt-0.5">{selectedUserDetails.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                    selectedUserDetails.role === 'Admin' ? 'bg-purple-50 text-purple-600 border-purple-100'
                    : selectedUserDetails.role === 'Staff' ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>{selectedUserDetails.role}</span>
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={() => setSelectedUserDetails(null)}
                    className="text-slate-400 hover:text-slate-700 bg-white w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">

                {/* Contact Info */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Information</h5>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 font-mono truncate">{selectedUserDetails.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{selectedUserDetails.phone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</h5>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Authority Role</p>
                      <p className="font-bold text-slate-800 mt-1">{selectedUserDetails.role}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Lifecycle Status</p>
                      <span className={`inline-block font-bold px-2 py-0.5 rounded-full text-[10px] mt-1 ${
                        selectedUserDetails.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{selectedUserDetails.status}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Restriction State</p>
                      <span className={`inline-block font-bold px-2 py-0.5 rounded-full text-[10px] mt-1 ${
                        selectedUserDetails.restriction === 'Unblocked' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                      }`}>{selectedUserDetails.restriction}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Member Since</p>
                      <p className="font-mono font-bold text-slate-700 mt-1">{selectedUserDetails.joined}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer actions */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => toggleUserRole(e, selectedUserDetails.id)}
                    className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 font-black rounded-xl text-[11px] uppercase tracking-wider hover:bg-purple-100 transition-colors"
                  >
                    Flip Role
                  </button>
                  <button
                    onClick={(e) => toggleToggleStatus(e, selectedUserDetails.id)}
                    className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 font-black rounded-xl text-[11px] uppercase tracking-wider hover:bg-amber-100 transition-colors"
                  >
                    Toggle Status
                  </button>
                </div>
                <button
                  onClick={() => setSelectedUserDetails(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FORM MODAL: Create / Edit User Parameters --- */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 30 }}
              transition={springTransition}
              className="bg-white border border-[#cbdbe5] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[95vh] flex flex-col"
            >
              <div className="bg-[#f1f6fa] border-b border-[#e2eaf1] p-4 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-black text-[#0f2d4a] uppercase tracking-wide">
                  {editingUserId ? "Modify Configuration Registry" : "Initialize Identity Spec Token"}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveForm} className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Full Legal/Display Identity Name</label>
                  <input 
                    type="text" required disabled={!!editingUserId} value={formFields.name}
                    onChange={(e) => setFormFields({...formFields, name: e.target.value})}
                    placeholder="e.g., Jonathan Mercer"
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf] focus:ring-2 focus:ring-[#42a3cf]/10 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Communications Routing Email Endpoint</label>
                  <input 
                    type="email" required disabled={!!editingUserId} value={formFields.email}
                    onChange={(e) => setFormFields({...formFields, email: e.target.value})}
                    placeholder="e.g., j.mercer@enterprise.com"
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Phone Number (Ethiopian)</label>
                  <input 
                    type="tel" required={!editingUserId} disabled={!!editingUserId} value={formFields.phone}
                    onChange={(e) => setFormFields({...formFields, phone: e.target.value})}
                    placeholder="e.g., 0911223344 or +251911223344"
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {editingUserId && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">Profile details cannot be modified by administrators.</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Authority Role</label>
                    <select 
                      value={formFields.role}
                      onChange={(e) => setFormFields({...formFields, role: e.target.value})}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2 focus:outline-none focus:border-[#42a3cf]"
                    >
                      <option value="User">User</option>
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Status state</label>
                    <select 
                      value={formFields.status}
                      onChange={(e) => setFormFields({...formFields, status: e.target.value})}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2 focus:outline-none focus:border-[#42a3cf]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Restriction Matrix</label>
                    <select 
                      value={formFields.restriction}
                      onChange={(e) => setFormFields({...formFields, restriction: e.target.value})}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2 focus:outline-none focus:border-[#42a3cf]"
                    >
                      <option value="Unblocked">Unblocked</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#cbdbe5] flex justify-end gap-2 shrink-0">
                  <button 
                    type="button" onClick={() => setIsFormOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-slate-600 transition-colors"
                  >
                    Abort Changes
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#2a9d8f] hover:bg-[#227c71] text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-colors"
                  >
                    Commit Token
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}