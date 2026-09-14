import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { ToggleRow } from "../components/ToggleRow";
import { TagManager } from "../components/TagManager";
import { resetDatabase, seedDreams, getSettings, setSetting } from "../db/dreamdb";
import { shared } from "../theme/styles";
import { ImageButton } from "../components/ImageButton";

export function SettingsScreen() {
    const [autoTagEnabled, setAutoTagEnabled] = useState(true);
    const [startRecordingOnOpen, setStartRecordingOnOpen] = useState(false);
    const [persistAudio, setPersistAudio] = useState(false);
    useEffect(() => {
        getSettings().then((settings) => {
            setAutoTagEnabled(settings.autoTagEnabled === 'true');
            setStartRecordingOnOpen(settings.startRecordingOnOpen === 'true');
            setPersistAudio(settings.persistAudio === 'true');
        });
    }, []);

    const handleAutoTagToggle = (val) => {
        setAutoTagEnabled(val);
        setSetting('autoTagEnabled', String(val));
    };
    const handleStartRecordingOnOpenToggle = (val) => {
        setStartRecordingOnOpen(val);
        setSetting('startRecordingOnOpen', String(val));
    };

    const handlePersistAudioToggle = (val) => {
        setPersistAudio(val);
        setSetting('persistAudio', String(val));
    };

    const handleSeedDreams = async () => {
        await seedDreams();
        Alert.alert("Done", "Sample dreams have been added.");
    };    

    const confirmReset = () => {
        Alert.alert(
            "Reset database?",
            "Every saved dream will be deleted. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        resetDatabase().catch((error) => {
                            Alert.alert(
                                "Could not reset",
                                String(error?.message ?? error)
                            );
                        });
                    }
                }
            ]
        );
    };

    return (
        <Screen scrollable>
            <View style={shared.section}>
                <Text style={shared.text}>Settings</Text>

                <ToggleRow
                    label="Auto-tagging"
                    description="Suggest tags based on transcript"
                    value={autoTagEnabled}
                    onValueChange={handleAutoTagToggle}
                />

                <ToggleRow
                    label="Record on Open"
                    description="Automatically start recoring a dream transcript when the app opens"
                    value={startRecordingOnOpen}
                    onValueChange={handleStartRecordingOnOpenToggle}
                />

                <ToggleRow
                    label="Persist audio files"
                    description="keep voice recordings for later playback"
                    value={persistAudio}
                    onValueChange={handlePersistAudioToggle}
                />
            </View>

            <View style={shared.section}>
                <TagManager />
            </View>

            <View style={shared.section}>
                <Text style={shared.text}>Database</Text>
                <View style={[shared.row]}>
                    <ImageButton onPress={handleSeedDreams} source={require('../../assets/images/seed.png')} label={`Seed Database`}/>
                    <ImageButton onPress={confirmReset} source={require('../../assets/images/resetdb.png')} label={`Reset Database`}/>
                </View>
            </View>

        </Screen>
    );
}
