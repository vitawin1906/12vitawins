import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCreateWithdrawalMutation } from "@/store/api/domains";

interface WithdrawalFormProps {
  currentBalance: number;
  onSuccess?: () => void;
}

interface WithdrawalFormData {
  amount: string;
  full_name: string;
  inn: string;
  bik: string;
  account_number: string;
}

export function WithdrawalForm({ currentBalance, onSuccess }: WithdrawalFormProps) {
  const [formData, setFormData] = useState<WithdrawalFormData>({
    amount: "",
    full_name: "",
    inn: "",
    bik: "",
    account_number: "",
  });

  const { toast } = useToast();
  const [createWithdrawal, { isLoading }] = useCreateWithdrawalMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);

    if (amount < 3500) {
      toast({
        title: "Ошибка",
        description: "Минимальная сумма для вывода: 3500 рублей",
        variant: "destructive",
      });
      return;
    }

    if (amount > currentBalance) {
      toast({
        title: "Ошибка",
        description: "Сумма превышает доступный баланс",
        variant: "destructive",
      });
      return;
    }

    if (!formData.full_name.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните ФИО получателя",
        variant: "destructive",
      });
      return;
    }

    if (!formData.account_number.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните номер карты/счета",
        variant: "destructive",
      });
      return;
    }

    try {
      await createWithdrawal({
        amountRub: formData.amount,
        method: "bank_transfer",
        destination: {
          full_name: formData.full_name,
          inn: formData.inn,
          bik: formData.bik,
          account_number: formData.account_number,
        },
        idempotencyKey: `${Date.now()}-${Math.random()}`,
      }).unwrap();

      toast({
        title: "Заявка создана",
        description: "Ваша заявка на вывод средств отправлена на рассмотрение",
      });

      setFormData({
        amount: "",
        full_name: "",
        inn: "",
        bik: "",
        account_number: "",
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.error || "Не удалось создать заявку на вывод",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof WithdrawalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.amount && formData.full_name && formData.account_number && 
                     parseFloat(formData.amount) >= 3500 && parseFloat(formData.amount) <= currentBalance;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Вывод средств</CardTitle>
        <CardDescription>
          Минимальная сумма вывода: 3500 рублей
          <br />
          Доступно к выводу: {currentBalance.toLocaleString()} ₽
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма к выводу</Label>
            <Input
              id="amount"
              type="number"
              placeholder="3500"
              min="3500"
              max={currentBalance}
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">ФИО получателя</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Иванов Иван Иванович"
              value={formData.full_name}
              onChange={(e) => handleInputChange("full_name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inn">ИНН (опционально)</Label>
            <Input
              id="inn"
              type="text"
              placeholder="1234567890"
              value={formData.inn}
              onChange={(e) => handleInputChange("inn", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bik">БИК банка (опционально)</Label>
            <Input
              id="bik"
              type="text"
              placeholder="044525225"
              value={formData.bik}
              onChange={(e) => handleInputChange("bik", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Номер карты/счета</Label>
            <Input
              id="account_number"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={formData.account_number}
              onChange={(e) => handleInputChange("account_number", e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "Создание заявки..." : "Создать заявку"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}