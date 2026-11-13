export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
export type UserStatus = "ACTIVE" | "DISABLED";
export type SessionStatus = "SCHEDULED" | "CANCELLED";
export type EmojiType = "HAPPY" | "SAD" | "ANGRY" | "FEARFUL" | "SURPRISED" | "NEUTRAL";
export type RecordSource = "MANUAL" | "AI";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  teacher_id: string;
  is_active: boolean;
  created_at: string;
}

export interface ClassSession {
  id: string;
  course_id: string;
  class_name: string;
  starts_at: string;
  ends_at: string;
  status: SessionStatus;
  created_at: string;
}

export interface EmojiRecord {
  id: string;
  session_id: string;
  user_id: string | null;
  emoji_type: EmojiType;
  source: RecordSource;
  event_at: string;
  received_at: string;
  confidence: number | null;
  event_id: string | null;
  source_id: string | null;
}

export interface Page<T> {
  data: T[];
  meta: { limit: number; offset: number; total: number };
}

export interface StatisticsGroup {
  course?: string;
  class?: string;
  session?: string;
  emoji_type?: EmojiType;
  source?: RecordSource;
  period?: string;
  record_count: number;
  percentage: number;
  manual_count: number;
  ai_count: number;
  student_count: number;
}

export interface Statistics {
  total_records: number;
  manual_records: number;
  ai_records: number;
  student_count: number;
  groups: StatisticsGroup[];
}

export interface Dashboard {
  session_id: string;
  generated_at: string;
  window_minutes: number;
  counts: {
    manual: Record<EmojiType, number>;
    ai: Record<EmojiType, number>;
  };
  trend: Array<{ minute: string; emoji_type: EmojiType; source: RecordSource; count: number }>;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}
