import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { AnimatedMessage, MessageType } from '../components/AnimatedErrorMessage';

export function useAnimatedMessages() {
  const [messages, setMessages] = useState<AnimatedMessage[]>([]);

  const addMessage = useCallback((
    type: MessageType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      autoClose?: boolean;
    }
  ) => {
    const id = nanoid();
    const newMessage: AnimatedMessage = {
      id,
      type,
      title,
      message,
      duration: options?.duration || 5000,
      autoClose: options?.autoClose !== false, // Default to true
    };

    setMessages(prev => [...prev, newMessage]);
    return id;
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Convenience methods for different message types
  const showError = useCallback((title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => {
    return addMessage('error', title, message, options);
  }, [addMessage]);

  const showSuccess = useCallback((title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => {
    return addMessage('success', title, message, options);
  }, [addMessage]);

  const showWarning = useCallback((title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => {
    return addMessage('warning', title, message, options);
  }, [addMessage]);

  const showInfo = useCallback((title: string, message: string, options?: { duration?: number; autoClose?: boolean }) => {
    return addMessage('info', title, message, options);
  }, [addMessage]);

  return {
    messages,
    addMessage,
    removeMessage,
    clearAllMessages,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}