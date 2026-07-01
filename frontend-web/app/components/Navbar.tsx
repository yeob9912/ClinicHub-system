import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-10 py-4 bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Left: Logo and Links */}
      <div className="flex items-center gap-10">
        <div className="text-xl font-black text-blue-600 tracking-tighter">pharamaManage</div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-semibold text-gray-400 hover:text-blue-600 transition">Home</Link>
          <Link href="/catalog" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Catalog</Link>
          <Link href="/support" className="text-sm font-semibold text-gray-400 hover:text-blue-600 transition">Support</Link>
        </div>
      </div>

      {/* Right: Search and Profile */}
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative hidden lg:block">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input 
            type="text" 
            placeholder="Search medicines..." 
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs outline-none focus:border-blue-300 w-64"
          />
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4 text-gray-400">
          <button className="hover:text-blue-600">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <div className="w-8 h-8 bg-gray-200 rounded-full border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500">
            JD
          </div>
        </div>
      </div>
    </nav>
  );
}