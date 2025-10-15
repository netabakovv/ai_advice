import { Paperclip, Video, Users, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function HomePage() {
  return (
    <div className="flex-1 min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="max-w-2xl w-full">
          {/* Main Input Section */}
          <div className="text-center mb-12">
            <div className="relative mb-6">
              <Input
                placeholder="Добавить ИИ-помощника к встрече"
                className="w-full h-16 text-lg px-6 bg-white border border-gray-200 rounded-2xl transition-all duration-300 focus:border-[#4A6CF7]/30"
              />
              <Button className="absolute right-2 top-2 h-12 px-8 bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] hover:from-[#3B5AF0] hover:to-[#B45CE9] text-white border-0 rounded-xl transition-all duration-200">
                Присоединиться
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mb-8">
              Вставьте ссылку на встречу, чтобы ИИ подключился автоматически
            </p>
            
            {/* Upload Button */}
            <Button 
              variant="outline"
              className="w-full h-14 bg-white border border-gray-200 rounded-2xl transition-all duration-200 text-gray-700 hover:text-gray-800 hover:border-gray-300"
            >
              <Paperclip className="w-5 h-5 mr-3 text-gray-500" />
              Прикрепить запись встречи
            </Button>
            
            <p className="text-sm text-gray-500 mt-4 mb-12">
              Загрузите файл записи, чтобы получить аналитику и советы
            </p>
          </div>
          
          {/* Supported Services */}
          <div className="bg-white rounded-2xl p-6">
            <p className="text-sm text-gray-600 text-center mb-4">Поддерживаем</p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-700">Zoom</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-700">Google Meet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-700">Яндекс Телемост</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#4A6CF7]/10 to-[#C56CF0]/10 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-[#FFA94D]/10 to-[#FF8A65]/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-br from-[#C56CF0]/10 to-[#4A6CF7]/10 rounded-full blur-3xl"></div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Timeflow — оптимизация времени встреч с помощью ИИ
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              О проекте
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Конфиденциальность
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Поддержка
            </a>
            <div className="text-sm text-gray-400">© 2025</div>
          </div>
        </div>
      </footer>
    </div>
  );
}