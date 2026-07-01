export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 px-10 py-12 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
        <div className="max-w-xs">
          <div className="text-lg font-black text-gray-900 mb-4">MedPay</div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Precision healthcare and fintech solutions for a healthier world.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <a href="#" className="text-[11px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider">How It Works</a>
          <a href="#" className="text-[11px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider">Pharmacy Partners</a>
          <a href="#" className="text-[11px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider">Privacy Policy</a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-50 text-[10px] text-gray-300 font-medium">
        © 2026 MedPay Healthcare. Secured by FinTech Precision.
      </div>
    </footer>
  );
}