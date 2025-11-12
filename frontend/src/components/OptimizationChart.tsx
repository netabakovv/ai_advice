import { MoreHorizontal } from "lucide-react";

const monthsData = [
  { month: "Jan", value: 13, color: "#FFA94D" },
  { month: "Feb", value: 5, color: "#4A6CF7" },
  { month: "Mar", value: 15, color: "#FFA94D" },
  { month: "Apr", value: 11, color: "#4A6CF7" },
  { month: "May", value: 3, color: "#4A6CF7" },
  { month: "Jun", value: 17, color: "#FFA94D" },
  { month: "Jul", value: 1, color: "#4A6CF7" },
];

export function OptimizationChart() {
  const maxValue = Math.max(...monthsData.map(item => item.value));

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">Средняя оптимизация по месяцам</h3>
        <button className="text-gray-400">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-3 md:space-y-4">
        {monthsData.map((item, index) => (
          <div key={index} className="flex items-center gap-3 md:gap-4">
            <div className="w-7 md:w-8 text-xs md:text-sm text-gray-600 font-medium">{item.month}</div>
            <div className="flex-1 flex items-center">
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                  }}
                ></div>
              </div>
              <div className="w-7 md:w-8 text-right text-xs md:text-sm text-gray-700 ml-2 md:ml-3">{item.value}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}