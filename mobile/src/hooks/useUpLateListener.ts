import { useEffect } from 'react';
import { wsService } from '../services/websocket';
import { useCircleStore } from '../stores/circleStore';

export function useUpLateListener() {
  const addUpLatePartner = useCircleStore((s) => s.addUpLatePartner);

  useEffect(() => {
    const unsub = wsService.on('partner_up_late', (data: any) => {
      if (data.userId) {
        addUpLatePartner(data.userId);
      }
    });

    return () => unsub();
  }, [addUpLatePartner]);
}
