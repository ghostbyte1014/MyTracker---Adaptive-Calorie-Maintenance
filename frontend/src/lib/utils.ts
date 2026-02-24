import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getDayOfWeek(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateBMI(weight: number, height: number): number {
  // height in cm, weight in kg
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function formatNumber(num: number | null | undefined, decimals: number = 1): string {
  if (num === null || num === undefined) return '-';
  return num.toFixed(decimals);
}

export function formatNumberOrDash(num: number | null | undefined | string, decimals: number = 1): string {
  if (num === null || num === undefined || num === '-') return '-';
  if (typeof num === 'string') return num;
  return num.toFixed(decimals);
}

export function formatCalories(calories: number | null | undefined): string {
  if (calories === null || calories === undefined) return '-';
  return calories.toLocaleString();
}
