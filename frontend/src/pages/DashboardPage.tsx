import { ChevronDown } from "lucide-react";
import { MetricsCards } from "../components/MetricsCards";
import { DurationChart } from "../components/DurationChart";
import { TimeAnalytics } from "../components/TimeAnalytics";
import { EmployeeTable } from "../components/EmployeeTable";
import { OptimizationChart } from "../components/OptimizationChart";

export function DashboardPage() {
  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-100 pt-16 md:pt-8">
      <div className="max-w-[1280px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Аналитика</h1>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex-1 md:flex-none bg-white rounded-2xl px-3 md:px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all duration-200">
            <span className="text-xs md:text-sm text-gray-600">10-09-2025</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 md:flex-none bg-white rounded-2xl px-3 md:px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all duration-200">
            <span className="text-xs md:text-sm text-gray-600">10-10-2025</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <MetricsCards />
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
        <DurationChart />
        <TimeAnalytics />
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <EmployeeTable />
        <OptimizationChart />
      </div>
      </div>
    </div>
  );
}