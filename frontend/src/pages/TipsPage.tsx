import { Clock, Users, MessageSquareOff, CheckCircle, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

interface TipsPageProps {
  onShowMeetingDetails: () => void;
}

export function TipsPage({ onShowMeetingDetails }: TipsPageProps) {
  const generalTips = [
    {
      text: "Сократить среднюю длительность на 5 минут",
      subtitle: "экономия ~100 мин/мес",
      icon: Clock,
      iconColor: "text-[#4A6CF7]",
    },
    {
      text: "Разделять обсуждение блокеров и статус-апдейты",
      subtitle: "повышение структурированности",
      icon: Users,
      iconColor: "text-[#C56CF0]",
    },
    {
      text: "Больше вовлекать участников с низкой активностью",
      subtitle: "увеличение вовлеченности",
      icon: MessageSquareOff,
      iconColor: "text-[#FFA94D]",
    },
  ];

  const meetingTips = [
    {
      date: "23.09",
      duration: "28 мин",
      problems: [
        "Слишком много оффтопа (~5 мин)",
        "Один участник говорил 9 минут подряд",
        "Два человека не сказали ни слова",
      ],
      recommendations: [
        "Вынести оффтоп в отдельный чат",
        "Ограничить время выступления 1–2 мин",
        "Вовлекать молчаливых участников через прямые вопросы",
      ],
      status: "attention",
    },
    {
      date: "21.09",
      duration: "32 мин",
      problems: [
        "Трижды обсуждали один и тот же баг",
        "Начало задержали на 7 минут",
      ],
      recommendations: [
        "Использовать баг-трекер вместо повторных обсуждений",
        "Стартовать вовремя, договориться о \"правиле 5 минут\"",
      ],
      status: "warning",
    },
    {
      date: "19.09",
      duration: "18 мин",
      problems: [
        "Отсутствовала ясная структура: часть участников не понимала повестку",
      ],
      recommendations: [
        "В начале встречи озвучивать цели и повестку",
        "Заводить шаблон для апдейтов (вчера/сегодня/блокеры)",
      ],
      status: "good",
    },
  ];

  const filters = ["Все встречи", "Последние", "По месяцам"];

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-gray-800">Советы по встречам</h1>
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          {filters.map((filter, index) => (
            <Button
              key={index}
              variant={index === 0 ? "default" : "outline"}
              className={
                index === 0
                  ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white border-0 shadow-[2px_2px_4px_rgba(163,177,198,0.2)] rounded-xl"
                  : "bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-[2px_2px_4px_rgba(163,177,198,0.1),_-2px_-2px_4px_rgba(255,255,255,0.6)] hover:shadow-[4px_4px_8px_rgba(163,177,198,0.2),_-4px_-4px_8px_rgba(255,255,255,0.8)] text-gray-700"
              }
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* General Recommendations */}
      <div className="bg-white rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Что можно улучшить в целом</h2>
          <Button 
            variant="ghost" 
            className="text-[#4A6CF7] hover:text-[#3B5AF0] flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Посмотреть аналитику
          </Button>
        </div>
        
        <div className="space-y-4">
          {generalTips.map((tip, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center`}>
                <tip.icon className={`w-5 h-5 ${tip.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-800 font-medium">{tip.text}</p>
                    <p className="text-sm text-gray-500 mt-1">{tip.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting-specific Tips */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Советы по конкретным встречам</h2>
        
        {meetingTips.map((meeting, index) => (
          <div key={index} className="bg-white rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-800">{meeting.date}</span>
                  <Badge 
                    variant="secondary"
                    className="bg-gray-100 text-gray-600"
                  >
                    {meeting.duration}
                  </Badge>
                </div>
                <Badge 
                  variant="outline"
                  className={
                    meeting.status === "good" 
                      ? "border-green-200 text-green-700 bg-green-50"
                      : meeting.status === "warning"
                      ? "border-yellow-200 text-yellow-700 bg-yellow-50"
                      : "border-red-200 text-red-700 bg-red-50"
                  }
                >
                  {meeting.status === "good" ? "Хорошо" : meeting.status === "warning" ? "Внимание" : "Проблемы"}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onShowMeetingDetails}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                Подробнее
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Problems */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  Проблемы
                </h4>
                <ul className="space-y-2">
                  {meeting.problems.map((problem, pIndex) => (
                    <li key={pIndex} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      {problem}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Recommendations */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Рекомендации
                </h4>
                <ul className="space-y-2">
                  {meeting.recommendations.map((rec, rIndex) => (
                    <li key={rIndex} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200/50">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            ИИ-советы помогают сокращать время встреч на 20% и повышают эффективность
          </p>
        </div>
      </div>
    </div>
  );
}