import { Paperclip } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function HomePage() {
  return (
    <div className="flex-1 min-h-screen flex flex-col pt-16 md:pt-0">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 py-8 md:py-16">
        <div className="max-w-[1280px] mx-auto w-full">
        <div className="max-w-2xl mx-auto w-full">
          {/* Main Input Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="relative mb-4 md:mb-6">
              <Input
                placeholder="Добавить ИИ-помощника к встрече"
                className="w-full h-14 md:h-16 text-base md:text-lg px-4 md:px-6 pr-36 md:pr-40 bg-white border border-gray-200 rounded-2xl transition-all duration-300 focus:border-[#4A6CF7]/30"
              />
              <Button className="absolute right-2 top-2 h-10 md:h-12 px-4 md:px-8 bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] hover:from-[#3B5AF0] hover:to-[#B45CE9] text-white border-0 rounded-xl transition-all duration-200">
                Присоединиться
              </Button>
            </div>
            
            <p className="text-xs md:text-sm text-gray-500 mb-6 md:mb-8 px-2">
              Вставьте ссылку на встречу, чтобы ИИ подключился автоматически
            </p>
            
            {/* Upload Button */}
            <Button 
              variant="outline"
              className="w-full h-12 md:h-14 bg-white border border-gray-200 rounded-2xl transition-all duration-200 text-gray-700 hover:text-gray-800 hover:border-gray-300"
            >
              <Paperclip className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 text-gray-500" />
              Прикрепить запись встречи
            </Button>
            
            <p className="text-xs md:text-sm text-gray-500 mt-3 md:mt-4 px-2">
              Загрузите файл записи, чтобы получить аналитику и советы
            </p>
          </div>
        </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="hidden md:block absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#4A6CF7]/10 to-[#C56CF0]/10 rounded-full blur-3xl"></div>
      <div className="hidden md:block absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-[#FFA94D]/10 to-[#FF8A65]/10 rounded-full blur-2xl"></div>
      <div className="hidden md:block absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-br from-[#C56CF0]/10 to-[#4A6CF0]/10 rounded-full blur-3xl"></div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
            Timeflow — оптимизация времени встреч с помощью ИИ
          </div>
          <div className="flex items-center gap-3 md:gap-6 flex-wrap justify-center">
            <a href="#" className="text-xs md:text-sm text-gray-500 hover:text-gray-700 transition-colors">
              О проекте
            </a>
            <a href="#" className="text-xs md:text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Конфиденциальность
            </a>
            <a href="#" className="text-xs md:text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Поддержка
            </a>
            <div className="text-xs md:text-sm text-gray-400">© 2025</div>
          </div>
        </div>
      </footer>
    </div>
  );
}