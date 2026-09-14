import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { formatDreamDate } from "../utils/dateHelpers";
import { dreamSummary } from "../utils/dreamHelpers";

// This component fades in an overlay with a list of dreams associated with a
// specific tag when you tap the tag in the dreamfield. The overlay contains the
// tag name and number of dreams, a close button, and a scrollable list of dreams.
// Pressing on a dream in the list triggers the passed onDreamPress callback, whuch
// is used to focus the graph on that dream in DreamfieldScreen. 
export function TagOverlay({ tagName, dreams, onClose, onDreamPress }) {
    const insets = useSafeAreaInsets();
    // use a ref to hold the animated opacity value so that it doesn't reset on re-render
    const fadeOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (tagName) {
            fadeOpacity.setValue(0);
            Animated.timing(fadeOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [tagName]);

    if (!tagName) return null;

    return (
        <Animated.View style={[styles.card, { bottom: 20 + insets.bottom, opacity: fadeOpacity }]}>
            <Pressable
                onPress={onClose}
                style={styles.close}
                accessibilityLabel="Close tag overlay"
                accessibilityRole="button"
            >
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>

            <Text style={styles.title}>{tagName}</Text>
            <Text style={styles.count}>
                {dreams.length} dream{dreams.length !== 1 ? 's' : ''}
            </Text>

            {/* tapping a dream in the list calls onDreamPress to zoom the camera
            to that node and opens the full DreamOverlay for it */}
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {dreams.map((dream) => (
                    <Pressable
                        key={dream.id}
                        onPress={() => onDreamPress?.(dream)}
                        style={styles.dreamRow}
                        accessibilityLabel={`Dream from ${formatDreamDate(dream.created_at)}`}
                        accessibilityRole="button"
                    >
                        <Text style={styles.date}>{formatDreamDate(dream.created_at)}</Text>
                        <Text style={styles.summary} numberOfLines={2}>
                            {dreamSummary(dream, 120)}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        paddingTop: 12,
        maxHeight: 300,
        borderWidth: 1,
        borderColor: 'rgba(194, 247, 255, 0.15)',
    },
    close: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1,
        padding: 4,
    },
    title: {
        color: colors.textSecondary,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 2,
    },
    count: {
        color: colors.textTertiary,
        fontSize: 12,
        marginBottom: 10,
    },
    scroll: {
        marginRight: 24,
    },
    dreamRow: {
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    date: {
        color: colors.textSecondary,
        fontSize: 11,
        marginBottom: 2,
    },
    summary: {
        color: colors.text,
        fontSize: 13,
        lineHeight: 18,
    },
});
