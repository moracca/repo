import { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Minimum amount of pixels the row must be dragged rightward before its release
// will trigger onSwipeComplete.
const DROP_THRESHOLD = 80;

// Wraps a list row with a rightward swipe-to-delete gesture.
// Uses PanResponder for touch tracking and Animated for visual feedback:
// the card translates, dims, and shrinks as it slides toward the trash icon.
export function SwipeableRow({ children, onSwipeComplete }) {
    const translateX = useRef(new Animated.Value(0)).current;
    // Ref keeps the callback fresh without recreating the PanResponder.
    const onSwipeRef = useRef(onSwipeComplete);
    // 
    onSwipeRef.current = onSwipeComplete;
    // state to track whether the drag has exceeded the threshold for deletion in
    // order to animate the trash can icon and provide visual feedback to the user
    const [overThreshold, setOverThreshold] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            // don't claim the initial touch-down gesture, so the user can still
            // tap the row and scroll vertically
            onStartShouldSetPanResponder: () => false,
            // Only claim horizontal drags so vertical FlatList scroll still works.
            onMoveShouldSetPanResponder: (_, gestureState) =>
                gestureState.dx > 10 && Math.abs(gestureState.dy) < 20,
            onPanResponderMove: (_, gestureState) => {
                // Clamp to rightward-only movement.
                const clamped = Math.max(0, gestureState.dx);
                translateX.setValue(clamped);
                setOverThreshold(clamped >= DROP_THRESHOLD);
            },
            onPanResponderRelease: (_, gestureState) => {
                setOverThreshold(false);
                if (gestureState.dx >= DROP_THRESHOLD) {
                    onSwipeRef.current?.();
                }
                // Spring back regardless — the confirm dialog handles the actual delete.
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: false,
                    friction: 7,
                }).start();
            },
        })
    ).current;

    // Interpolate card appearance from the drag distance.
    const cardOpacity = translateX.interpolate({
        inputRange: [0, DROP_THRESHOLD],
        outputRange: [1, 0.4],
        extrapolate: 'clamp',
    });

    const cardScale = translateX.interpolate({
        inputRange: [0, DROP_THRESHOLD],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.row}>
            <Animated.View
                style={[styles.card, {
                    transform: [
                        { translateX },
                        { scale: cardScale },
                    ],
                    opacity: cardOpacity,
                }]}
                {...panResponder.panHandlers}
            >
                {children}
            </Animated.View>

            <View style={styles.iconWrap}>
                <MaterialIcons
                    name="delete"
                    size={overThreshold ? 32 : 24}
                    color={overThreshold ? colors.error : colors.textTertiary}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    card: {
        flex: 1,
    },
    iconWrap: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
