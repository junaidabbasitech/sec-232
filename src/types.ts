export interface HTSItem {
  code: string;
  description: string;
  annex: string;
  page: number;
  category?: string;
  subdivision?: string;
  additionalTariff?: string;
  dutyRate?: string;
  notes?: string;
}

export type Theme = 'light' | 'dark';

export interface KeyHighlight {
  title: string;
  points: string[];
}
