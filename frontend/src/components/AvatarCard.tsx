import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

export interface AvatarCardProps {
  imageUrl: string;
  label: string;
  ctaLabel: string;
  onChangePhoto?: () => void;
}

export function AvatarCard({
  imageUrl,
  label,
  ctaLabel,
  onChangePhoto,
}: AvatarCardProps) {
  // Получаем инициалы из label
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="w-20 h-20">
        <AvatarImage src={imageUrl} alt={label} />
        <AvatarFallback className="bg-gradient-to-br from-[#4A6CF7] to-[#C56CF0] text-white text-xl">
          {getInitials(label)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm text-gray-800 mb-2">{label}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onChangePhoto}
          className="rounded-xl text-xs"
        >
          <Camera className="w-3 h-3 mr-2" />
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
