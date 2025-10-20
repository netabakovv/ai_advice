import { useState } from "react";
import { SettingInput } from "../components/SettingInput";
import { AvatarCard } from "../components/AvatarCard";
import { SettingSwitch } from "../components/SettingSwitch";
import { Button } from "../components/ui/button";
import { toast } from "sonner@2.0.3";
import { Save, CheckCircle, Loader2 } from "lucide-react";

// API Response Types
interface SettingsResponse {
  profile: {
    name: string;
    email: string;
    avatar: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    system: boolean;
  };
}

interface SettingsUpdateRequest {
  profile?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  notifications?: {
    email?: boolean;
    push?: boolean;
    system?: boolean;
  };
}

// Mock API данные
const mockSettingsData: SettingsResponse = {
  profile: {
    name: "Иван Петров",
    email: "ivan.petrov@company.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  },
  notifications: {
    email: true,
    push: true,
    system: false,
  },
};

// Имитация API вызовов
const mockApiDelay = () => new Promise((resolve) => setTimeout(resolve, 800));

const updateSettings = async (
  updates: SettingsUpdateRequest
): Promise<SettingsResponse> => {
  await mockApiDelay();
  // Имитация возможной ошибки (10% chance)
  if (Math.random() < 0.1) {
    throw new Error("Failed to update settings");
  }
  // Мерджим обновления с текущими данными
  return {
    profile: { ...mockSettingsData.profile, ...updates.profile },
    notifications: { ...mockSettingsData.notifications, ...updates.notifications },
  };
};

type PageState = "default" | "saving" | "saved" | "error";

// i18n mock (в реальном приложении использовать библиотеку i18n)
const t = (key: string): string => {
  const translations: Record<string, string> = {
    "settings.title": "Настройки",
    "settings.subtitle": "Управление профилем и уведомлениями",
    "settings.profile.title": "Профиль",
    "settings.profile.name.label": "Имя",
    "settings.profile.email.label": "Email",
    "settings.profile.avatar.label": "Фотография профиля",
    "settings.profile.avatar.cta": "Изменить фото",
    "settings.notifications.title": "Уведомления",
    "settings.notifications.email.label": "Email-уведомления",
    "settings.notifications.email.description": "Получать уведомления о встречах на почту",
    "settings.notifications.push.label": "Push-уведомления",
    "settings.notifications.push.description": "Получать уведомления в браузере",
    "settings.notifications.system.label": "Системные уведомления",
    "settings.notifications.system.description": "Уведомления о важных обновлениях системы",
    "settings.save": "Сохранить изменения",
    "settings.saving": "Сохранение...",
    "settings.saved": "Сохранено",
    "settings.toast.saved": "Настройки успешно сохранены",
    "settings.toast.error": "Не удалось сохранить настройки",
  };
  return translations[key] || key;
};

export function SettingsPage() {
  const [pageState, setPageState] = useState<PageState>("default");
  const [settings, setSettings] = useState<SettingsResponse>(mockSettingsData);
  const [formData, setFormData] = useState<SettingsResponse>(mockSettingsData);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    if (!formData || !settings) return;

    // Определяем что изменилось
    const updates: SettingsUpdateRequest = {};
    
    if (
      formData.profile.name !== settings.profile.name ||
      formData.profile.email !== settings.profile.email ||
      formData.profile.avatar !== settings.profile.avatar
    ) {
      updates.profile = formData.profile;
    }

    if (
      formData.notifications.email !== settings.notifications.email ||
      formData.notifications.push !== settings.notifications.push ||
      formData.notifications.system !== settings.notifications.system
    ) {
      updates.notifications = formData.notifications;
    }

    // Если ничего не изменилось
    if (Object.keys(updates).length === 0) {
      return;
    }

    // Оптимистичное обновление
    const previousSettings = settings;
    setSettings(formData);
    setPageState("saving");

    try {
      const updatedData = await updateSettings(updates);
      setSettings(updatedData);
      setFormData(updatedData);
      setPageState("saved");
      setHasChanges(false);
      toast.success(t("settings.toast.saved"));
      
      // Возвращаем в default через 2 секунды
      setTimeout(() => {
        setPageState("default");
      }, 2000);
    } catch (error) {
      console.error("Failed to update settings:", error);
      // Откат изменений
      setSettings(previousSettings);
      setFormData(previousSettings);
      setPageState("error");
      toast.error(t("settings.toast.error"));
      
      // Возвращаем в default через 3 секунды
      setTimeout(() => {
        setPageState("default");
      }, 3000);
    }
  };

  const updateFormField = <K extends keyof SettingsResponse>(
    section: K,
    field: keyof SettingsResponse[K],
    value: any
  ) => {
    if (!formData) return;
    
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const handleChangePhoto = () => {
    // В реальном приложении здесь будет загрузка фото
    toast.info("Функция загрузки фото будет доступна в следующей версии");
  };

  // Определяем иконку и текст кнопки в зависимости от состояния
  const getSaveButtonConfig = () => {
    switch (pageState) {
      case "saving":
        return {
          icon: <Loader2 className="w-4 h-4 mr-2 animate-spin" />,
          text: t("settings.saving"),
          disabled: true,
        };
      case "saved":
        return {
          icon: <CheckCircle className="w-4 h-4 mr-2" />,
          text: t("settings.saved"),
          disabled: true,
        };
      default:
        return {
          icon: <Save className="w-4 h-4 mr-2" />,
          text: t("settings.save"),
          disabled: !hasChanges,
        };
    }
  };

  const buttonConfig = getSaveButtonConfig();

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-100 overflow-y-auto pt-16 md:pt-8">
      <div className="max-w-[1280px] mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">{t("settings.title")}</h1>
            <p className="text-gray-600 text-sm md:text-base">{t("settings.subtitle")}</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={buttonConfig.disabled}
            className={`rounded-xl ${
              pageState === "saved"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] hover:from-[#3A5CE7] hover:to-[#B55CE0]"
            } text-white`}
          >
            {buttonConfig.icon}
            {buttonConfig.text}
          </Button>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <h2>{t("settings.profile.title")}</h2>

          {/* Avatar */}
          <AvatarCard
            imageUrl={formData.profile.avatar}
            label={formData.profile.name}
            ctaLabel={t("settings.profile.avatar.cta")}
            onChangePhoto={handleChangePhoto}
          />

          {/* Profile Fields */}
          <div className="grid md:grid-cols-2 gap-6">
            <SettingInput
              label={t("settings.profile.name.label")}
              value={formData.profile.name}
              onChange={(value) => updateFormField("profile", "name", value)}
              disabled={pageState === "saving"}
            />
            <SettingInput
              label={t("settings.profile.email.label")}
              value={formData.profile.email}
              onChange={(value) => updateFormField("profile", "email", value)}
              type="email"
              disabled={pageState === "saving"}
            />
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <h2>{t("settings.notifications.title")}</h2>

          <div className="space-y-2 divide-y divide-gray-100">
            <SettingSwitch
              label={t("settings.notifications.email.label")}
              description={t("settings.notifications.email.description")}
              isOn={formData.notifications.email}
              onChange={(checked) =>
                updateFormField("notifications", "email", checked)
              }
              disabled={pageState === "saving"}
            />
            <SettingSwitch
              label={t("settings.notifications.push.label")}
              description={t("settings.notifications.push.description")}
              isOn={formData.notifications.push}
              onChange={(checked) =>
                updateFormField("notifications", "push", checked)
              }
              disabled={pageState === "saving"}
            />
            <SettingSwitch
              label={t("settings.notifications.system.label")}
              description={t("settings.notifications.system.description")}
              isOn={formData.notifications.system}
              onChange={(checked) =>
                updateFormField("notifications", "system", checked)
              }
              disabled={pageState === "saving"}
            />
          </div>
        </div>


      </div>
    </div>
  );
}