import { useState } from 'react';
import { PreselectedClient } from '../screens/app/BookingModal.web';

export function useBookingModal() {
  const [visible, setVisible] = useState(false);
  const [preselectedClient, setPreselectedClient] = useState<PreselectedClient | null>(null);

  const open = (client?: PreselectedClient | null) => {
    setPreselectedClient(client ?? null);
    setVisible(true);
  };

  const close = () => setVisible(false);

  return { visible, preselectedClient, open, close };
}