import type { MessageKey } from '@/shared/i18n';

export const COLORS: { value: string; name: MessageKey }[] = [
  { value: '#1f1a2e', name: 'color.black' },
  { value: '#e63946', name: 'color.red' },
  { value: '#ff8c1a', name: 'color.orange' },
  { value: '#ffc93c', name: 'color.yellow' },
  { value: '#2a9d4b', name: 'color.green' },
  { value: '#2b7de9', name: 'color.blue' },
  { value: '#7c5cff', name: 'color.purple' },
  { value: '#ff6fae', name: 'color.pink' },
];

export const SIZES: { value: number; dot: number; label: MessageKey }[] = [
  { value: 8, dot: 6, label: 'draw.sizeSmall' },
  { value: 18, dot: 12, label: 'draw.sizeMedium' },
  { value: 34, dot: 20, label: 'draw.sizeLarge' },
];
