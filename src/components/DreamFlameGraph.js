import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

const BOXSIZE = 14;
const GAP = 3;
// Sparse labels, the way contribution graphs do it — seven stacked labels at
// this size would collide.
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// The primary color is used for the heatmap, but we need to convert it to RGB 
// so we can apply an alpha channel for the faintest shade. The `colors.primary` 
// value is a hex string like "#RRGGBB", so we parse it into three integers.
const PRIMARY_RGB = (() => {
    // remove the leading '#' and parse the hex string (base 16) into an integer
    const value = parseInt(colors.primary.slice(1), 16);
    // Use bitwise operations to extract the red, green, and blue components from the integer.
    // https://en.jberries.com/article/all-about-bitwise-operators-or-how-to-extract-red-from-rgb-like-a-pro/
    const r = (value >> 16) & 0xFF;
    const g = (value >> 8) & 0xFF;
    const b = value & 0xFF;
    return [r, g, b];
})();

// A local calendar day, deliberately not toISOString(). `created_at` is stored
// as an ISO UTC string, so splitting that on "T" buckets a late-evening dream
// into the following day for anyone west of UTC, and disagrees with the History
// list, which formats the same timestamp in local time.
function dayKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

// Return a color for the given count of dreams on a day, relative to the busiest
// day in the graph. The faintest shade is still clearly visible, and the color
// intensity scales linearly with the count.
function heatColor(count, busiest) {
    if (count === 0) return colors.surface;
    // Floor the faintest shade so a single dream is still clearly visible.
    const intensity = 0.3 + 0.7 * (count / busiest);
    const [r, g, b] = PRIMARY_RGB;
    return `rgba(${r}, ${g}, ${b}, ${intensity})`;
}

function formatTooltipDate(dateKey) {
    const [y, m, d] = dateKey.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DreamFlameGraph({ dreams, weeks = 30, onSelectDay, style }) {
    const scrollRef = useRef(null);
    // wrapperRef is used to measure the position of the graph on screen, so we
    // can position the tooltip relative to it.
    const wrapperRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);
    const tooltipOpacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef(null);

    // display a tooltip with the date/dream count when the user taps a day.
    // hide it again after 2 seconds.  
    const showTooltip = (key, count, pageX, pageY) => {
        clearTimeout(hideTimer.current);
        // get the graph wrapper's position on screen so we can perform relative
        // positioning of the tooltip.  pageX/pageY are the tap coordinates in
        // screen space, so we have to convert them to the graph local coordinate
        // space by measuring the graph wrapper's position on screen.
        // measure() is async, so we have to set the tooltip state in the callback.
        wrapperRef.current?.measure((wx, wy, ww, wh, wpx, wpy) => {
            setTooltip({ key, count, x: pageX - wpx, y: pageY - wpy });
            tooltipOpacity.setValue(1);
            hideTimer.current = setTimeout(() => {
                Animated.timing(tooltipOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setTooltip(null));
            }, 2000);
        });
    };

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    const counts = {};
    for (const dream of dreams) {
        const key = dayKey(new Date(dream.created_at));
        counts[key] = (counts[key] ?? 0) + 1;
    }
    // figure out the busiest day so we can scale the heatmap colors relative to it
    const busiest = Math.max(1, ...Object.values(counts));

    // Anchor the grid to week boundaries so every row is the same weekday.
    // Walk back to the Sunday of the current week, then back `weeks - 1` more
    // weeks, so the rightmost column is the week containing today.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);

    // for each week, render a column of 7 pressable boxes, one for each day.
    // fill is determined by how many dreams were recorded that day
    const columns = [];
    for (let week = 0; week < weeks; week += 1) {
        const cells = [];

        for (let day = 0; day < 7; day += 1) {
            const date = new Date(start);
            date.setDate(start.getDate() + week * 7 + day);

            const key = dayKey(date);
            const count = counts[key] ?? 0;
            // The last column runs past today; leave those days blank.
            const isFuture = date > today;

            cells.push(
                <Pressable
                    key={key}
                    disabled={isFuture || !onSelectDay}
                    onPress={(e) => {
                        onSelectDay?.(key, count);
                        const { pageX, pageY } = e.nativeEvent;
                        showTooltip(key, count, pageX, pageY);
                    }}
                    style={[
                        styles.cell,
                        isFuture
                            ? styles.cellFuture
                            : { backgroundColor: heatColor(count, busiest) }
                    ]}
                />
            );
        }

        columns.push(
            <View key={week} style={styles.column}>
                {cells}
            </View>
        );
    }

    return (
        <View ref={wrapperRef} style={[styles.wrapper, style]}>
            <View>
                {WEEKDAY_LABELS.map((label, index) => (
                    <Text key={index} style={styles.label} numberOfLines={1}>
                        {label}
                    </Text>
                ))}
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                // Open scrolled to the newest weeks on the right.
                onContentSizeChange={() =>
                    scrollRef.current?.scrollToEnd({ animated: false })
                }
            >
                <View style={styles.grid}>{columns}</View>
            </ScrollView>

            {tooltip && (
                <Animated.View
                    pointerEvents="none"
                    style={[styles.tooltip, {
                        opacity: tooltipOpacity,
                        top: tooltip.y - 30,
                        left: tooltip.x - 40,
                    }]}
                >
                    <Text style={styles.tooltipText}>
                        {formatTooltipDate(tooltip.key)}
                        {tooltip.count > 0 ? ` - ${tooltip.count}` : ''}
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    label: {
        width: 26,
        height: BOXSIZE,
        marginBottom: GAP,
        marginRight: 4,
        fontSize: 9,
        color: colors.textTertiary,
        textAlign: 'right',
        textAlignVertical: 'center'
    },
    grid: {
        flexDirection: 'row'
    },
    column: {
        flexDirection: 'column',
        marginRight: GAP
    },
    cell: {
        width: BOXSIZE,
        height: BOXSIZE,
        marginBottom: GAP,
        borderRadius: 2
    },
    cellFuture: {
        backgroundColor: 'transparent'
    },
    tooltip: {
        position: 'absolute',
        zIndex: 10,
        backgroundColor: colors.surface,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(194, 247, 255, 0.2)',
    },
    tooltipText: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '500',
    },
});
