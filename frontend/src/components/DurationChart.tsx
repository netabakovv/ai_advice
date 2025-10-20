import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { day: "Пн", duration: 45 },
  { day: "Вт", duration: 38 },
  { day: "Ср", duration: 55 },
  { day: "Чт", duration: 42 },
  { day: "Пт", duration: 35 },
  { day: "Сб", duration: 48 },
  { day: "Вс", duration: 62 },
  { day: "Пн", duration: 38 },
  { day: "Вт", duration: 25 },
  { day: "Ср", duration: 45 },
  { day: "Чт", duration: 52 },
  { day: "Вт", duration: 68 },
  { day: "Ср", duration: 58 },
  { day: "Чт", duration: 72 },
];

export function DurationChart() {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">Динамика длительности</h3>
        <button className="text-green-500 text-xs md:text-sm font-medium">Есть советы</button>
      </div>
      
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4A6CF7" />
                <stop offset="100%" stopColor="#C56CF0" />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              labelFormatter={(label) => `День: ${label}`}
              formatter={(value) => [`${value} мин`, 'Длительность']}
            />
            <Line
              type="monotone"
              dataKey="duration"
              stroke="url(#colorGradient)"
              strokeWidth={3}
              dot={{ fill: '#4A6CF7', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#C56CF0' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}