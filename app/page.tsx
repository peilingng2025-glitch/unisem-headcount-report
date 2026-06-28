import Link from "next/link";
import { FileSpreadsheet, Eye } from "lucide-react";

const NAVY  = "#1a2035";
const BRAND = "#800000";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header style={{ background: NAVY }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-9 rounded-full" style={{ background: BRAND }} />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Headcount Report System</h1>
              <p className="text-sm font-medium" style={{ color: "#a8b8d8" }}>Unisem Group &nbsp;|&nbsp; HR People Analytics</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">What would you like to do?</h2>
          <p className="text-base font-medium text-gray-600">Weekly headcount reporting for Unisem Group</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Generate New Report */}
          <Link href="/generate" className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden" style={{ borderTop: `4px solid ${BRAND}` }}>
            <div className="p-8 flex flex-col gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#fdf2f2" }}>
                <FileSpreadsheet size={28} style={{ color: BRAND }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Generate New Report</h3>
                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                  Upload HRMS export files, process the data, and generate this week&apos;s headcount report. Then publish it for management to view.
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: BRAND }}>
                Upload files →
              </span>
            </div>
          </Link>

          {/* View Published Report */}
          <Link href="/published" className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden" style={{ borderTop: `4px solid #1a6b35` }}>
            <div className="p-8 flex flex-col gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#f0fdf4" }}>
                <Eye size={28} style={{ color: "#1a6b35" }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">View Published Report</h3>
                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                  See the latest published headcount dashboard. This is what management sees when they open the link.
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: "#1a6b35" }}>
                View report →
              </span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
