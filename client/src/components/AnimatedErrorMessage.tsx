import { useState, useEffect } from 'react';
import { AlertCircle, X, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type MessageType = 'error' | 'success' | 'warning' | 'info';

export interface AnimatedMessage {
  id: string;
  type: MessageType;
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

interface AnimatedErrorMessageProps {
  message: AnimatedMessage;
  onClose: (id: string) => void;
}

const messageIcons = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const messageColors = {
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

export function AnimatedErrorMessage({ message, onClose }: AnimatedErrorMessageProps) {
  const [progress, setProgress] = useState(100);
  const Icon = messageIcons[message.type];
  const colors = messageColors[message.type];
  const duration = message.duration || 5000;

  useEffect(() => {
    if (!message.autoClose) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        onClose(message.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [message.id, message.autoClose, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3
      }}
      className={`
        relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm
        ${colors.bg} ${colors.border}
        max-w-md w-full mx-auto
      `}
    >
      {/* Progress bar */}
      {message.autoClose && (
        <div className="absolute top-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full">
          <motion.div
            className={`h-full ${
              message.type === 'error' ? 'bg-red-500' :
              message.type === 'success' ? 'bg-emerald-500' :
              message.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
          >
            <Icon className={`w-6 h-6 ${colors.icon} flex-shrink-0 mt-0.5`} />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.h4
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={`text-sm font-semibold ${colors.text}`}
            >
              {message.title}
            </motion.h4>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-sm mt-1 ${colors.text} opacity-90`}
            >
              {message.message}
            </motion.p>
          </div>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            onClick={() => onClose(message.id)}
            className={`
              flex-shrink-0 p-1 rounded-full transition-colors
              hover:bg-gray-200 dark:hover:bg-gray-700
              ${colors.text}
            `}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

interface AnimatedMessageContainerProps {
  messages: AnimatedMessage[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export function AnimatedMessageContainer({ 
  messages, 
  onClose, 
  position = 'top-right' 
}: AnimatedMessageContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} pointer-events-none`}>
      <div className="flex flex-col gap-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <AnimatedErrorMessage
              key={message.id}
              message={message}
              onClose={onClose}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}