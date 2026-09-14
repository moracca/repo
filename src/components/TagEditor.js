import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { listAllTags, listAllCanonicalTags } from '../db/dreamdb';

const MAX_SUGGESTIONS = 8;

/**
 * Edits a dream's tags as a list of names.
 *
 * Works in names rather than ids on purpose: the capture screen picks tags
 * before the dream row exists, so there is nothing to key against yet. Rows for
 * new tags are created by setDreamTags when the dream is saved.
 * 
 * allowCreate controls whether this interface can create new tags that the user
 * types, or only select existing tags
 */
export function TagEditor({ value = [], allowCreate=true, onChange, placeholderText="Add a tag", style }) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const [available, setAvailable] = useState([]);

    useEffect(() => {
        let cancelled = false;
        listAllCanonicalTags()
            .then((rows) => {
                if (!cancelled) setAvailable(rows);
            })
            .catch((error) => console.warn('Could not load tags:', error));
        return () => {
            cancelled = true;
        };
    }, []);

    const trimmed = query.trim();

    const suggestions = useMemo(() => {
        const selected = new Set(value.map((tag) => tag.toLowerCase()));
        const needle = trimmed.toLowerCase();
        return available
            .filter((tag) => !selected.has(tag.tag.toLowerCase()))
            .filter((tag) => {
                if (!needle) return true;
                const all = [tag.tag, ...tag.aliases].map(s => s.toLowerCase());
                return all.some(name => name.includes(needle));
            })
            .slice(0, MAX_SUGGESTIONS);
    }, [available, value, trimmed]);

    // Offer to create only when nothing already matches exactly, so the user
    // can't make a near-duplicate of a tag that's one tap away.
    const alreadyExists = available.some(
        (tag) => [tag.tag, ...tag.aliases].some(name => name.toLowerCase() === trimmed.toLowerCase())
    ) || value.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase()
    );
    const canCreate = allowCreate && trimmed.length > 0 && !alreadyExists;

    const addTag = (tag) => {
        const isSelected = value.some((t) => t.toLowerCase() === tag.toLowerCase());
        if (!isSelected) onChange([...value, tag]);
        setQuery('');
        inputRef.current?.blur();
    };

    const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

    const showDropdown = focused && (suggestions.length > 0 || canCreate);

    return (
        <View style={style}>
            {value.length > 0 && (
                <View style={shared.tagContainer}>
                    {value.map((tag) => (
                        <View key={tag} style={styles.chip}>
                            <Text style={styles.chipText}>{tag}</Text>
                            <Pressable
                                onPress={() => removeTag(tag)}
                                hitSlop={8}
                                style={styles.chipRemove}
                                accessibilityLabel={`Remove tag ${tag}`}
                                accessibilityRole="button"
                            >
                                <MaterialIcons name="close" size={14} color={colors.text} />
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}

            <TextInput
                ref={inputRef}
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholderText}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={() => {
                    if (trimmed) addTag(trimmed);
                }}
            />

            {showDropdown && (
                <View style={styles.dropdown}>
                    {/* Without keyboardShouldPersistTaps the first tap only
                        dismisses the keyboard and the option press is lost. */}
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {suggestions.map((tag) => (
                            <Pressable key={tag.tag} onPress={() => addTag(tag.tag)} style={styles.option}>
                                <Text style={styles.optionText}>{tag.tag}</Text>
                            </Pressable>
                        ))}

                        {canCreate && (
                            <Pressable onPress={() => addTag(trimmed)} style={styles.option}>
                                <View style={shared.buttonRow}>
                                    <MaterialIcons name="add" size={16} color={colors.textSecondary} />
                                    <Text style={styles.optionText}>Create "{trimmed}"</Text>
                                </View>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        borderRadius: 4,
        paddingLeft: 8,
        paddingRight: 4,
        paddingVertical: 4,
        marginRight: 4,
        marginBottom: 4
    },
    chipText: {
        color: colors.text,
        fontSize: 12
    },
    chipRemove: {
        marginLeft: 4
    },
    input: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.textTertiary,
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: 14
    },
    dropdown: {
        marginTop: 4,
        maxHeight: 180,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.textTertiary,
        backgroundColor: colors.surface,
        overflow: 'hidden'
    },
    option: {
        paddingHorizontal: 12,
        paddingVertical: 10
    },
    optionText: {
        color: colors.text,
        fontSize: 14
    }
});
