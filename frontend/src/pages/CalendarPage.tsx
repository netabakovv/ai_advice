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
    "all" | "attention" | "completed"
  >("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] =
    useState(false);

  // Mock data - дни с встречами
  const meetingDates = [
    new Date(2025, 9, 16), // Today
    new Date(2025, 9, 17),
    new Date(2025, 9, 18),
    new Date(2025, 9, 20),
    new Date(2025, 9, 22),
    new Date(2025, 9, 25),
  ];

  // Mock meetings data
  const allMeetings: Meeting[] = [
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
      status: "upcoming",
      date: new Date(2025, 9, 16),
      participants: 4,
      duration: 60,
    },
    {
      id: "4",
      title: "Обсуждение архитектуры",
      time: "16:30–17:30",
      status: "attention",
      date: new Date(2025, 9, 16),
      participants: 5,
      duration: 60,
    },
    {
      id: "5",
      title: "1-on-1 с менеджером",
      time: "11:00–11:30",
      status: "upcoming",
      date: new Date(2025, 9, 17),
      participants: 2,
      duration: 30,
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
    <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
      <div className="max-w-[1280px] mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2">Календарь встреч</h1>
            <p className="text-gray-600">
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
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6">
              <h2 className="mb-4">Выберите дату</h2>
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
              <div className="mt-4 pt-4 border-t border-gray-100">
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
                          Просмотреть детали
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