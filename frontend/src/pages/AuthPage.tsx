import { useState, FormEvent } from "react";
import { AuthTitle } from "../components/AuthTitle";
import { TextField } from "../components/TextField";
import { PasswordField } from "../components/PasswordField";
import { PrimaryButton } from "../components/PrimaryButton";
import { CheckboxField } from "../components/CheckboxField";
import { LinkText } from "../components/LinkText";
import { AuthAlert } from "../components/AuthAlert";

// API Types
interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

interface AuthSuccessResponse {
  ok: true;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AuthErrorResponse {
  ok: false;
  code: "INVALID_CREDENTIALS" | "LOCKED" | "RATE_LIMIT" | "EMAIL_EXISTS" | "WEAK_PASSWORD";
  message: string;
}

type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

interface UserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

// Mock API
const mockApiDelay = () => new Promise((resolve) => setTimeout(resolve, 1000));

const mockLogin = async (data: LoginRequest): Promise<AuthResponse> => {
  await mockApiDelay();
  
  if (data.email === "locked@example.com") {
    return {
      ok: false,
      code: "LOCKED",
      message: "Account is locked due to too many failed login attempts",
    };
  }
  
  if (data.email === "ratelimit@example.com") {
    return {
      ok: false,
      code: "RATE_LIMIT",
      message: "Too many login attempts. Please try again later",
    };
  }
  
  if (data.email !== "ivan.petrov@company.com" || data.password !== "password123") {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    };
  }
  
  return { ok: true };
};

const mockRegister = async (data: SignupRequest): Promise<AuthResponse> => {
  await mockApiDelay();
  
  if (data.email === "existing@example.com") {
    return {
      ok: false,
      code: "EMAIL_EXISTS",
      message: "Email already exists",
    };
  }
  
  if (data.password.length < 6) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password is too weak",
    };
  }
  
  return {
    ok: true,
    user: {
      id: "new-user-id",
      name: data.name,
      email: data.email,
    },
  };
};

const mockGetMe = async (): Promise<UserResponse> => {
  await mockApiDelay();
  return {
    user: {
      id: "1",
      name: "Иван Петров",
      email: "ivan.petrov@company.com",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    },
  };
};

// i18n translations
const t = (key: string): string => {
  const translations: Record<string, string> = {
    "auth.title.login": "Вход в аккаунт",
    "auth.title.signup": "Создание аккаунта",
    "auth.subtitle.login": "Войдите, чтобы продолжить работу с Timeflow",
    "auth.subtitle.signup": "Создайте аккаунт для начала работы",
    "auth.name.label": "Имя",
    "auth.name.placeholder": "Иван Петров",
    "auth.email.label": "Email",
    "auth.email.placeholder": "ivan@company.com",
    "auth.password.label": "Пароль",
    "auth.password.placeholder": "Введите пароль",
    "auth.confirm.label": "Подтверждение пароля",
    "auth.confirm.placeholder": "Повторите пароль",
    "auth.remember": "Запомнить меня",
    "auth.loginCta": "Войти",
    "auth.signupCta": "Создать аккаунт",
    "auth.forgot": "Забыли пароль?",
    "auth.toggle.toSignup": "Нет аккаунта? Создать",
    "auth.toggle.toLogin": "Уже есть аккаунт? Войти",
    "auth.error.generic": "Произошла ошибка. Попробуйте еще раз",
    "auth.error.invalid": "Неверный email или пароль",
    "auth.error.locked": "Аккаунт заблокирован из-за множественных неудачных попыток входа",
    "auth.error.ratelimit": "Слишком много попыток входа. Попробуйте позже",
    "auth.error.email_exists": "Пользователь с таким email уже существует",
    "auth.error.weak_password": "Пароль слишком слабый",
    "auth.error.name.required": "Введите имя",
    "auth.error.email.required": "Введите email",
    "auth.error.email.invalid": "Введите корректный email",
    "auth.error.password.required": "Введите пароль",
    "auth.error.password.minlength": "Пароль должен содержать минимум 6 символов",
    "auth.error.confirm.required": "Подтвердите пароль",
    "auth.error.confirm.mismatch": "Пароли не совпадают",
  };
  return translations[key] || key;
};

type FormState = "idle" | "submitting" | "error" | "success";
type AuthMode = "login" | "signup";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface AuthPageProps {
  onLoginSuccess?: () => void;
  initialMode?: AuthMode;
}

