
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  workingHours: {
    weekdays: string;
    weekends: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  pageTitle: string;
  pageDescription: string;
}

interface ContactStore {
  contactInfo: ContactInfo;
  updateContactInfo: (info: Partial<ContactInfo>) => void;
  updateCoordinates: (lat: number, lng: number) => void;
}

export const useContactStore = create<ContactStore>()(
  persist(
    (set) => ({
      contactInfo: {
        address: 'Б.Сампсониевский 66Б, СПБ.',
        phone: '8-800-VITA-WIN (8-800-8482-946)',
        email: 'info@vitawins.ru',
        workingHours: {
          weekdays: 'Пн-Пт: 9:00-18:00',
          weekends: 'Сб-Вс: выходной'
        },
        coordinates: {
          latitude: 55.7558,
          longitude: 37.6173
        },
        pageTitle: 'Свяжитесь с нами',
        pageDescription: 'Мы всегда готовы ответить на ваши вопросы и помочь с выбором продуктов для здорового образа жизни'
      },
      updateContactInfo: (info) =>
        set((state) => ({
          contactInfo: { ...state.contactInfo, ...info }
        })),
      updateCoordinates: (latitude, longitude) =>
        set((state) => ({
          contactInfo: {
            ...state.contactInfo,
            coordinates: { latitude, longitude }
          }
        }))
    }),
    {
      name: 'contact-store'
    }
  )
);
