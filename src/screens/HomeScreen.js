import { Image, Pressable, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { countDreams, getSettings } from "../db/dreamdb";

import { shared } from "../theme/styles";
import { Screen } from "../components/Screen";
import { ImageButton } from "../components/ImageButton";

export function HomeScreen() {
    const navigation = useNavigation();
    const [dreamCount, setDreamCount] = useState(null);
    // keep track of whether we have already autostarted a recording, so the
    // user doesn't keep getting bounced away from the home screen after they
    // have finished recording
    const hasAutoStarted = useRef(false);

    // use useFocusEffect to fetch the dream count whenever the HomeScreen is 
    // focused.  useEffect() is not sufficient because the HomeScreen is not
    // unmounted when navigating to other screens, so we need to use
    // useFocusEffect() to ensure that the dream count is updated whenever the
    // user navigates back to the HomeScreen.
    useFocusEffect(
        useCallback(() => {
            const fetchDreamCount = async () => {
                const count = await countDreams();
                setDreamCount(count);
            };
            fetchDreamCount();
        }, [])
    );

    useEffect(() => {
        if (hasAutoStarted.current) return;
        getSettings().then((settings) => {
            if (settings.startRecordingOnOpen === 'true') {
                hasAutoStarted.current = true;
                navigation.navigate("CaptureDream", { mode: 'voice' });
            }
        });
    }, []);

    return (
        <Screen scrollable>
            <Text style={shared.text}>Welcome to the Dreamweaver App!</Text>
            <Text style={shared.text}>Use the buttons below to start capturing a new dream.</Text>
            
            <View style={[shared.row, shared.mb20]}>
                <ImageButton onPress={() => navigation.navigate("CaptureDream", {mode: 'voice'})} source={require('../../assets/images/microphone.png')} label="Voice"/>
                <ImageButton onPress={() => navigation.navigate("CaptureDream", {mode: 'keyboard'})} source={require('../../assets/images/keyboard.png')} label="Keyboard"/>
            </View>
            
            <Text style={shared.text}>Or explore your dream history with the options below</Text>
            
            <View style={[shared.row, shared.mb20]}>
                <ImageButton wide onPress={() => navigation.navigate("Dreamfield")} source={require('../../assets/images/dreamfield.png')} label={`Explore the Dreamfield`}/>
            </View>

            <View style={[shared.row, shared.mb20]}>
                <ImageButton onPress={() => navigation.navigate("History")} source={require('../../assets/images/calendar.png')} label={`Dream History (${dreamCount})`}/>
                <ImageButton onPress={() => navigation.navigate("Analytics")} source={require('../../assets/images/barchart.png')} label={`Analytics`}/>
            </View>


            <Pressable
                onPress={() => navigation.navigate("Settings")}
                style={[shared.button, shared.buttonPill, shared.buttonPrimary]}
                accessibilityLabel="Settings"
                accessibilityRole="button"
            >
                <Text style={[shared.buttonText, shared.buttonTextLarge]}>Settings</Text>
            </Pressable>
        </Screen>
    );
}
