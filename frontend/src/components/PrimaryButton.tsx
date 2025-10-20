import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export interface PrimaryButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}

export function PrimaryButton({
  label,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
}: PrimaryButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white hover:from-[#3A5CE7] hover:to-[#B55CE0] rounded-xl"
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {label}
    </Button>
  );
}
