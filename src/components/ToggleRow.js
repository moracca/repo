import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';

export function ToggleRow({ label, value, onValueChange, onLabel="ON", offLabel="OFF", description }) {
    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            style={styles.row}
            accessibilityLabel={`${label}, ${value ? onLabel : offLabel}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
        >
            <View style={styles.labelSide}>
                <Text style={[shared.text, styles.label]}>{label}</Text>
                {description && <Text style={styles.description}>{description}</Text>}
            </View>

            <View style={[styles.track, value && styles.trackOn]}>
                {value && <Text style={styles.stateLabel}>{onLabel}</Text>}
                <View style={styles.thumb} />
                {!value && <Text style={styles.stateLabel}>{offLabel}</Text>}
            </View>
        </Pressable>
    );
}


const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 8,
        marginBottom: 8,
    },
    labelSide: {
        flex: 1,
        marginRight: 12,
    },
    label: {
        color: colors.text,
        fontSize: 30,
        marginBottom: 0,
        textAlign: 'left'
    },
    description: {
        color: colors.textTertiary,
        fontSize: 12,
        marginTop: 2,
    },
    track: {
        minWidth: 56,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.textTertiary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        gap: 4,
    },
    stateLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.text,
        paddingHorizontal: 2,
    },
    trackOn: {
        backgroundColor: colors.primary,
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.text,
    },
    thumbOn: {
        position: 'absolute',
        right: 3,
    },
    state: {
        fontSize: 9,
        fontWeight: 'bold',
        position: 'absolute',
    },
    stateOn: {
        left: 8,
        color: colors.text,
    },
    stateOff: {
        right: 7,
        color: colors.surface,
    },
});