import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { CheckCircle, XCircle, Star, Award, Crown } from "lucide-react";

interface StatusLevel {
  name: string;
  alias: string;
  bgColor: string;
  color: string;
  icon: React.ReactNode;
  benefits: string[];
  restrictedBenefits: string[];
  description: string;
}

interface StatusBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusLevels: StatusLevel[];
}

const StatusBenefitsModal = ({ isOpen, onClose, statusLevels }: StatusBenefitsModalProps) => {
  const getStatusIcon = (statusName: string) => {
    switch (statusName) {
      case "Standard": return <Star className="h-5 w-5" />;
      case "Partner": return <Award className="h-5 w-5" />;
      case "Partner PRO": return <Crown className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName) {
      case "Standard": return "text-gray-600";
      case "Partner": return "text-emerald-600";
      case "Partner PRO": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  // Собираем все уникальные преимущества
  const allBenefits = Array.from(new Set([
    ...statusLevels.flatMap(level => level.benefits),
    ...statusLevels.flatMap(level => level.restrictedBenefits || [])
  ]));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Сравнение статусов участников</DialogTitle>
          <DialogDescription>
            Полная таблица преимуществ для каждого уровня участника
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Заголовки статусов */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="font-medium text-sm text-gray-700">Преимущества</div>
            {statusLevels.map((status) => (
              <div key={status.name} className="text-center">
                <div className={`flex items-center justify-center space-x-2 p-3 rounded-lg ${status.bgColor}`}>
                  <div className={status.color}>
                    {getStatusIcon(status.name)}
                  </div>
                  <span className={`font-semibold ${status.color}`}>{status.alias}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Таблица преимуществ */}
          <div className="space-y-2">
            {allBenefits.map((benefit, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center py-2 px-3 rounded hover:bg-gray-50">
                <div className="text-sm text-gray-700">{benefit}</div>
                {statusLevels.map((status) => (
                  <div key={status.name} className="text-center">
                    {status.benefits.includes(benefit) ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Описания статусов */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {statusLevels.map((status) => (
              <Card key={status.name} className={`border-2 ${status.bgColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={status.color}>
                      {getStatusIcon(status.name)}
                    </div>
                    <h3 className={`font-semibold ${status.color}`}>{status.alias}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{status.description}</p>
                  
                  <div className="mt-3">
                    <Badge variant="outline" className="text-xs">
                      {status.benefits.length} преимуществ
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatusBenefitsModal;