import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";

export function ImageButton({ source, onPress, label, labelColor = 'rgba(0,0,0,0.55)', wide = false }) {
    return (
        <Pressable
            onPress={onPress}
            style={[styles.imageButton, wide && styles.wide]}
            accessibilityLabel={label}
            accessibilityRole="button"
        >
            <Image source={source} style={styles.imageButtonImage} />
            {label && (
                <View style={[styles.labelBar, { backgroundColor: labelColor }]}>
                    <Text style={[shared.text, styles.labelText]}>{label}</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    imageButton: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderColor: colors.primary,
        borderWidth: 2,
    },
    imageButtonImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    labelBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 10,
        paddingVertical: 6,
        alignItems: 'center',
        zIndex: 1,
    },
    labelText: {
        color: colors.text,
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 0
    },
    wide: {
        aspectRatio: 2 / 1
    }
});

