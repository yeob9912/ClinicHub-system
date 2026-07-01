export default function AdminReportsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-xl font-black text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-300">View platform analytics and operational insights.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Monthly users", value: "24,592" },
          { label: "Active pharmacies", value: "1,208" },
          { label: "Medicine entries", value: "8,941" },
          { label: "Resolution rate", value: "81%" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-1 text-lg font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
