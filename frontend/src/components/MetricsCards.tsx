import { Heart, Calendar, ShoppingBag, Briefcase } from "lucide-react";

export function MetricsCards() {
  const metrics = [
    {
      value: "120 минут",
      label: "Сэкономлено в этом месяце",
      icon: Heart,
      iconColor: "text-red-500",
      bgColor: "bg-red-50",
      percentage: "+25%",
      percentageColor: "text-green-500",
    },
    {
      value: "12",
      label: "Супер-дейликов",
      icon: Calendar,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50",
      percentage: "+18%",
      percentageColor: "text-green-500",
    },
    {
      value: "3",
      label: "Потерянных дейлика",
      icon: ShoppingBag,
      iconColor: "text-red-400",
      bgColor: "bg-red-50",
      percentage: "-12%",
      percentageColor: "text-red-500",
    },
    {
      value: "15%",
      label: "Рост эффективности",
      icon: Briefcase,
      iconColor: "text-[#4A6CF7]",
      bgColor: "bg-blue-50",
      percentage: "+15%",
      percentageColor: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-6 transition-all duration-300 relative"
        >
          <div className={`absolute top-4 right-4 text-sm font-medium ${metric.percentageColor}`}>
            {metric.percentage}
          </div>
          <div className={`w-12 h-12 ${metric.bgColor} rounded-2xl flex items-center justify-center mb-4`}>
            <metric.icon className={`w-6 h-6 ${metric.iconColor}`} />
          </div>
          <div className="text-2xl font-semibold text-gray-800 mb-1">{metric.value}</div>
          <div className="text-sm text-gray-600">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}