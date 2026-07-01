export default function AdminBackupsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-xl font-black text-white">Backups</h1>
        <p className="mt-1 text-sm text-slate-300">Backup and maintain the database.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
          <p className="text-sm font-bold text-white">Run Full Backup</p>
          <p className="mt-1 text-xs text-slate-400">Create a complete database snapshot.</p>
        </button>
        <button className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
          <p className="text-sm font-bold text-white">Run Integrity Check</p>
          <p className="mt-1 text-xs text-slate-400">Validate database consistency and health.</p>
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent backup jobs</p>
        <div className="mt-3 space-y-2 text-sm text-slate-200">
          <p>Nightly backup - Completed - 02:00 AM</p>
          <p>Manual export - Completed - Yesterday</p>
          <p>Integrity scan - Completed - 2 days ago</p>
        </div>
      </div>
    </div>
  );
}
