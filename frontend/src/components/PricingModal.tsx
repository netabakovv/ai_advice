import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Lock, Check } from "lucide-react";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: "basic" | "pro" | "team";
  onSelect?: (planId: string, period: "monthly" | "yearly") => void;
}

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  subtitle?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeature[];
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Базовый",
    subtitle: "Всегда доступен",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { text: "До 3 встреч в месяц" },
      { text: "Базовая аналитика" },
      { text: "Хранение записей 7 дней" },
    ],
  },
  {
    id: "pro",
    name: "Про",
    monthlyPrice: 990,
    yearlyPrice: 790,
    badge: "Популярный",
    features: [
      { text: "Безлимит встреч" },
      { text: "Полная аналитика + советы от ИИ" },
      { text: "История встреч — 6 месяцев" },
      { text: "Приоритетная обработка" },
    ],
  },
  {
    id: "team",
    name: "Команда",
    monthlyPrice: 2490,
    yearlyPrice: 1990,
    features: [
      { text: "Всё из тарифа «Про»" },
      { text: "Совместный календарь" },
      { text: "Отчёты по команде" },
      { text: "До 20 участников" },
      { text: "Менеджер поддержки" },
    ],
  },
];

export function PricingModal({ open, onOpenChange, currentPlan = "basic", onSelect }: PricingModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const calculateYearlySavings = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return 0;
    return monthlyPrice * 12 - monthlyPrice * 12 * 0.8;
  };

  const getPlanName = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId);
    return plan ? plan.name : "Базовый";
  };

  const handleSelectPlan = (planId: string) => {
    if (onSelect) {
      onSelect(planId, billingPeriod);
    }
    // Можно закрыть модалку после выбора
    // onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Выберите тариф</DialogTitle>
          <p className="text-center text-gray-600 text-sm mt-2">
            Ваш текущий тариф: <span className="font-medium">{getPlanName(currentPlan)}</span>
          </p>
        </DialogHeader>

        {/* Billing Period Toggle */}
        <div className="flex flex-col items-center gap-3 mt-6 mb-8">
          <div className="flex gap-2 bg-gray-100 rounded-2xl p-2">
            <Button
              variant={billingPeriod === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingPeriod("monthly")}
              className={
                billingPeriod === "monthly"
                  ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white rounded-xl min-w-[100px]"
                  : "rounded-xl min-w-[100px]"
              }
            >
              Месяц
            </Button>
            <Button
              variant={billingPeriod === "yearly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingPeriod("yearly")}
              className={
                billingPeriod === "yearly"
                  ? "bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white rounded-xl min-w-[100px]"
                  : "rounded-xl min-w-[100px]"
              }
            >
              Год
            </Button>
          </div>
          {billingPeriod === "yearly" && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Сэкономьте 20%
            </Badge>
          )}
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const yearlySavings = calculateYearlySavings(plan.monthlyPrice);

            return (
              <div
                key={plan.id}
                className={`bg-white border-2 rounded-2xl p-6 flex flex-col ${
                  plan.badge ? "border-blue-500 relative" : "border-gray-200"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white hover:from-[#4A6CF7] hover:to-[#C56CF0]">
                    {plan.badge}
                  </Badge>
                )}

                {/* Plan Name */}
                <div className="text-center mb-4">
                  <h3 className="mb-1">{plan.name}</h3>
                  {plan.subtitle && (
                    <p className="text-sm text-gray-500">{plan.subtitle}</p>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice === 0 ? (
                    <div className="text-center">
                      <span className="text-gray-800">Бесплатно</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-gray-800">{price.toLocaleString("ru-RU")}</span>
                        <span className="text-gray-600 text-sm">₽/мес</span>
                      </div>
                      {billingPeriod === "yearly" && (
                        <>
                          <div className="text-xs text-gray-500">
                            всего {(price * 12).toLocaleString("ru-RU")} ₽/год
                          </div>
                          {yearlySavings > 0 && (
                            <div className="text-xs text-green-600 mt-1">
                              экономия {yearlySavings.toLocaleString("ru-RU")} ₽
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    Текущий тариф
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={
                      plan.badge
                        ? "w-full bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] text-white hover:from-[#3A5CE7] hover:to-[#B55CE0] rounded-xl"
                        : "w-full rounded-xl"
                    }
                    variant={plan.badge ? "default" : "outline"}
                  >
                    Выбрать
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 pt-4 border-t border-gray-200">
          <Lock className="w-4 h-4" />
          <span>Оплата безопасна. В любой момент можно сменить или отменить тариф.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
