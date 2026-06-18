export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: number;
  full_name: string;
  email: string;
  departement: string;
  role: Role;
}

export interface Level {
  id: number;
  name: string;
  year_level: number;
}

export interface SDay {
  id: number;
  day?: string;
  time: string;
  module_name?: string;
  module_code?: string;
  room?: string;
}

export interface StudentProfile {
  user: User;
  level: Level;
  student_id: string;
  academic_year: string;
  schedule?: Session[];
  sdays: SDay[];
}

export type Day = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Session {
  id: number;
  day: Day;
  module_name: string;
  module_code: string;
  time: string;
  room: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'excluded';
export type JustificationStatus = 'pending' | 'approved' | 'rejected' | null;

export interface AttendanceRecord {
  attendance_id: number;
  module_id: number;
  module_name: string;
  module_code?: string;
  room?: string;
  session_id: number;
  session_code?: string;
  session_date?: string;
  duration_minutes?: number;
  status: AttendanceStatus;
  has_justification?: boolean;
  justification_id?: number;
  justification_status?: JustificationStatus;
}

export type CalendarDayStatus = 0 | 1 | 2;
export type AttendanceHistory = Record<string, CalendarDayStatus>;

export interface Update {
  id: number;
  type: 'good' | 'warning' | 'bad';
  text: string;
}
