import { useState } from "react";
import { ArrowLeft, Clock, Users, BarChart3, ChevronDown, ChevronRight, AlertTriangle, Repeat, MessageCircleOff, Volume2, UserMinus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

interface MeetingDetailsPageProps {
  onBack: () => void;
}

interface TimelineItem {
  time: string;
  title: string;
  problem?: boolean;
  type: 'productive' | 'offtopic' | 'blocker';
  speaker: string;
  summary: string;
  problemDescription?: string;
}

export function MeetingDetailsPage({ onBack }: MeetingDetailsPageProps) {
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<number | null>(null);

  const timelineItems: TimelineItem[] = [
    { 
      time: "02:15", 
      title: "Статус проекта X", 
      type: "productive",
      speaker: "Анна",
      summary: "Представлен текущий статус проекта X - готовность 85%. Основные задачи завершены в срок, команда работает над финальными деталями интеграции."
    },
    { 
      time: "10:48", 
      title: "Обсуждение багов", 
      type: "productive", 
      problem: true,
      speaker: "Иван",
      summary: "Детальный разбор багов в модуле аутентификации. Обсуждались возможные решения и временные рамки исправления.",
      problemDescription: "Команда несколько раз возвращалась к одной и той же проблеме без четкого вывода"
    },
    { 
      time: "18:20", 
      title: "Оффтоп", 
      type: "offtopic", 
      problem: true,
      speaker: "Сергей",
      summary: "Обсуждение корпоративных мероприятий и несвязанных с проектом вопросов.",
      problemDescription: "Потрачено ~5 минут на темы, не относящиеся к рабочему процессу"
    },
    { 
      time: "23:00", 
      title: "Блокеры", 
      type: "blocker",
      speaker: "Мария",
      summary: "Обсуждение текущих блокеров в интеграции с внешним API. Определены ответственные и сроки решения проблем."
    }
  ];

  const problems = [
    {
      title: "Повторы",
      description: "3 раза обсуждали один и тот же баг",
      icon: Repeat,
      color: "bg-orange-100"
    },
    {
      title: "Оффтоп",
      description: "~5 мин ушло на несвязанные темы",
      icon: MessageCircleOff,
      color: "bg-purple-100"
    },
    {
      title: "Переговорный монополист",
      description: "Иван говорил 9 мин подряд",
      icon: Volume2,
      color: "bg-blue-100"
    },
    {
      title: "Не вовлечены",
      description: "2 участника не сказали ни слова",
      icon: UserMinus,
      color: "bg-pink-100"
    }
  ];

  const aiSuggestions = [
    "Вынести обсуждение багов Y в отдельную встречу → экономия ~6 мин.",
    "Регламент: 1 мин/участник для статуса → сэкономит ~4 мин.",
    "Попросить вовлечь Сергея и Анну: 0 реплик за 28 мин → упущенные инсайты.",
    "Сократить оффтопы: предложить чат для несвязанных вопросов."
  ];

  const getTimelineItemColor = (type: string, problem?: boolean) => {
    if (problem) {
      return type === 'offtopic' ? 'bg-orange-500' : 'bg-red-500';
    }
    return 'bg-blue-500';
  };

  return (
    <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к советам
          </Button>
          
          <Select>
            <SelectTrigger className="w-48 bg-white rounded-2xl">
              <SelectValue placeholder="Посмотреть содержание" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Краткое содержание</SelectItem>
              <SelectItem value="full">Полный текст</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Meeting Title and Metadata */}
        <div className="bg-white rounded-2xl p-6">
          <h1 className="mb-4">Встреча 25.09.2025</h1>
          <div className="flex items-center gap-6 text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>28 мин</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>6 участников</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Продуктивность: 73/100</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="mb-2">Хронология встречи</h2>
          <p className="text-gray-600 mb-6">Кликните на метку времени для подробностей</p>
          
          <div className="space-y-4">
            {timelineItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <div
                  className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg"
                  onClick={() => setSelectedTimelineItem(selectedTimelineItem === index ? null : index)}
                >
                  <div className={`w-3 h-3 rounded-full ${getTimelineItemColor(item.type, item.problem)}`}></div>
                  <span className="text-gray-600 min-w-12">{item.time}</span>
                  <span className="flex-1">{item.title}</span>
                  {item.problem && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedTimelineItem === index ? 'rotate-90' : ''}`} />
                </div>
                
                {/* Timeline item details */}
                {selectedTimelineItem === index && (
                  <div className="ml-7 p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">Спикер: </span>
                        <span className="text-gray-700">{item.speaker}</span>
                      </div>
                      
                      <div>
                        <span className="text-sm text-gray-500">Краткая сводка: </span>
                        <p className="text-gray-700 mt-1">{item.summary}</p>
                      </div>
                      
                      {item.problem && item.problemDescription && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-orange-800">Обнаруженная проблема: </span>
                              <p className="text-sm text-orange-700">{item.problemDescription}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Problems */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="mb-2">Обнаруженные проблемы</h2>
          <p className="text-gray-600 mb-6">Автоматический анализ ИИ</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problems.map((problem, index) => {
              const IconComponent = problem.icon;
              return (
                <div key={index} className={`p-6 rounded-xl ${problem.color}`}>
                  <div className="flex items-start gap-3">
                    <IconComponent className="w-5 h-5 text-gray-600 mt-1" />
                    <div>
                      <h3>{problem.title}</h3>
                      <p className="text-gray-600">{problem.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="mb-2">Развёрнутые советы от ИИ</h2>
          <p className="text-gray-600 mb-6">Персонализированные рекомендации</p>
          
          <div className="space-y-4">
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-700 flex-1">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <BarChart3 className="w-4 h-4" />
            <span>Советы генерируются автоматически на основе анализа аудио и транскрипта</span>
          </div>
        </div>
      </div>
    </div>
  );
}