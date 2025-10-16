import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  id?: string;
}

export function TextField({
  label,
  value,
  placeholder,
  error,
  onChange,
  type = "text",
  disabled = false,
  id,
}: TextFieldProps) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-sm text-gray-700">
        {label}
      </Label>
      <Input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`bg-white border-gray-200 rounded-xl ${
          error ? "border-red-500 focus-visible:ring-red-500" : ""
        }`}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
