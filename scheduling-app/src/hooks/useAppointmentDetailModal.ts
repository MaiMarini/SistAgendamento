import { useState } from 'react';

export function useAppointmentDetailModal<T = any>() {
  const [visible, setVisible] = useState(false);
  const [appointment, setAppointment] = useState<T | null>(null);

  const open = (appt: T) => {
    setAppointment(appt);
    setVisible(true);
  };

  const close = () => setVisible(false);

  return { visible, appointment, open, close };
}