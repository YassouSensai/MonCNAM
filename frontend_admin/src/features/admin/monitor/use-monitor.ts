'use client';

import * as React from 'react';
import { fetchMonitorData, type ApiMonitorData } from '@/lib/admin-api';

export type MonitorSession = {
  id: string;
  moduleCode: string;
  moduleName: string;
  teacherName: string;
  startAt: string;
  status: 'active' | 'ended';
  expectedCount: number;
  presentCount: number;
  absentCount: number;
};

export type MonitorStudent = {
  id: number;
  name: string;
  email: string;
  levelName: string;
  enrollments: Array<{
    moduleId: number;
    moduleName: string;
    isExcluded: boolean;
    presentCount: number;
    absentCount: number;
  }>;
};

export type MonitorData = {
  sessions: MonitorSession[];
  students: MonitorStudent[];
  summary: ApiMonitorData['summary'];
  raw: ApiMonitorData;
};

function adaptMonitorData(data: ApiMonitorData): MonitorData {
  const sessions: MonitorSession[] = [];
  const students: MonitorStudent[] = [];

  for (const level of data.levels) {
    for (const module of level.modules) {
      for (const teacher of module.teachers) {
        for (const sess of teacher.sessions) {
          sessions.push({
            id: String(sess.session_id),
            moduleCode: module.code,
            moduleName: module.name,
            teacherName: teacher.name ?? '—',
            startAt: sess.date_time,
            status: sess.is_active ? 'active' : 'ended',
            expectedCount: sess.attendance_summary.total,
            presentCount: sess.attendance_summary.present,
            absentCount: sess.attendance_summary.absent,
          });
        }
      }
    }

    for (const student of level.students) {
      students.push({
        id: student.id,
        name: student.name ?? '—',
        email: student.email ?? '—',
        levelName: level.name,
        enrollments: student.enrollments.map((e) => {
          const present = e.attendance_records.filter((r) => r.status === 'PRESENT' || r.status === 'present').length;
          return {
            moduleId: e.module_id,
            moduleName: e.module_name ?? '—',
            isExcluded: e.is_excluded,
            presentCount: present,
            absentCount: e.number_of_absences,
          };
        }),
      });
    }
  }

  return { sessions, students, summary: data.summary, raw: data };
}

export function useMonitor() {
  const [data, setData] = React.useState<MonitorData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchMonitorData();
      setData(adaptMonitorData(raw));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load monitor data.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  return { data, loading, error, reload: load };
}
