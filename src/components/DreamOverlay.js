import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";

// This component fades in an overlay with the details of the dream that was
// clicked in the dreamfield. The dream's tags are displayed, and clicking one
// triggers the onTagPress callback, which is used to focus the graph on that tag
export function DreamOverlay({ dream, onClose, onTagPress}) {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    // use a ref to hold the animated opacity value so that it doesn't reset on re-render
    const fadeOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (dream) {
            fadeOpacity.setValue(0);
            Animated.timing(fadeOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [dream]);

    if (!dream) return null;

    return (
        <Animated.View style={[styles.card, { bottom: 20 + insets.bottom, opacity: fadeOpacity }]}>
            <Pressable
                onPress={onClose}
                style={styles.close}
                accessibilityLabel="Close dream overlay"
                accessibilityRole="button"
            >
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.transcript} numberOfLines={6}>
                    {dream.transcript}
                </Text>

                {dream.tags?.length > 0 && (
                    <View style={styles.tags}>
                        {dream.tags.map((tag) => (
                            <Pressable
                                key={tag.id}
                                onPress={() => onTagPress?.(tag.tag)}
                                accessibilityLabel={`Focus on tag ${tag.tag}`}
                                accessibilityRole="button"
                            >
                                <View style={styles.tag}>
                                    <Text style={styles.tagText}>{tag.tag}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Pressable
                onPress={() => {
                    onClose();
                    navigation.navigate('DreamDetail', { id: dream.dreamId });
                }}
                style={[shared.button, shared.buttonPrimary, styles.detailButton]}
                accessibilityLabel="View full dream details"
                accessibilityRole="button"
            >
                <View style={shared.buttonRow}>
                    <MaterialIcons name="open-in-new" size={16} color={colors.text} />
                    <Text style={shared.buttonText}>View Dream</Text>
                </View>
            </Pressable>
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
        maxHeight: 260,
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
    scroll: {
        marginRight: 24,
    },
    transcript: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    tag: {
        backgroundColor: 'rgba(194, 247, 255, 0.12)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    tagText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    detailButton: {
        marginTop: 12,
        paddingVertical: 8,
    },
});
