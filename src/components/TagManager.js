import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { listAllCanonicalTags, deleteTag, deleteAlias, addAlias, createTag } from "../db/dreamdb";

export function TagManager({style}) {
    const [tags, setTags] = useState([]);
    const [addingAliasFor, setAddingAliasFor] = useState(null);
    const [aliasInput, setAliasInput] = useState('');
    const [newTagInput, setNewTagInput] = useState('');

    const refresh = useCallback(() => {
        listAllCanonicalTags().then(setTags);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const handleDeleteTag = (tagId, tagName) => {
        Alert.alert(
            `Delete "${tagName}"?`,
            "This tag and its aliases will be removed from all dreams.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => {
                    deleteTag(tagId).then(refresh);
                }},
            ]
        );
    };

    const handleDeleteAlias = (alias, canonicalId) => {
        deleteAlias(alias, canonicalId).then(refresh);
    };

    const handleAddAlias = (canonicalId) => {
        const name = aliasInput.trim();
        if (!name) return;
        addAlias(name, canonicalId).then(() => {
            setAliasInput('');
            setAddingAliasFor(null);
            refresh();
        });
    };

    const handleCreateTag = () => {
        const name = newTagInput.trim();
        if (!name) return;
        createTag(name).then(() => {
            setNewTagInput('');
            refresh();
        });
    };

    return (
        <View style={[style, { alignSelf: 'stretch' }]}>
            <Text style={shared.text}>Manage Tags</Text>

            <View style={styles.createRow}>
                <TextInput
                    style={styles.createInput}
                    value={newTagInput}
                    onChangeText={setNewTagInput}
                    placeholder="New tag name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateTag}
                />
                {newTagInput.trim().length > 0 && (
                    <Pressable
                        onPress={handleCreateTag}
                        style={styles.createButton}
                        accessibilityLabel={`Create tag ${newTagInput.trim()}`}
                        accessibilityRole="button"
                    >
                        <MaterialIcons name="add" size={18} color={colors.text} />
                    </Pressable>
                )}
            </View>

            <View style={styles.headerRow}>
                <Text style={[styles.headerText, { width: 120, paddingRight: 12 }]}>Tag</Text>
                <Text style={styles.headerText}>Aliases</Text>
            </View>

            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {tags.map((item) => (
                    <View key={item.id} style={styles.row}>
                        <View style={styles.leftCol}>
                            <Text style={styles.tagName}>{item.tag}</Text>
                            <Pressable
                                onPress={() => handleDeleteTag(item.id, item.tag)}
                                hitSlop={8}
                                accessibilityLabel={`Delete tag ${item.tag}`}
                                accessibilityRole="button"
                            >
                                <MaterialIcons name="close" size={16} color={colors.error} />
                            </Pressable>
                        </View>
                        <View style={styles.rightCol}>
                            {item.aliases.filter(a => a).map((alias, i) => (
                                <View key={i} style={styles.aliasPill}>
                                    <Text style={styles.aliasText}>{alias}</Text>
                                    <Pressable
                                        onPress={() => handleDeleteAlias(alias, item.id)}
                                        hitSlop={4}
                                        accessibilityLabel={`Remove alias ${alias}`}
                                        accessibilityRole="button"
                                    >
                                        <MaterialIcons name="close" size={12} color={colors.textSecondary} />
                                    </Pressable>
                                </View>
                            ))}

                            {addingAliasFor === item.id ? (
                                <View style={styles.aliasInputRow}>
                                    <TextInput
                                        style={styles.aliasInput}
                                        value={aliasInput}
                                        onChangeText={setAliasInput}
                                        placeholder="alias"
                                        placeholderTextColor={colors.textTertiary}
                                        autoCapitalize="none"
                                        autoFocus
                                        returnKeyType="done"
                                        onSubmitEditing={() => handleAddAlias(item.id)}
                                        onBlur={() => { setAddingAliasFor(null); setAliasInput(''); }}
                                    />
                                </View>
                            ) : (
                                <Pressable
                                    onPress={() => { setAddingAliasFor(item.id); setAliasInput(''); }}
                                    style={styles.addAlias}
                                    accessibilityLabel={`Add alias to ${item.tag}`}
                                    accessibilityRole="button"
                                >
                                    <MaterialIcons name="add" size={14} color={colors.textTertiary} />
                                </Pressable>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    createRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    createInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.textTertiary,
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: 14,
    },
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        paddingBottom: 6,
        marginBottom: 4,
    },
    headerText: {
        color: colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    createButton: {
        backgroundColor: colors.primary,
        borderRadius: 6,
        padding: 8,
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 10,
    },
    leftCol: {
        width: 120,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 12,
    },
    rightCol: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
    },
    tagName: {
        color: colors.text,
        fontSize: 14,
    },
    aliasPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(194, 247, 255, 0.12)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    aliasText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    addAlias: {
        backgroundColor: 'rgba(194, 247, 255, 0.08)',
        borderRadius: 8,
        padding: 4,
    },
    aliasInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aliasInput: {
        borderBottomWidth: 1,
        borderBottomColor: colors.textTertiary,
        color: colors.text,
        fontSize: 12,
        paddingVertical: 2,
        paddingHorizontal: 4,
        minWidth: 60,
    },
});
