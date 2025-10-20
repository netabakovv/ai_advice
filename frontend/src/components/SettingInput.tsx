import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface SettingInputProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}

export function SettingInput({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  placeholder,
}: SettingInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-gray-700">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="bg-white border-gray-200 rounded-xl"
      />
    </div>
  );
}
