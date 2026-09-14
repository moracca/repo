import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shared } from "../theme/styles";

// Standard screen wrapper. Applies the shared container plus bottom padding for
// the system navigation bar, which the app draws behind because Expo enables
// edge-to-edge on Android.
//
// The inset is *added* to whatever bottom padding the caller asked for rather
// than layered over it. A caller passing `padding: 20` would otherwise
// overwrite paddingBottom and silently lose the inset.
export function Screen({ children, style, scrollable = false }) {
    const insets = useSafeAreaInsets();
    const flattened = StyleSheet.flatten([shared.container, style]);
    const basePadding =
        flattened.paddingBottom ?? flattened.paddingVertical ?? flattened.padding ?? 0;

    const containerStyle = [flattened, { paddingBottom: basePadding + insets.bottom }];

    if (scrollable) {
        return (
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[containerStyle, { flex: undefined, flexGrow: 1, justifyContent: 'flex-start' }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>
        );
      }

      return <View style={containerStyle}>{children}</View>;
}
