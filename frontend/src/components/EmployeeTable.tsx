import { MoreHorizontal } from "lucide-react";

const employees = [
  {
    name: "Макс Фролов",
    avatar: "👨",
    laconic: 90,
    clarity: 95,
    focus: 80,
    efficiency: 99,
  },
  {
    name: "Алексей Иванов",
    avatar: "🧑",
    laconic: 85,
    clarity: 88,
    focus: 91,
    efficiency: 84,
  },
  {
    name: "Даниил Симонов",
    avatar: "👱",
    laconic: 86,
    clarity: 71,
    focus: 90,
    efficiency: 81,
  },
  {
    name: "Анна Смирнова",
    avatar: "👩",
    laconic: 70,
    clarity: 53,
    focus: 67,
    efficiency: 78,
  },
];

export function EmployeeTable() {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">Лучшие сотрудники</h3>
        <button className="text-gray-400">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      
      <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 text-xs md:text-sm font-medium text-gray-600">Имя</th>
              <th className="text-center py-3 text-xs md:text-sm font-medium text-gray-600">Лаконичность</th>
              <th className="text-center py-3 text-xs md:text-sm font-medium text-gray-600">Ясность</th>
              <th className="text-center py-3 text-xs md:text-sm font-medium text-gray-600">Фокус</th>
              <th className="text-center py-3 text-xs md:text-sm font-medium text-gray-600">Эффективность</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => (
              <tr key={index} className="border-b border-gray-100 last:border-b-0">
                <td className="py-3 md:py-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-[#4A6CF7] to-[#C56CF0] rounded-full flex items-center justify-center text-white text-xs md:text-sm">
                      {employee.avatar}
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-800 whitespace-nowrap">{employee.name}</span>
                  </div>
                </td>
                <td className="text-center py-3 md:py-4">
                  <span className="text-xs md:text-sm text-gray-700">{employee.laconic}%</span>
                </td>
                <td className="text-center py-3 md:py-4">
                  <span className="text-xs md:text-sm text-gray-700">{employee.clarity}%</span>
                </td>
                <td className="text-center py-3 md:py-4">
                  <span className="text-xs md:text-sm text-gray-700">{employee.focus}%</span>
                </td>
                <td className="text-center py-3 md:py-4">
                  <span className="text-xs md:text-sm text-gray-700">{employee.efficiency}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}