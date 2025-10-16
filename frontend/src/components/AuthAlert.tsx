import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle, Info } from "lucide-react";

export interface AuthAlertProps {
  message: string;
  variant?: "error" | "info";
}

export function AuthAlert({ message, variant = "error" }: AuthAlertProps) {
  return (
    <Alert
      variant={variant === "error" ? "destructive" : "default"}
      className="rounded-xl"
      role="alert"
      aria-live="polite"
    >
      {variant === "error" ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
