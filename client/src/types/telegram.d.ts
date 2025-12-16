declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        initDataUnsafe?: {
          user?: {
            id: string;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date?: number;
          hash?: string;
        };
        initData?: string;
        version?: string;
        platform?: string;
        colorScheme?: 'light' | 'dark';
        themeParams?: any;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        isClosingConfirmationEnabled?: boolean;
        BackButton?: any;
        MainButton?: any;
        close(): void;
        expand(): void;
        sendData(data: string): void;
      };
    };
  }
}

export {};