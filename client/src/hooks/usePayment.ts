
import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface PaymentData {
  amount: number;
  orderId: string;
  description: string;
  customerEmail?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  error?: string;
}

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const createPayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('tinkoff-payment', {
        body: paymentData,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Ошибка создания платежа');
      }

      return {
        success: true,
        paymentId: data.paymentId,
        paymentUrl: data.paymentUrl,
      };

    } catch (error) {
      
      toast({
        title: "Ошибка оплаты",
        description: error instanceof Error ? error.message : "Не удалось создать платеж",
        variant: "destructive",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const redirectToPayment = (paymentUrl: string) => {
    // Перенаправляем пользователя на страницу оплаты Тинькофф
    window.location.href = paymentUrl;
  };

  return {
    createPayment,
    redirectToPayment,
    isProcessing,
  };
};
