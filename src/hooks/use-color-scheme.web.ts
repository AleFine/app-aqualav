import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Static rendering on web produces HTML without access to the user's color
 * scheme, so the first client render must match the server output.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
