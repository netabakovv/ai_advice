import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  MessageCircle, 
  Settings,
  ChevronRight 
} from "lucide-react";
import { Badge } from "./ui/badge";

export type NotificationType = "info" | "success" | "warning" | "error" | "comment" | "system";

export interface NotificationItemProps {
  type: NotificationType;
  isUnread: boolean;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  linkLabel?: string;
  onMarkAsRead?: () => void;
  onClick?: () => void;
  onAction?: () => void;
}

const getNotificationConfig = (type: NotificationType) => {
  switch (type) {
    case "success":
      return {
        icon: CheckCircle,
        iconBgColor: "bg-green-100",
        iconColor: "text-green-600",
        borderColor: "border-green-200",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        iconBgColor: "bg-orange-100",
        iconColor: "text-orange-600",
        borderColor: "border-orange-200",
      };
    case "error":
      return {
        icon: XCircle,
        iconBgColor: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-200",
      };
    case "comment":
      return {
        icon: MessageCircle,
        iconBgColor: "bg-purple-100",
        iconColor: "text-purple-600",
        borderColor: "border-purple-200",
      };
    case "system":
      return {
        icon: Settings,
        iconBgColor: "bg-gray-100",
        iconColor: "text-gray-600",
        borderColor: "border-gray-200",
      };
    case "info":
    default:
      return {
        icon: Info,
        iconBgColor: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-200",
      };
  }
};

export function NotificationItem({
  type,
  isUnread,
  title,
  message,
  timestamp,
  source,
  linkLabel,
  onMarkAsRead,
  onClick,
  onAction,
}: NotificationItemProps) {
  const config = getNotificationConfig(type);
  const Icon = config.icon;

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer hover:border-blue-300 ${
        isUnread
          ? `bg-blue-50/50 ${config.borderColor}`
          : "bg-white border-gray-200"
      }`}
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`${config.iconBgColor} rounded-xl p-2 h-fit flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h4 className="text-gray-800 truncate">{title}</h4>
              {isUnread && (
                <Badge className="bg-blue-500 text-white hover:bg-blue-600 px-2 py-0 text-xs flex-shrink-0">
                  Новое
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
              {timestamp}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{source}</span>
            {linkLabel && (
              <button
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMarkAsRead) onMarkAsRead();
                  if (onAction) onAction();
                }}
              >
                {linkLabel}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}