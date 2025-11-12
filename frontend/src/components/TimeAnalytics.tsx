import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Польза", value: 65, color: "#4A6CF7" },
  { name: "Нейтрально", value: 25, color: "#FFA94D" },
  { name: "Потеряно", value: 10, color: "#FF6B6B" },
];

export function TimeAnalytics() {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">Аналитика времени</h3>
        <button className="text-gray-400">•••</button>
      </div>
      
      <div className="relative">
        <div className="h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-gray-800">65%</div>
            <div className="text-xs md:text-sm text-gray-600">Польза</div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 md:gap-6 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-xs md:text-sm text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}