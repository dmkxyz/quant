import type { ProblemDay } from "./contracts";

const dayNames: ProblemDay[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayForDate(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + delta);
  return monday;
}

export function nextMondayAfter(date: Date): Date {
  const monday = mondayForDate(date);
  monday.setDate(monday.getDate() + 7);
  return monday;
}

export function todayProblemDay(date = new Date()): ProblemDay {
  const day = dayNames[date.getDay()];
  if (day === "sunday") return "saturday";
  return day;
}

export function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}
