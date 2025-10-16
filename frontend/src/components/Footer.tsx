import React from "react";

export function Footer() {
    return (
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
);
}