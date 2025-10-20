import { useState } from "react";
import { NotificationItem, NotificationType } from "../components/NotificationItem";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Bell, BellOff, CheckCheck, Wifi, WifiOff, AlertCircle } from "lucide-react";

// Типы данных уведомлений (имитация API структуры)
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO timestamp
  source: string;
  readAt: string | null;
  actions?: Array<{ label: string; url: string }>;
}

// Mock данные (Mode: mock)
const mockNotifications: Notification[] = [
  // Сегодня
  {
    id: "1",
    type: "success",
    title: "Встреча успешно завершена",
    message: "Ваша встреча 'Планирование спринта Q2 2025' завершилась. Доступна полная аналитика с расшифровкой, ключевыми темами и рекомендациями по улучшению эффективности команды.",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    source: "Аналитика встреч",
    readAt: null,
    actions: [{ label: "Посмотреть отчет", url: "#" }],
  },
  {
    id: "2",
    type: "comment",
    title: "Новый комментарий к встрече",
    message: "Анна Соколова оставила комментарий: 'Отличная встреча! Давайте в следующий раз сократим обсуждение багов до 5 минут'",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    source: "Встреча 'Код-ревью'",
    readAt: null,
    actions: [{ label: "Ответить", url: "#" }],
  },
  {
    id: "3",
    type: "warning",
    title: "Требуется внимание: низкая эффективность",
    message: "Встреча 'Дейли стендап' заняла 35 минут вместо запланированных 15. ИИ обнаружил 12 минут оффтопа и рекомендует пересмотреть формат.",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    source: "ИИ-советник",
    readAt: null,
    actions: [{ label: "Посмотреть детали", url: "#" }],
  },
  {
    id: "4",
    type: "info",
    title: "Предстоящая встреча через 30 минут",
    message: "Напоминаем о встрече 'Обсуждение архитектуры микросервисов'. Участники: 8 человек. ИИ-ассистент автоматически подключится.",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    source: "Календарь",
    readAt: "2025-10-16T10:00:00Z",
    actions: [{ label: "Перейти к встрече", url: "#" }],
  },
  
  // Вчера
  {
    id: "5",
    type: "success",
    title: "Экономия времени: 2 часа в неделю",
    message: "Поздравляем! За последнюю неделю вы сократили среднее время встреч на 15%. Это экономит ~2 часа рабочего времени команды.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // Yesterday
    source: "Статистика",
    readAt: null,
    actions: [{ label: "Показать детали", url: "#" }],
  },
  {
    id: "6",
    type: "comment",
    title: "Упоминание в транскрипции",
    message: "Вас упомянули в встрече 'Ретроспектива спринта': 'Иван отлично провел демо новой фичи, но в следующий раз давайте оставим больше времени на вопросы'",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    source: "Встреча 'Ретроспектива'",
    readAt: null,
    actions: [{ label: "Открыть транскрипцию", url: "#" }],
  },
  {
    id: "7",
    type: "system",
    title: "Обновление тарифного плана",
    message: "Ваш тариф 'Базовый' приближается к лимиту (2 из 3 встреч использовано в этом месяце). Рекомендуем перейти на тариф 'Про' для безлимитного доступа.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    source: "Система",
    readAt: "2025-10-15T16:00:00Z",
    actions: [{ label: "Сменить тариф", url: "#" }],
  },
  {
    id: "8",
    type: "info",
    title: "Еженедельный отчет готов",
    message: "Ваш еженедельный отчет по эффективности встреч готов к про��мотру. Всего встреч: 12, средняя продолжительность: 28 мин, топ-3 темы: планирование, код-ревью, статусы.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    source: "Отчеты",
    readAt: "2025-10-15T12:00:00Z",
  },

  // Ранее
  {
    id: "9",
    type: "warning",
    title: "Проблема с подключением к встрече",
    message: "ИИ-ассистент не смог подключиться к встрече 'Обзор квартальных результатов'. Проверьте настройки интеграции с Google Meet.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    source: "Система",
    readAt: "2025-10-14T14:30:00Z",
    actions: [{ label: "Проверить настройки", url: "#" }],
  },
  {
    id: "10",
    type: "error",
    title: "Ошибка обработки записи",
    message: "Не удалось обработать запись встречи 'Презентация для клиента' из-за низкого качества аудио. Попробуйте загрузить файл повторно или улучшите качество записи.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    source: "Обработка аудио",
    readAt: "2025-10-13T11:00:00Z",
    actions: [{ label: "Повторить загрузку", url: "#" }],
  },
  {
    id: "11",
    type: "success",
    title: "Интеграция с Zoom активирована",
    message: "Теперь ИИ-ассистент может автоматически подключаться к вашим встречам в Zoom. Все будущие встречи будут анализироваться автоматически.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    source: "Интеграции",
    readAt: "2025-10-12T09:15:00Z",
    actions: [{ label: "Настроить", url: "#" }],
  },
  {
    id: "12",
    type: "info",
    title: "Новые ИИ-советы доступны",
    message: "На основе анализа 25 ваших встреч мы подготовили персонализированные рекомендации по повышению продуктивности: структурируйте повестку, используйте таймер, вовлекайте молчаливых участников.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    source: "ИИ-советник",
    readAt: "2025-10-11T15:45:00Z",
    actions: [{ label: "Посмотреть советы", url: "#" }],
  },
];

