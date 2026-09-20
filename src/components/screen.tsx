import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = ViewProps & {
  /** Safe area edges to respect. Defaults to top only, tabs handle the bottom. */
  edges?: readonly Edge[];
  padded?: boolean;
};

const DEFAULT_EDGES: readonly Edge[] = ['top'];

export function Screen({
  style,
  edges = DEFAULT_EDGES,
  padded = true,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: theme.background }, style]}
      {...rest}>
      <SafeAreaView edges={[]} style={[styles.content, padded && styles.padded]}>
        {children}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: Spacing.three,
  },
});
