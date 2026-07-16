import { useCallback, useState } from 'react';

export function useAsyncAction() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const run = useCallback(async (actionId: string, fn: () => Promise<void>) => {
    setLoadingAction(actionId);
    try {
      await fn();
    } finally {
      setLoadingAction(null);
    }
  }, []);

  const isLoading = useCallback(
    (actionId: string) => loadingAction === actionId,
    [loadingAction],
  );

  return { run, isLoading, loadingAction };
}
