'use client';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api') as string;

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match?.[1] ?? null;
}

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(body?.detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type ApiLevel = { id: number; name: string; year_level: number };

export type ApiStudent = {
  id: number;
  full_name: string | null;
  email: string | null;
  department: string | null;
  is_active: boolean | null;
  level: ApiLevel | null;
  enrollments_count: number;
};

export type ApiTeacher = {
  id: number;
  full_name: string | null;
  email: string | null;
  department: string | null;
  is_active: boolean | null;
  assigned_modules_count: number;
  assigned_modules: string[];
};

// Students
export async function fetchStudents(): Promise<ApiStudent[]> {
  const res = await adminFetch<{ data: ApiStudent[] }>('/admin/students?limit=500');
  return res.data;
}

export async function createStudent(data: {
  full_name: string;
  email: string;
  password: string;
  department: string;
  level_id: number;
}): Promise<void> {
  await adminFetch('/admin/students', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStudent(
  id: number,
  data: { full_name?: string; email?: string; department?: string; level_id?: number }
): Promise<void> {
  await adminFetch(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteStudent(id: number): Promise<void> {
  await adminFetch(`/admin/students/${id}`, { method: 'DELETE' });
}

// Teachers
export async function fetchTeachers(): Promise<ApiTeacher[]> {
  const res = await adminFetch<{ data: ApiTeacher[] }>('/admin/teachers?limit=500');
  return res.data;
}

export async function createTeacher(data: {
  full_name: string;
  email: string;
  password: string;
  department: string;
}): Promise<void> {
  await adminFetch('/admin/teachers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTeacher(
  id: number,
  data: { full_name?: string; email?: string; department?: string }
): Promise<void> {
  await adminFetch(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteTeacher(id: number): Promise<void> {
  await adminFetch(`/admin/teachers/${id}`, { method: 'DELETE' });
}

// Levels
export async function fetchLevels(): Promise<ApiLevel[]> {
  const res = await adminFetch<{ data: ApiLevel[] }>('/admin/levels');
  return res.data;
}

export type ApiSDay = {
  id: number;
  day: string;
  time: string;
  module_id: number;
  module_name: string | null;
  module_code: string | null;
  week_start: string | null; // YYYY-MM-DD ou null = template
};

export type ApiSchedule = {
  id: number;
  last_updated: string | null;
  sdays: ApiSDay[];
  sdays_count: number;
};

export type ApiLevelWithSchedule = ApiLevel & {
  modules: ApiModule[];
  module_count: number;
  schedule: ApiSchedule | null;
};

export async function fetchLevelsWithSchedule(weekStart?: string): Promise<ApiLevelWithSchedule[]> {
  const qs = weekStart ? `?week_start=${weekStart}` : '';
  const res = await adminFetch<{ data: ApiLevelWithSchedule[] }>(`/admin/levels${qs}`);
  return res.data;
}

// Modules
export type ApiModule = {
  id: number;
  name: string;
  code: string;
  room: string | null;
  level: ApiLevel | null;
};

export async function fetchModules(): Promise<ApiModule[]> {
  const res = await adminFetch<{ data: ApiModule[] }>('/admin/modules?limit=500');
  return res.data;
}

// Teacher-modules
export type ApiTeacherModule = {
  id: number;
  teacher: {
    id: number | null;
    user_id: number | null;
    full_name: string | null;
    email: string | null;
    department: string | null;
  } | null;
  module: {
    id: number | null;
    name: string | null;
    code: string | null;
    level: ApiLevel | null;
  } | null;
};

export async function fetchTeacherModules(): Promise<ApiTeacherModule[]> {
  const res = await adminFetch<{ data: ApiTeacherModule[] }>('/admin/teacher-modules');
  return res.data;
}

export async function deleteTeacherModuleAssignment(id: number): Promise<void> {
  await adminFetch(`/admin/teacher-modules/${id}`, { method: 'DELETE' });
}

// Schedules / SDays
export async function createScheduleForLevel(level_id: number): Promise<void> {
  await adminFetch('/admin/schedules', { method: 'POST', body: JSON.stringify({ level_id }) });
}

export async function addSday(data: {
  level_id: number;
  day: string;
  time: string;
  module_id: number;
  week_start?: string | null;
}): Promise<ApiSDay> {
  const res = await adminFetch<{ data: ApiSDay }>('/admin/sdays', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateSday(
  id: number,
  data: { day?: string; time?: string; module_id?: number; week_start?: string | null }
): Promise<ApiSDay> {
  const res = await adminFetch<{ data: ApiSDay }>(`/admin/sdays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteSday(id: number): Promise<void> {
  await adminFetch(`/admin/sdays/${id}`, { method: 'DELETE' });
}

// Monitor
export type ApiMonitorSession = {
  session_id: number;
  session_code: string;
  date_time: string;
  duration_minutes: number | null;
  is_active: boolean;
  attendance_summary: { total: number; present: number; absent: number };
};

export type ApiMonitorModuleTeacher = {
  teacher_module_id: number;
  teacher_id: number | null;
  name: string | null;
  email: string | null;
  sessions: ApiMonitorSession[];
};

export type ApiMonitorModule = {
  id: number;
  name: string;
  code: string;
  room: string | null;
  teachers: ApiMonitorModuleTeacher[];
};

export type ApiMonitorEnrollment = {
  enrollment_id: number;
  module_id: number;
  module_name: string | null;
  is_excluded: boolean;
  number_of_absences: number;
  number_of_absences_justified: number;
  attendance_records: Array<{
    record_id: number;
    session_id: number;
    session_date: string | null;
    status: string;
  }>;
};

export type ApiMonitorStudent = {
  id: number;
  user_id: number;
  name: string | null;
  email: string | null;
  enrollments: ApiMonitorEnrollment[];
};

export type ApiMonitorLevel = {
  id: number;
  name: string;
  year_level: number;
  students: ApiMonitorStudent[];
  modules: ApiMonitorModule[];
  schedule: {
    id: number;
    last_updated: string | null;
    days: Array<{ id: number; day: string; time: string; module_id: number; module_name: string | null }>;
  } | null;
};

export type ApiMonitorData = {
  levels: ApiMonitorLevel[];
  summary: {
    total_levels: number;
    total_students: number;
    total_teachers: number;
    total_modules: number;
    total_sessions: number;
    total_attendance_records: number;
    attendance_stats: { present: number; absent: number; excluded: number };
    attendance_rate: number;
  };
};

export async function fetchMonitorData(): Promise<ApiMonitorData> {
  const res = await adminFetch<{ data: ApiMonitorData }>('/admin/monitor');
  return res.data;
}
