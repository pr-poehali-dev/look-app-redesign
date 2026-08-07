import React from 'react';
import { LucideProps } from 'lucide-react';

/**
 * Кастомная иконка "Поделиться" — точная копия формы, загруженной пользователем.
 * Используется вместо стандартной lucide-иконки Forward.
 */
export const ShareForward: React.FC<LucideProps> = ({ size = 24, color = 'currentColor', className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
    {...rest}
  >
    <path d="M12.5,6.5 L21,12 L12.5,17.5 L12.5,14.3 C8.2,14.4 5.5,15.9 4.2,19.2 C4,19.7 3.7,19.7 3.55,19.3 C3.15,18.2 3.15,15.9 4.3,13.7 C5.9,10.7 8.7,9.1 12.5,9 Z" />
  </svg>
);

/**
 * Кастомная иконка "Комментарии" — круглый пузырь диалога с хвостиком и тремя точками.
 */
export const MessageDots: React.FC<LucideProps> = ({ size = 24, color = 'currentColor', className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    {...rest}
  >
    <path
      d="M12 3C7.03 3 3 6.58 3 11c0 2.36 1.13 4.47 2.94 5.9-0.08 0.97-0.44 2.25-1.34 3.4-0.2 0.25 0 0.6 0.3 0.55 1.8-0.3 3.2-1.1 4.05-1.7 0.95 0.25 1.98 0.35 3.05 0.35 4.97 0 9-3.58 9-8s-4.03-8-9-8z"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
    />
    <circle cx="8.2" cy="11" r="1.3" fill={color} />
    <circle cx="12" cy="11" r="1.3" fill={color} />
    <circle cx="15.8" cy="11" r="1.3" fill={color} />
  </svg>
);

export const CUSTOM_ICONS: Record<string, React.FC<LucideProps>> = {
  ShareForward,
  MessageDots,
};