export function AuthPage({ onLoginSuccess, initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formState, setFormState] = useState<FormState>("idle");
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);
  
  // Errors
  const [serverError, setServerError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  // Client-side validation
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return t("auth.error.email.required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t("auth.error.email.invalid");
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return t("auth.error.password.required");
    }
    if (password.length < 6) {
      return t("auth.error.password.minlength");
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) {
      return t("auth.error.name.required");
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) {
      return t("auth.error.confirm.required");
    }
    if (confirmPassword !== password) {
      return t("auth.error.confirm.mismatch");
    }
    return undefined;
  };

  const validateLoginForm = (): boolean => {
    const errors: FormErrors = {};
    
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignupForm = (): boolean => {
    const errors: FormErrors = {};
    
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword, password);
    
    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (confirmError) errors.confirmPassword = confirmError;
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    
    setServerError("");
    setFieldErrors({});
    
    if (!validateLoginForm()) {
      return;
    }
    
    setFormState("submitting");
    
    try {
      const response = await mockLogin({ email, password, remember });
      
      if (!response.ok) {
        const errorMap: Record<string, string> = {
          INVALID_CREDENTIALS: "auth.error.invalid",
          LOCKED: "auth.error.locked",
          RATE_LIMIT: "auth.error.ratelimit",
        };
        
        const errorKey = errorMap[response.code] || "auth.error.generic";
        setServerError(t(errorKey));
        setFormState("error");
        return;
      }
      
      await mockGetMe();
      setFormState("success");
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error("Login error:", error);
      setServerError(t("auth.error.generic"));
      setFormState("error");
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    
    setServerError("");
    setFieldErrors({});
    
    if (!validateSignupForm()) {
      return;
    }
    
    setFormState("submitting");
    
    try {
      const response = await mockRegister({ name, email, password });
      
      if (!response.ok) {
        const errorMap: Record<string, string> = {
          EMAIL_EXISTS: "auth.error.email_exists",
          WEAK_PASSWORD: "auth.error.weak_password",
        };
        
        const errorKey = errorMap[response.code] || "auth.error.generic";
        setServerError(t(errorKey));
        setFormState("error");
        return;
      }
      
      // Auto-login after signup
      await mockGetMe();
      setFormState("success");
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error("Signup error:", error);
      setServerError(t("auth.error.generic"));
      setFormState("error");
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setServerError("");
    setFieldErrors({});
    setFormState("idle");
  };

  const handleForgotPassword = () => {
    console.log("Navigate to /forgot");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-[480px] w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#4A6CF7] to-[#C56CF0] rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <AuthTitle text={t(mode === "login" ? "auth.title.login" : "auth.title.signup")} />
          <p className="text-sm text-gray-600 mt-2">
            {t(mode === "login" ? "auth.subtitle.login" : "auth.subtitle.signup")}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-6">
            {/* Server Error Alert */}
            {serverError && formState === "error" && (
              <AuthAlert message={serverError} variant="error" />
            )}

            {/* Signup Name Field */}
            {mode === "signup" && (
              <TextField
                label={t("auth.name.label")}
                value={name}
                placeholder={t("auth.name.placeholder")}
                error={fieldErrors.name}
                onChange={(value) => {
                  setName(value);
                  if (fieldErrors.name) {
                    setFieldErrors({ ...fieldErrors, name: undefined });
                  }
                }}
                disabled={formState === "submitting"}
                id="name"
              />
            )}

            {/* Email Field */}
            <TextField
              label={t("auth.email.label")}
              value={email}
              placeholder={t("auth.email.placeholder")}
              error={fieldErrors.email}
              onChange={(value) => {
                setEmail(value);
                if (fieldErrors.email) {
                  setFieldErrors({ ...fieldErrors, email: undefined });
                }
              }}
              type="email"
              disabled={formState === "submitting"}
              id="email"
            />

            {/* Password Field */}
            <PasswordField
              label={t("auth.password.label")}
              value={password}
              placeholder={t("auth.password.placeholder")}
              error={fieldErrors.password}
              onChange={(value) => {
                setPassword(value);
                if (fieldErrors.password) {
                  setFieldErrors({ ...fieldErrors, password: undefined });
                }
              }}
              disabled={formState === "submitting"}
              id="password"
            />

            {/* Signup Confirm Password Field */}
            {mode === "signup" && (
              <PasswordField
                label={t("auth.confirm.label")}
                value={confirmPassword}
                placeholder={t("auth.confirm.placeholder")}
                error={fieldErrors.confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                  }
                }}
                disabled={formState === "submitting"}
                id="confirmPassword"
              />
            )}

            {/* Login Remember Me & Forgot Password */}
            {mode === "login" && (
              <div className="flex items-center justify-between">
                <CheckboxField
                  label={t("auth.remember")}
                  checked={remember}
                  onChange={setRemember}
                  disabled={formState === "submitting"}
                />
                <LinkText
                  label={t("auth.forgot")}
                  onClick={handleForgotPassword}
                />
              </div>
            )}

            {/* Submit Button */}
            <PrimaryButton
              label={t(mode === "login" ? "auth.loginCta" : "auth.signupCta")}
              type="submit"
              loading={formState === "submitting"}
              disabled={formState === "submitting"}
            />
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <LinkText
              label={t(mode === "login" ? "auth.toggle.toSignup" : "auth.toggle.toLogin")}
              onClick={toggleMode}
            />
          </div>

          {/* Demo credentials hint (only for login) */}
          {mode === "login" && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-800 mb-2 font-medium">
                Демо-доступ:
              </p>
              <p className="text-xs text-blue-700">
                Email: ivan.petrov@company.com
              </p>
              <p className="text-xs text-blue-700">
                Пароль: password123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
