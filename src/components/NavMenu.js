import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";

const MENU_ITEMS = [
    { label: "New Dream", icon: "mic", screen: "CaptureDream", params: { mode: 'voice' } },
    { label: "Dream History", icon: "history", screen: "History" },
    { label: "Dreamfield", icon: "bubble-chart", screen: "Dreamfield" },
    { label: "Analytics", icon: "bar-chart", screen: "Analytics" },
    { label: "Settings", icon: "settings", screen: "Settings" },
];

export function NavMenu() {
    const navigation = useNavigation();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                style={styles.button}
                accessibilityLabel="Open navigation menu"
                accessibilityRole="button"
            >
                <MaterialIcons name="menu" size={24} color={colors.text} />
            </Pressable>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <View style={styles.menu}>
                        {MENU_ITEMS.map((item) => (
                            <Pressable
                                key={item.screen}
                                style={styles.menuItem}
                                accessibilityLabel={item.label}
                                accessibilityRole="menuitem"
                                onPress={() => {
                                    setOpen(false);
                                    navigation.navigate(item.screen, item.params);
                                }}
                            >
                                <MaterialIcons name={item.icon} size={24} color={colors.text} />
                                <Text style={[shared.text, styles.menuText]}>{item.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    button: {
        marginRight: 12,
        padding: 4,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menu: {
        marginTop: 80,
        marginRight: 12,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(194, 247, 255, 0.15)',
        paddingVertical: 6,
        minWidth: 180,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    menuText: {
        marginBottom: 0,
        textAlign: 'left',
    },
});
