import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

export interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled = false,
  id,
}: CheckboxFieldProps) {
  const fieldId = id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={fieldId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label
        htmlFor={fieldId}
        className="text-sm text-gray-700 cursor-pointer"
      >
        {label}
      </Label>
    </div>
  );
}
