import { useState } from 'react';

export function useReopenAction(onReopen: () => void) {
  const [requested, setRequested] = useState(false);

  function reopen() {
    onReopen();
    setRequested(true);
  }

  return { requested, reopen };
}
