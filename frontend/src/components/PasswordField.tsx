import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function PasswordField({
  label,
  value,
  placeholder,
  error,
  onChange,
  disabled = false,
  id,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-sm text-gray-700">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={fieldId}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`bg-white border-gray-200 rounded-xl pr-10 ${
            error ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-500" />
          ) : (
            <Eye className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
