import { useState } from "react";
import { Home, BarChart3, Activity, Lightbulb, Calendar, Bell, Settings, LogOut, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { PricingModal } from "./PricingModal";

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout?: () => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export function Sidebar({ activePage, onPageChange, onLogout, isMobileMenuOpen, onCloseMobileMenu }: SidebarProps) {
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: "Главная", key: "home" },
    { icon: BarChart3, label: "Аналитика", key: "analytics" },
    { icon: Lightbulb, label: "Советы", key: "tips" },
    { icon: Calendar, label: "Календарь", key: "calendar" },
    { icon: Bell, label: "Уведомления", key: "notifications" },
    { icon: Settings, label: "Настройки", key: "settings" },
  ];

  const handlePlanSelect = (planId: string, period: "monthly" | "yearly") => {
    console.log(`Selected plan: ${planId}, period: ${period}`);
    // Здесь можно добавить логику для обработки выбора тарифа
    setIsPricingModalOpen(false);
  };

  return (
    <div 
      className={`
        w-64 h-screen bg-white flex flex-col rounded-r-3xl
        fixed md:static top-0 left-0 z-50
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Close button for mobile */}
      <button
        onClick={onCloseMobileMenu}
        className="md:hidden absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#4A6CF7] to-[#C56CF0] rounded-2xl flex items-center justify-center">
          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-gradient-to-br from-[#4A6CF7] to-[#C56CF0] rounded-full"></div>
          </div>
        </div>
        <span className="text-gray-800 font-semibold text-lg">Timeflow</span>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => onPageChange(item.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              activePage === item.key
                ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white"
                : "bg-transparent text-gray-600 hover:bg-gray-50"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-[#4A6CF7] to-[#C56CF0] text-white">ИИ</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm text-gray-800">Иван Иванов</div>
              <div className="text-xs text-gray-500">ivan@example.com</div>
            </div>
          </div>
          <div className="space-y-2">
            <Button 
              className="w-full bg-gradient-to-r from-[#FFA94D] to-[#FF8A65] text-white border-0 rounded-xl hover:from-[#FF9A3D] hover:to-[#FF7A55]"
              size="sm"
              onClick={() => setIsPricingModalOpen(true)}
            >
              Поменять тариф
            </Button>
            <Button 
              variant="outline"
              className="w-full rounded-xl"
              size="sm"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </div>

      {/* Pricing Modal */}
      <PricingModal
        open={isPricingModalOpen}
        onOpenChange={setIsPricingModalOpen}
        currentPlan="basic"
        onSelect={handlePlanSelect}
      />
    </div>
  );
}