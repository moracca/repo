import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons } from '@expo/vector-icons';
import { deleteDream, getDreamById, setDreamTags, updateDreamTranscript } from "../db/dreamdb";

import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { Screen } from "../components/Screen";
import { TagEditor } from "../components/TagEditor";

import { useAudioPlayback } from "../hooks/useAudioPlayback";

import { useNavigation } from "@react-navigation/native";
import * as Haptics from 'expo-haptics';

export function DreamDetailScreen({ route }) {
    const { id } = route.params;
    const [dream, setDream] = useState(undefined);   // undefined = loading, null = not found
    const [draft, setDraft] = useState(null);        // non-null only while editing
    const [draftTags, setDraftTags] = useState([]);  // tag names, edited alongside
    const [isSaving, setIsSaving] = useState(false);

    const { togglePlayback, isPlaying, hasAudio } = useAudioPlayback(dream?.audio_uri);

    const navigation = useNavigation();

    useEffect(() => {
        // Use a cancelled flag to prevent setting state on an unmounted component
        // if the user navigates away from the DreamDetailScreen before the
        // getDreamById() promise resolves.
        let cancelled = false;
        getDreamById(id)
            .then((row) => { if (!cancelled) setDream(row); })
            .catch((error) => { if (!cancelled) console.warn("Failed to load dream:", error); });
        return () => { cancelled = true; };
    }, [id]);

    if (dream === undefined) return <Text style={shared.text}>Loading dream...</Text>;
    if (dream === null) return <Text style={shared.text}>Dream not found.</Text>;

    // The draft doubles as the edit flag, so there is no second piece of state
    // that could disagree with it.
    const isEditing = draft !== null;

    // The editor works in tag names; ids are re-resolved on save.
    const savedTagNames = dream.tags.map((tag) => tag.tag);

    const startEditing = () => {
        setDraftTags(savedTagNames);
        setDraft(dream.transcript);
    };

    const tagsUnchanged =
        draftTags.length === savedTagNames.length &&
        draftTags.every((tag, index) => tag === savedTagNames[index]);

    const cancelEditing = () => {
        if (draft === dream.transcript && tagsUnchanged) {
            setDraft(null);
            return;
        }
        Alert.alert("Discard changes?", "Your edits will be lost.", [
            { text: "Keep editing", style: "cancel" },
            { text: "Discard", style: "destructive", onPress: () => setDraft(null) }
        ]);
    };

    const handleSavePress = async () => {
        setIsSaving(true);
        try {
            await updateDreamTranscript(dream.id, { transcript: draft });
            await setDreamTags(dream.id, draftTags);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setDream(await getDreamById(dream.id));
            setDraft(null);
        } catch (error) {
            Alert.alert("Could not save dream", String(error?.message ?? error));
        } finally {
            setIsSaving(false);
        }
    };

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
                        navigation.replace('History');
                    } catch (error) {
                        Alert.alert("Could not delete", String(error?.message ?? error));
                    }
                }
            }
        ]);
    };

    // KeyboardAvoidingView is used to prevent the keyboard from covering the
    // text input on iOS.  On Android, the default behavior is to resize the
    // screen when the keyboard appears, so no special handling is needed.

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <Screen style={styles.container}>
                <View style={shared.card}>
                    <Text style={shared.cardTitle}>
                        {new Date(dream.created_at).toLocaleString()}
                    </Text>

                    {!isEditing && hasAudio && (
                        <Pressable onPress={togglePlayback} style={styles.action}>
                            <View style={shared.buttonRow}>
                                <MaterialIcons
                                    name={isPlaying ? "stop" : "play-arrow"}
                                    size={20}
                                    color={colors.text}
                                />
                                <Text style={shared.cardContent}>
                                    {isPlaying ? "Stop" : "Play"}
                                </Text>
                            </View>
                        </Pressable>
                    )}

                    {isEditing ? (
                        <>
                            <TextInput
                                style={shared.transcriptInput}
                                value={draft}
                                onChangeText={setDraft}
                                editable={!isSaving}
                                multiline
                                textAlignVertical="top"
                                placeholder="Describe your dream"
                                placeholderTextColor={colors.textTertiary}
                            />
                            <TagEditor
                                value={draftTags}
                                onChange={setDraftTags}
                                style={styles.tagEditor}
                            />
                            <View style={styles.actions}>
                                <Pressable
                                    onPress={handleSavePress}
                                    disabled={isSaving}
                                    style={[styles.action, isSaving && styles.actionDisabled]}
                                >
                                    <View style={shared.buttonRow}>
                                        <MaterialIcons name="save" size={20} color={colors.text} />
                                        <Text style={shared.cardContent}>
                                            {isSaving ? "Saving..." : "Save"}
                                        </Text>
                                    </View>
                                </Pressable>
                                <Pressable
                                    onPress={cancelEditing}
                                    disabled={isSaving}
                                    style={[styles.action, styles.dangerAction, isSaving && styles.actionDisabled]}
                                >
                                    <View style={shared.buttonRow}>
                                        <MaterialIcons name="close" size={20} color={colors.text} />
                                        <Text style={shared.cardContent}>Cancel</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <>
                            <Pressable onPress={startEditing} style={styles.action}>
                                <View style={shared.buttonRow}>
                                    <MaterialIcons name="edit" size={20} color={colors.text} />
                                    <Text style={shared.cardContent}>Edit</Text>
                                </View>
                            </Pressable>
                            <Text style={shared.cardContent}>{dream.transcript}</Text>
                            {dream.tags?.length > 0 && (
                                <View style={shared.tagContainer}>
                                    {dream.tags.map((tag) => (
                                        <Text key={tag.id} style={shared.tag}>{tag.tag}</Text>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </View>
                <View>
                    <Pressable onPress={() => confirmDeleteDream(dream.id)} style={[shared.button, shared.buttonDanger]}>
                        <View style={shared.buttonRow}>
                            <MaterialIcons name="delete-forever" size={20} color={colors.text} />
                            <Text style={shared.buttonText}>Delete Dream</Text>
                        </View>
                    </Pressable>
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}

// Only what is specific to this screen; shared button and card styles live in
// ../theme/styles.
const styles = StyleSheet.create({
    container: {
        padding: 20,
        justifyContent: "flex-start"
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 12
    },
    action: {
        padding: 8
    },
    tagEditor: {
        marginTop: 12
    },
    dangerAction: {
        backgroundColor: colors.error,
        borderRadius: 4
    },
    actionDisabled: {
        opacity: 0.5
    }
});
