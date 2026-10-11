import type { IconName } from '../../atoms/Icon';

export interface NavLink {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

export interface NavSection {
  section: string;
}

export type NavEntry = NavLink | NavSection;

export const isSection = (e: NavEntry): e is NavSection => 'section' in e;
