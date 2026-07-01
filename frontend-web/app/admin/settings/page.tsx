export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-xl font-black text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-300">Configure admin and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">System</p>
          <p className="mt-2 text-sm text-white">Maintenance mode, alert preferences, default rules.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Security</p>
          <p className="mt-2 text-sm text-white">Admin roles, authentication policies, and access control.</p>
        </div>
      </div>
    </div>
  );
}
