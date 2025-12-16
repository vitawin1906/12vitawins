
export type DeliveryStatus = 
  | 'processing' 
  | 'packed' 
  | 'shipped' 
  | 'in_transit' 
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export interface DeliveryStatusInfo {
  status: DeliveryStatus;
  label: string;
  description: string;
  timestamp: string;
  location?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: 'sdek' | 'russianpost' | 'yandex';
  carrierName: string;
  status: DeliveryStatus;
  estimatedDelivery: string;
  statusHistory: DeliveryStatusInfo[];
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  deliveryId?: string;
  createdAt: string;
}
