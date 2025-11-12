import { useState } from "react";
import { Calendar } from "../components/ui/calendar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Star,
  Download,
  Plus,
  CalendarDays,
} from "lucide-react";

interface CalendarPageProps {
  onShowMeetingDetails: () => void;
}

interface Meeting {
  id: string;
  title: string;
  time: string;
  status: "upcoming" | "completed" | "attention";
  date: Date;
  efficiency?: number;
  topics?: string[];
  suggestion?: string;
  participants?: number;
  duration?: number;
}

export function CalendarPage({
  onShowMeetingDetails,
}: CalendarPageProps) {
  const [selectedDate, setSelectedDate] = useState<
    Date | undefined
  >(new Date());
  const [viewMode, setViewMode] = useState<
    "day" | "week" | "month"
  >("day");
  const [filter, setFilter] = useState<
    "all" | "attention" | "completed" | "upcoming"
  >("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] =
    useState(false);

  // Mock data - дни с встречами
  const meetingDates = [
    new Date(2025, 9, 16), // Today
    new Date(2025, 9, 17),
    new Date(2025, 9, 20),
    new Date(2025, 9, 21),
    new Date(2025, 9, 22),
    new Date(2025, 9, 27),
  ];

  // Mock meetings data
  const allMeetings: Meeting[] = [
    // 16 октября - все завершены
    {
      id: "1",
      title: "Планирование спринта",
      time: "10:00–10:45",
      status: "completed",
      date: new Date(2025, 9, 16),
      efficiency: 82,
      topics: ["Бюджет", "сроки", "риски"],
      suggestion:
        "Следующий раз выделите отдельную встречу для обсуждения рисков",
      participants: 6,
      duration: 45,
    },
    {
      id: "2",
      title: "Дейли стендап",
      time: "09:30–09:45",
      status: "completed",
      date: new Date(2025, 9, 16),
      efficiency: 91,
      topics: ["Статус", "блокеры"],
      suggestion:
        "Встреча прошла отлично! Продолжайте в том же духе",
      participants: 8,
      duration: 15,
    },
    {
      id: "3",
      title: "Код-ревью фронтенда",
      time: "14:00–15:00",
      status: "completed",
      date: new Date(2025, 9, 16),
      efficiency: 88,
      topics: ["Рефакторинг", "оптимизация"],
      suggestion: "Отличная работа! Код-ревью прошло продуктивно",
      participants: 4,
      duration: 60,
    },
    {
      id: "4",
      title: "Обсуждение архитектуры",
      time: "16:30–17:30",
      status: "completed",
      date: new Date(2025, 9, 16),
      efficiency: 75,
      topics: ["Архитектура", "масштабирование"],
      suggestion: "Некоторые вопросы остались нерешенными, запланируйте продолжение",
      participants: 5,
      duration: 60,
    },
    // 17 октября - все завершены
    {
      id: "5",
      title: "1-on-1 с менеджером",
      time: "11:00–11:30",
      status: "completed",
      date: new Date(2025, 9, 17),
      efficiency: 95,
      topics: ["Карьерный рост", "обратная связь"],
      suggestion: "Продуктивная встреча, все цели достигнуты",
      participants: 2,
      duration: 30,
    },
    {
      id: "6",
      title: "Дейли стендап",
      time: "09:30–09:45",
      status: "completed",
      date: new Date(2025, 9, 17),
      efficiency: 89,
      topics: ["Статус", "блокеры"],
      suggestion: "Команда работает слаженно",
      participants: 8,
      duration: 15,
    },
    {
      id: "7",
      title: "Демо для клиента",
      time: "15:00–16:00",
      status: "completed",
      date: new Date(2025, 9, 17),
      efficiency: 92,
      topics: ["Презентация", "фидбек"],
      suggestion: "Клиент доволен прогрессом",
      participants: 12,
      duration: 60,
    },
    // 20 октября - смешанные статусы
    {
      id: "8",
      title: "Дейли стендап",
      time: "09:30–09:45",
      status: "completed",
      date: new Date(2025, 9, 20),
      efficiency: 87,
      topics: ["Статус", "блокеры"],
      suggestion: "Хорошее начало недели",
      participants: 8,
      duration: 15,
    },
    {
      id: "9",
      title: "Ретроспектива спринта",
      time: "14:00–15:30",
      status: "completed",
      date: new Date(2025, 9, 20),
      efficiency: 85,
      topics: ["Что прошло хорошо", "что улучшить"],
      suggestion: "Выявлены ключевые точки роста",
      participants: 10,
      duration: 90,
    },
    {
      id: "10",
      title: "Планирование архитектуры",
      time: "16:00–17:00",
      status: "upcoming",
      date: new Date(2025, 9, 20),
      participants: 6,
      duration: 60,
    },
    // 21 октября - часть завершена, 1 предстоит, 1 требует внимания
    {
      id: "11",
      title: "Дейли стендап",
      time: "09:30–09:45",
      status: "completed",
      date: new Date(2025, 9, 21),
      efficiency: 90,
      topics: ["Статус", "блокеры"],
      suggestion: "Все идет по плану",
      participants: 8,
      duration: 15,
    },
    {
      id: "12",
      title: "Синхронизация с дизайнерами",
      time: "13:00–14:00",
      status: "upcoming",
      date: new Date(2025, 9, 21),
      participants: 5,
      duration: 60,
    },
    {
      id: "13",
      title: "Код-ревью бэкенда",
      time: "15:00–16:00",
      status: "attention",
      date: new Date(2025, 9, 21),
      participants: 4,
      duration: 60,
    },
    // 22 октября - предстоящие и требующие внимания
    {
      id: "14",
      title: "Дейли стендап",
      time: "09:30–09:45",
      status: "upcoming",
      date: new Date(2025, 9, 22),
      participants: 8,
      duration: 15,
    },
    {
      id: "15",
      title: "Встреча с продакт-менеджером",
      time: "11:00–12:00",
      status: "attention",
      date: new Date(2025, 9, 22),
      participants: 6,
      duration: 60,
    },
    {
      id: "16",
      title: "Обучение команды",
      time: "14:00–15:30",
      status: "upcoming",
      date: new Date(2025, 9, 22),
      participants: 12,
      duration: 90,
    },
    // 27 октября - все предстоят
    {
      id: "17",
      title: "Дейли стендап",
      time: "09:30–09:45",
      status: "upcoming",
      date: new Date(2025, 9, 27),
      participants: 8,
      duration: 15,
    },
    {
      id: "18",
      title: "Планировние нового спринта",
      time: "10:00–11:30",
      status: "upcoming",
      date: new Date(2025, 9, 27),
      participants: 10,
      duration: 90,
    },
    {
      id: "19",
      title: "Обсуждение релиза",
      time: "15:00–16:00",
      status: "upcoming",
      date: new Date(2025, 9, 27),
      participants: 7,
      duration: 60,
    },
  ];

  // Фильтрация встреч по выбранной дате
  const selectedDayMeetings = allMeetings.filter((meeting) => {
    if (!selectedDate) return false;
    const meetingDate = meeting.date;
    return (
      meetingDate.getDate() === selectedDate.getDate() &&
      meetingDate.getMonth() === selectedDate.getMonth() &&
      meetingDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Фильтрация по статусу
  const filteredMeetings = selectedDayMeetings.filter(
    (meeting) => {
      if (filter === "all") return true;
      if (filter === "attention")
        return meeting.status === "attention";
      if (filter === "completed")
        return meeting.status === "completed";
      if (filter === "upcoming")
        return meeting.status === "upcoming";
      return true;
    },
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Завершена
          </Badge>
        );
      case "upcoming":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            Предстоит
          </Badge>
        );
      case "attention":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            Требует внимания
          </Badge>
        );
      default:
        return null;
    }
  };

  // Проверка есть ли встречи в определенный день
  const isDayWithMeeting = (date: Date) => {
    return meetingDates.some(
      (meetingDate) =>
        meetingDate.getDate() === date.getDate() &&
        meetingDate.getMonth() === date.getMonth() &&
        meetingDate.getFullYear() === date.getFullYear(),
    );
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-100 overflow-y-auto pt-16 md:pt-8">
      <div className="max-w-[1280px] mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl md:text-3xl font-semibold text-gray-800">Календарь встреч</h1>
            <p className="text-gray-600 text-sm md:text-base">
              Планируйте и анализируйте ваши встречи с помощью
              ИИ
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white hover:from-[#3A5CE7] hover:to-[#B55CE0] rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать встречу
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white rounded-2xl">
                <DialogHeader>
                  <DialogTitle>
                    Создать новую встречу
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Название встречи
                    </Label>
                    <Input
                      id="title"
                      placeholder="Например: Планирование спринта"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Дата</Label>
                      <Input
                        id="date"
                        type="date"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Время</Label>
                      <Input
                        id="time"
                        type="time"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="participants">
                      Участники
                    </Label>
                    <Input
                      id="participants"
                      placeholder="ivan@example.com, anna@example.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Описание
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="О чем будет встреча..."
                      className="rounded-xl"
                    />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white hover:from-[#3A5CE7] hover:to-[#B55CE0] rounded-xl">
                    Создать встречу
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              Импортировать
            </Button>
          </div>
        </div>

        {/* Filters and View Mode */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-white rounded-2xl p-2">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className={
                viewMode === "day"
                  ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white rounded-xl"
                  : "rounded-xl"
              }
            >
              День
            </Button>
            <Button
              variant={
                viewMode === "week" ? "default" : "ghost"
              }
              size="sm"
              onClick={() => setViewMode("week")}
              className={
                viewMode === "week"
                  ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white rounded-xl"
                  : "rounded-xl"
              }
            >
              Неделя
            </Button>
            <Button
              variant={
                viewMode === "month" ? "default" : "ghost"
              }
              size="sm"
              onClick={() => setViewMode("month")}
              className={
                viewMode === "month"
                  ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white rounded-xl"
                  : "rounded-xl"
              }
            >
              Месяц
            </Button>
          </div>

          <Select
            value={filter}
            onValueChange={(value: any) => setFilter(value)}
          >
            <SelectTrigger className="w-64 bg-white rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все встречи</SelectItem>
              <SelectItem value="attention">
                Требуют внимания
              </SelectItem>
              <SelectItem value="completed">
                Прошедшие
              </SelectItem>
              <SelectItem value="upcoming">
                Предстоящие
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
              <h2 className="mb-4 self-start">Выберите дату</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-xl"
                modifiers={{
                  meeting: meetingDates,
                }}
                modifiersClassNames={{
                  meeting:
                    "bg-blue-100 text-blue-900 font-semibold",
                }}
              />
              <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                  <span>День со встречами</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meetings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2>
                  Встречи на{" "}
                  {selectedDate?.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                  {filteredMeetings.length} встреч
                </Badge>
              </div>

              {filteredMeetings.length === 0 ? (
                // Empty State
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="mb-2">
                    У вас пока нет запланированных встреч
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Подключите календарь или вставьте ссылку на
                    встречу на главной странице.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() =>
                        setIsCreateDialogOpen(true)
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Создать встречу
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Импортировать календарь
                    </Button>
                  </div>
                </div>
              ) : (
                // Meetings List
                <div className="space-y-4">
                  {filteredMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="border border-gray-200 rounded-2xl p-5 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3>{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                          </div>
                          <div className="flex items-center gap-4 text-gray-600 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{meeting.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>
                                {meeting.participants}{" "}
                                участников
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Status for completed meetings */}
                      {meeting.status === "completed" &&
                        meeting.efficiency && (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium text-gray-800">
                                Эффективность:{" "}
                                {meeting.efficiency}%
                              </span>
                            </div>
                            {meeting.topics && (
                              <div className="text-sm text-gray-700 mb-2">
                                <span className="font-medium">
                                  Темы обсуждения:
                                </span>{" "}
                                {meeting.topics.join(", ")}
                              </div>
                            )}
                            {meeting.suggestion && (
                              <div className="text-sm text-gray-600 italic">
                                💡 Совет: {meeting.suggestion}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Action Button */}
                      {meeting.status === "completed" ? (
                        <Button
                          onClick={onShowMeetingDetails}
                          variant="outline"
                          className="w-full rounded-xl border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Посмотреть анализ
                        </Button>
                      ) : meeting.status === "attention" ? (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          Требуется действие
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl"
                        >
                          Просмотреть дета��и
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}