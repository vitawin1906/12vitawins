import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useGetMyWithdrawalsQuery } from "@/store/api/domains";

export function WithdrawalHistory() {
  const { data: withdrawals = [], isLoading, error } = useGetMyWithdrawalsQuery({});

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">На рассмотрении</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Одобрено</Badge>;
      case "rejected":
        return <Badge variant="destructive">Отклонено</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-blue-500">Выплачено</Badge>;
      case "cancelled":
        return <Badge variant="outline">Отменено</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Загрузка заявок...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Ошибка при загрузке заявок на вывод</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История заявок на вывод</CardTitle>
        <CardDescription>
          Все ваши заявки на вывод средств
        </CardDescription>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            У вас пока нет заявок на вывод средств
          </p>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {parseFloat(withdrawal.amountRub).toLocaleString()} ₽
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Метод: {withdrawal.method}
                    </p>
                    {withdrawal.destination && (
                      <p className="text-sm text-muted-foreground">
                        {JSON.stringify(withdrawal.destination)}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(withdrawal.status)}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(withdrawal.requestedAt), "dd.MM.yyyy HH:mm", {
                        locale: ru,
                      })}
                    </p>
                  </div>
                </div>

                {withdrawal.processedAt && (
                  <div className="text-xs text-muted-foreground">
                    Обработано:{" "}
                    {format(new Date(withdrawal.processedAt), "dd.MM.yyyy HH:mm", {
                      locale: ru,
                    })}
                  </div>
                )}

                {withdrawal.paidAt && (
                  <div className="text-xs text-green-600">
                    Выплачено:{" "}
                    {format(new Date(withdrawal.paidAt), "dd.MM.yyyy HH:mm", {
                      locale: ru,
                    })}
                  </div>
                )}

                {withdrawal.cancelledAt && (
                  <div className="text-xs text-muted-foreground">
                    Отменено:{" "}
                    {format(new Date(withdrawal.cancelledAt), "dd.MM.yyyy HH:mm", {
                      locale: ru,
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}