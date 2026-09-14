import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "../components/Screen";
import { TagEditor } from "../components/TagEditor";

import { useAutoTags } from "../hooks/useAutoTags";


import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { ToggleRow } from "../components/ToggleRow";
import { useSpeechCapture } from "../hooks/useSpeechCapture";
import { getSettings, insertDream } from "../db/dreamdb";

export function CaptureDreamScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    // State to track whether the dream is currently being saved to the database.
    const [isSaving, setIsSaving] = useState(false);
    const [tags, setTags] = useState([]);
    const [autoTagEnabled, setAutoTagEnabled] = useState(true);
    const [mode, setMode] = useState(route.params?.mode ?? 'voice');
    const [transcript, setTranscript] = useState('');
    const [persistAudio, setPersistAudio] = useState(false);

    // use a ref that can be read from the beforeRemove callback without having
    // to have transcript in the dependency chain and re-adding the callback
    // repeatedly when the transcript changes
    const transcriptRef = useRef(transcript);
    transcriptRef.current = transcript;
    const savedRef = useRef(false);

    // this component owns the transcript state, and passes the setTranscript
    // callback to the useSpeedCapture module so that it can update our state
    // whenever new transcript content is received.
    const { start, stop, stopAsync, abort, isCapturing, error, audioUriRef, addParagraphBreak } =
        useSpeechCapture({ persistAudio: true, onTranscriptChange: setTranscript });

    // Begin dictating as soon as the screen opens.
    useEffect(() => {
        if (mode === 'voice') start(transcript);
    }, [start]);

    useEffect(() => {
        getSettings().then((settings) => {
            setAutoTagEnabled(settings.autoTagEnabled === 'true');
            setPersistAudio(settings.persistAudio === 'true');
        });
    }, []);

    // prevent the back button from navigating back until the user confirms, so
    // we don't accidentally drop a partially recorded dream on accidental back
    // button press
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            // if there is no content yet we can navigate away freely
            if (!transcriptRef.current) return;

            if (savedRef.current) return;

            e.preventDefault();
            Alert.alert("Discard this dream?", "Your recording will be lost.", [
                { text: "Keep recording", style: "cancel" },
                { text: "Discard", style: "destructive", onPress: () => {
                    // abort the transcription process
                    abort();
                    // resume the original navigation action
                    navigation.dispatch(e.data.action);
                }},
            ]);
        });
        return unsubscribe;
    }, [navigation, abort]);

    const handleToggleMode = useCallback(() => {
        if (mode === 'voice') {
            stop();
            setMode('keyboard');
        } else {
            setMode('voice');
            Keyboard.dismiss();
            start(transcript);
        }
    }, [mode, stop, start, transcript]);

    const handleSave = useCallback(async () => {
        if (isCapturing) {
            await stopAsync();
        }

        if (!transcript) {
            Alert.alert("Nothing to save", "No speech has been recognized yet.");
            return;
        }

        setIsSaving(true);
        try {
            const audioUri = audioUriRef.current;
            const id = await insertDream({
                transcript,
                captureMethod: "voice",
                audioUri: persistAudio ? audioUri : null,
                // Undefined rather than [] when nothing was picked, so
                // insertDream still falls back to its keyword suggestions.
                tags: tags.length ? tags : undefined
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            savedRef.current = true;
            navigation.replace('DreamDetail', { id })
        } catch (saveError) {
            setIsSaving(false);
            Alert.alert("Could not save dream", String(saveError?.message ?? saveError));
        }
    }, [isCapturing, stop, transcript, audioUriRef, tags, navigation]);

    const handleDiscard = useCallback(() => {
        // note: confirmation is handled by the beforeRemove callback
        navigation.goBack();
    }, [navigation]);

    // the callback function that will merge the suggested tags into the list of
    // existing tags
    const mergeTags = useCallback((fresh) => {
        setTags((current) => {
            // important to use toLowerCase because setDreamTags matches with
            // COLLATE NOCASE.  Without it we could end up with two equivalent
            // tags with different casing
            const existing = new Set(current.map((t) => t.toLowerCase()));
            return [...current, ...fresh.filter((t) => !existing.has(t.toLowerCase()))];
        });
    }, []);

    // pull any matching tags out of the transcript text, if enabled
    useAutoTags({ transcript, enabled: autoTagEnabled, onSuggest: mergeTags });

    return (
        <Screen style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.status}>
                    {isCapturing ? " Listening... describe your dream" : "Audio Paused"}
                </Text>

                <ToggleRow
                    label="Entry Mode"
                    onLabel="Voice"
                    offLabel="Keyboard"
                    value={mode === 'voice' ? true : false}
                    onValueChange={handleToggleMode}
                />

                {mode === 'voice' && (
                    <ToggleRow
                        label="Keep audio"
                        value={persistAudio}
                        onValueChange={setPersistAudio}
                    />
                )}
                {mode === 'voice' && (
                    <ScrollView
                        style={shared.transcriptBox}
                        contentContainerStyle={shared.transcriptContent}
                    >
                        <Text style={styles.transcript}>
                            {transcript || "Start speaking and your words will appear here."} {isCapturing && <MaterialIcons name="mic" size={18} color={colors.primary} />}
                        </Text>
                    </ScrollView>
                )}

                {mode === 'keyboard' && (
                    <TextInput
                        style={shared.transcriptInput}
                        value={transcript}
                        onChangeText={setTranscript}
                        editable={!isSaving}
                        multiline
                        textAlignVertical="top"
                        placeholder="Describe your dream"
                        placeholderTextColor={colors.textTertiary}
                    />
                )}

                
                <ToggleRow
                    label="Auto-tagging"
                    value={autoTagEnabled}
                    onValueChange={setAutoTagEnabled}
                />
                <TagEditor value={tags} onChange={setTags} style={styles.tagEditor} />

            {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.actions}>
                    <Pressable
                    onPress={handleSave}
                    disabled={isSaving}
                    style={[shared.button, shared.buttonPrimary]}
                    accessibilityLabel={isSaving ? "Saving dream" : isCapturing ? "Stop recording and save dream" : "Save dream"}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSaving, busy: isSaving }}
                    >
                    {isSaving ? (
                        <ActivityIndicator color={colors.text} />
                    ) : (
                        <View style={shared.buttonRow}>
                            <MaterialIcons name="save" size={20} color={colors.text} />
                            <Text style={shared.buttonText}>
                                {isCapturing ? "Stop & Save Dream" : "Save Dream"}
                            </Text>
                        </View>
                    )}
                    </Pressable>

                    {isCapturing ? (
                    <Pressable
                        onPress={stop}
                        style={[shared.button, shared.buttonSecondary]}
                        accessibilityLabel="Pause recording"
                        accessibilityRole="button"
                    >
                        <View style={shared.buttonRow}>
                        <MaterialIcons name="pause" size={20} color={colors.text} />
                        <Text style={shared.buttonText}>Pause</Text>
                        </View>
                    </Pressable>
                    ) : null}

                    {!isCapturing && !isSaving ? (
                    <Pressable
                        onPress={() => start(transcript)}
                        style={[shared.button, shared.buttonSecondary]}
                        accessibilityLabel="Resume recording"
                        accessibilityRole="button"
                    >
                        <View style={shared.buttonRow}>
                        <MaterialIcons name="play-arrow" size={20} color={colors.text} />
                        <Text style={shared.buttonText}>Resume</Text>
                        </View>
                    </Pressable>
                    ) : null}

                    <Pressable
                        onPress={addParagraphBreak}
                        style={[shared.button, shared.buttonSecondary]}
                        accessibilityLabel="Insert paragraph break"
                        accessibilityRole="button"
                    >
                        <View style={shared.buttonRow}>
                            <MaterialIcons name="format-list-bulleted-add" size={20} color={colors.text} />
                            <Text style={shared.buttonText}>New Paragraph</Text>
                        </View>
                    </Pressable>

                    <Pressable
                        onPress={handleDiscard}
                        style={[shared.button, shared.buttonSecondary, shared.buttonDanger]}
                        accessibilityLabel="Discard dream"
                        accessibilityRole="button"
                    >
                        <View style={shared.buttonRow}>
                            <MaterialIcons name="delete" size={20} color={colors.text} />
                            <Text style={shared.buttonText}>Discard</Text>
                        </View>
                    </Pressable>
                </View>
            </ScrollView>
        </Screen>
    );
}

// screen-specific styles for the CaptureDreamScreen
const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: "stretch",
        justifyContent: "flex-start"
    },
    status: {
        color: colors.textSecondary,
        fontSize: 16,
        textAlign: "center",
        marginBottom: 16
    },
    transcript: {
        color: colors.text,
        fontSize: 18,
        lineHeight: 26
    },
    error: {
        color: colors.error,
        fontSize: 14,
        marginTop: 12,
        textAlign: "center"
    },
    tagEditor: {
        marginTop: 12
    },
    actions: {
        marginTop: 20,
        gap: 12
    }
});
