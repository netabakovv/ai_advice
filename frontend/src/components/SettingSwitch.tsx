import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

export interface SettingSwitchProps {
  label: string;
  description?: string;
  isOn: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingSwitch({
  label,
  description,
  isOn,
  onChange,
  disabled = false,
}: SettingSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <Label className="text-sm text-gray-800 cursor-pointer">{label}</Label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <Switch
        checked={isOn}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
