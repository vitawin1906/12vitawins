import { createContext, useContext, ReactNode } from 'react';
import { useAnimatedMessages } from '../hooks/use-animated-messages';
import { AnimatedMessageContainer } from '../components/AnimatedErrorMessage';
import type { MessageType } from '../components/AnimatedErrorMessage';

interface MessageContextType {
  showError: (title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => string;
  showSuccess: (title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => string;
  showWarning: (title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => string;
  showInfo: (title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => string;
  addMessage: (type: MessageType, title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => string;
  removeMessage: (id: string) => void;
  clearAllMessages: () => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

interface MessageProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export function MessageProvider({ children, position = 'top-right' }: MessageProviderProps) {
  const messageSystem = useAnimatedMessages();

  return (
    <MessageContext.Provider value={messageSystem}>
      {children}
      <AnimatedMessageContainer
        messages={messageSystem.messages}
        onClose={messageSystem.removeMessage}
        position={position}
      />
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
}