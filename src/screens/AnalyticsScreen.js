import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { getTagCounts, getTagSetCounts } from "../db/dreamdb";

import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { Screen } from "../components/Screen";

function BarRow({ label, count, maxCount, onPress }) {
    return (
        <Pressable onPress={onPress} style={styles.barRow}>
            <Text style={[styles.barLabel, {textDecorationLine: "underline"}]} numberOfLines={1}>{label}</Text>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { flex: count / maxCount }]} />
                <View style={{ flex: 1 - count / maxCount }} />
            </View>
            <Text style={styles.barCount}>{count}</Text>
        </Pressable>
    );
}

export function AnalyticsScreen() {
    const navigation = useNavigation();
    const [tagCounts, setTagCounts] = useState([]);
    const [tagSetCounts, setTagSetCounts] = useState([]);

    useEffect(() => {
        getTagCounts().then(setTagCounts);
        getTagSetCounts().then(setTagSetCounts);
    }, []);

    const maxTagCount = Math.max(1, ...tagCounts.map(t => t.count));
    const maxSetCount = Math.max(1, ...tagSetCounts.map(t => t.count));

    return (
        <Screen scrollable style={styles.container}>
            <Text style={shared.text}>Tag frequency</Text>
            <View style={styles.chartSection}>
                <ScrollView nestedScrollEnabled>
                    {tagCounts.map(({ tag, count }) => (
                        <BarRow
                            key={tag}
                            label={tag}
                            count={count}
                            maxCount={maxTagCount}
                            onPress={() => navigation.navigate('History', { tags: [tag] })}
                        />
                    ))}
                </ScrollView>
            </View>

            <Text style={shared.text}>Tag combinations</Text>
            <View style={styles.chartSection}>
                <ScrollView nestedScrollEnabled>
                    {tagSetCounts.map(({ tags, count }) => (
                        <BarRow
                            key={tags.join(',')}
                            label={tags.join(' + ')}
                            count={count}
                            maxCount={maxSetCount}
                            onPress={() => navigation.navigate('History', { tags })}
                        />
                    ))}
                </ScrollView>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'stretch',
        padding: 20,
    },
    chartSection: {
        maxHeight: 280,
        marginBottom: 20,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        paddingHorizontal: 4,
    },
    barLabel: {
        width: 140,
        color: colors.text,
        fontSize: 12,
        marginRight: 8,
    },
    barTrack: {
        flex: 1,
        flexDirection: 'row',
        height: 20,
    },
    barFill: {
        height: 20,
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    barCount: {
        color: colors.textSecondary,
        fontSize: 12,
        marginLeft: 6,
        minWidth: 20,
        textAlign: 'right',
    },
});