// Функция форматирования времени (Notification.createdAt → "HH:mm · DD MMM")
const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) {
    return `${diffMins} мин назад`;
  } else if (diffHours < 24) {
    return `${diffHours} ч назад`;
  } else {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const day = date.getDate();
    const month = date.toLocaleDateString("ru-RU", { month: "short" });
    return `${hours}:${minutes} · ${day} ${month}`;
  }
};

// Группировка уведомлений по датам
const groupNotificationsByDate = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  notifications.forEach((notif) => {
    const notifDate = new Date(notif.createdAt);
    const notifDay = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    );

    if (notifDay.getTime() === today.getTime()) {
      groups.today.push(notif);
    } else if (notifDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notif);
    } else {
      groups.earlier.push(notif);
    }
  });

  return groups;
};

// Компонент скелетона для состояния Loading
function NotificationSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const [pageState, setPageState] = useState<"loaded" | "loading" | "empty" | "error" | "offline">("loaded");
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // Подсчет непрочитанных (readAt == null)
  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  const groupedNotifications = groupNotificationsByDate(notifications);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
    );
  };

  // Loading State
  if (pageState === "loading") {
    return (
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (pageState === "empty") {
    return (
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1>Уведомления</h1>
              <p className="text-gray-600">У вас нет уведомлений</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="mb-2">Нет уведомлений</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Здесь будут отображаться все важные обновления, напоминания о встречах и результаты анализа
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (pageState === "error") {
    return (
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1>Уведомления</h1>
              <p className="text-gray-600">Произошла ошибка</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="mb-2">Ошибка загрузки уведомлений</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Не удалось загрузить уведомления. Проверьте подключение к интернету и попробуйте снова.
            </p>
            <Button
              onClick={() => setPageState("loaded")}
              className="bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white hover:from-[#3A5CE7] hover:to-[#B55CE0] rounded-xl"
            >
              Попробовать снова
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Offline State
  if (pageState === "offline") {
    return (
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1>Уведомления</h1>
              <p className="text-gray-600">Нет подключения к интернету</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="mb-2">Нет подключения</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Проверьте подключение к интернету для загрузки уведомлений
            </p>
            <Button
              onClick={() => setPageState("loaded")}
              variant="outline"
              className="rounded-xl"
            >
              <Wifi className="w-4 h-4 mr-2" />
              П��вторить попытку
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loaded State (Main view)
  return (
    <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1>Уведомления</h1>
              {unreadCount > 0 && (
                <Badge className="bg-blue-500 text-white hover:bg-blue-600 px-3 py-1">
                  {unreadCount} новых
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              Все важные обновления и события
            </p>
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              className="rounded-xl"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Отметить все как прочитанные
            </Button>
          )}
        </div>

        {/* Debug State Switcher (for testing) */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={pageState === "loaded" ? "default" : "outline"}
            onClick={() => setPageState("loaded")}
            className="rounded-xl"
          >
            Loaded
          </Button>
          <Button
            size="sm"
            variant={pageState === "loading" ? "default" : "outline"}
            onClick={() => setPageState("loading")}
            className="rounded-xl"
          >
            Loading
          </Button>
          <Button
            size="sm"
            variant={pageState === "empty" ? "default" : "outline"}
            onClick={() => setPageState("empty")}
            className="rounded-xl"
          >
            Empty
          </Button>
          <Button
            size="sm"
            variant={pageState === "error" ? "default" : "outline"}
            onClick={() => setPageState("error")}
            className="rounded-xl"
          >
            Error
          </Button>
          <Button
            size="sm"
            variant={pageState === "offline" ? "default" : "outline"}
            onClick={() => setPageState("offline")}
            className="rounded-xl"
          >
            Offline
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-8">
          {/* Today */}
          {groupedNotifications.today.length > 0 && (
            <div>
              <h2 className="mb-4 text-gray-800">Сегодня</h2>
              <div className="space-y-3">
                {groupedNotifications.today.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    type={notification.type}
                    isUnread={notification.readAt === null}
                    title={notification.title}
                    message={notification.message}
                    timestamp={formatTimestamp(notification.createdAt)}
                    source={notification.source}
                    linkLabel={notification.actions?.[0]?.label}
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Yesterday */}
          {groupedNotifications.yesterday.length > 0 && (
            <div>
              <h2 className="mb-4 text-gray-800">Вчера</h2>
              <div className="space-y-3">
                {groupedNotifications.yesterday.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    type={notification.type}
                    isUnread={notification.readAt === null}
                    title={notification.title}
                    message={notification.message}
                    timestamp={formatTimestamp(notification.createdAt)}
                    source={notification.source}
                    linkLabel={notification.actions?.[0]?.label}
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Earlier */}
          {groupedNotifications.earlier.length > 0 && (
            <div>
              <h2 className="mb-4 text-gray-800">Ранее</h2>
              <div className="space-y-3">
                {groupedNotifications.earlier.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    type={notification.type}
                    isUnread={notification.readAt === null}
                    title={notification.title}
                    message={notification.message}
                    timestamp={formatTimestamp(notification.createdAt)}
                    source={notification.source}
                    linkLabel={notification.actions?.[0]?.label}
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
