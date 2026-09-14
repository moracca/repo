import { Alert, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useCallback, useState, useRef } from "react";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import * as Haptics from 'expo-haptics';

import { listDreamsWithTags, deleteDream } from "../db/dreamdb";

import { colors } from "../theme/colors";
import { shared } from "../theme/styles";

import { DreamListCard } from "../components/DreamListCard";
import { DreamFlameGraph } from "../components/DreamFlameGraph";
import { SwipeableRow } from "../components/SwipeableRow";
import { Screen } from "../components/Screen";
import { TagEditor } from "../components/TagEditor";

export function HistoryScreen() {
    const route = useRoute();
    const [dreams, setDreams] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedTags, setSelectedTags] = useState(route.params?.tags ?? []);
    const listRef = useRef(null);

    // Alert.alert is callback-based rather than returning a promise, so the
    // delete runs from the button's onPress instead of after an await.
    const confirmDeleteDream = (id) => {
        Alert.alert("Delete this dream?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await deleteDream(id);
                        setDreams((prev) => prev.filter((d) => d.id !== id));
                    } catch (error) {
                        Alert.alert("Could not delete", String(error?.message ?? error));
                    }
                }
            }
        ]);
    };

    const filtered = dreams.filter(dream => {
        if (searchText && !dream.transcript.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        if (selectedTags.length > 0) {
            const dreamTagNames = dream.tags.map(t => t.tag.toLowerCase());
            if (!selectedTags.every(t => dreamTagNames.includes(t.toLowerCase()))) {
                return false;
            }
        }
        return true;
    });
    
    const onTagPress = useCallback((tag) => {
        // add tag to selectedTags
        setSelectedTags(prev => prev.includes(tag)
            ? prev.filter(t => t !== tag)
            : [...prev, tag]
        );
        
    }, []);

    const onSelectDay = useCallback((dateKey) => {
        const index = filtered.findIndex(dream => {
            const d = new Date(dream.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return key === dateKey;
        });
        if (index >= 0) {
            listRef.current?.scrollToIndex({ index, animated: true });
        }
    }, [filtered]);

    // useFocusEffect re-fetches dreams whenever the screen is focused, not just
    // on mount — the HistoryScreen stays mounted when navigating away.
    useFocusEffect(
        useCallback(() => {
            listDreamsWithTags().then(setDreams);
        }, [])
    );

    return (
        <Screen style={styles.container}>
            <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search dreams..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
            />
            <TagEditor value={selectedTags} onChange={setSelectedTags} allowCreate={false} placeholderText="Filter by tag" />
            <DreamFlameGraph dreams={filtered} style={{marginVertical: 16}} onSelectDay={onSelectDay} />
            <FlatList
                ref={listRef}
                style={styles.list}
                data={filtered}
                keyExtractor={(dream) => String(dream.id)}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={shared.text}>No dreams recorded yet.</Text>
                }
                renderItem={({ item }) => (
                    <SwipeableRow onSwipeComplete={() => confirmDeleteDream(item.id)}>
                        <DreamListCard dream={item} style={styles.rowCard} onTagPress={onTagPress}/>
                    </SwipeableRow>
                )}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: "stretch",
        justifyContent: "flex-start"
    },
    list: {
        flex: 1
    },
    listContent: {
        paddingBottom: 8
    },
    searchInput: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.textTertiary,
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: 14,
        marginBottom: 8,
    },
    rowCard: {
        marginBottom: 0
    }
});
