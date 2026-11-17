import type { IconName } from './icons';

/** Icon shown next to each health guide (by its file name). */
const HEALTH_ICONS: Record<string, IconName> = {
  'what-is-ebola': 'circle-help',
  symptoms: 'thermometer',
  transmission: 'droplets',
  prevention: 'shield-check',
  'vaccines-treatment': 'syringe',
  'myths-facts': 'message-circle-question',
  'bundibugyo-virus': 'microscope',
  contacts: 'users',
  'safe-burials': 'flower-2',
  survivors: 'hand-heart',
  travel: 'plane',
};

export const healthIcon = (slug: string): IconName => HEALTH_ICONS[slug] ?? 'book-open';
