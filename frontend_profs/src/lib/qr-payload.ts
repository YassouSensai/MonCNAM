export type HodoryQrPayloadV1 = {
  v: 1;
  type: 'hodory.attendance.session';
  session: {
    id: number;
    code: string;
    moduleCode?: string;
    room?: string | null;
    startedAt?: string | null;
    durationMinutes?: number;
  };
};

export function encodeQrPayload(payload: HodoryQrPayloadV1) {
  // Keep payload compact for QR density.
  return JSON.stringify(payload);
}

