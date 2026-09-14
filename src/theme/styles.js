// src/theme/styles.js
import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const shared = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center'
    },
    mb20: {
        marginBottom: 20
    },
    mt20: {
        marginTop: 20
    },
    text: {
        color: colors.text,
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Social Media'
    },
    // Buttons are composed with base geometry first, then a size and a variant.
    //  [shared.button, shared.buttonPrimary] produces a standard primary-filled button
    //  [shared.button, shared.buttonPill, shared.buttonPrimary] produces a large pill
    //  [shared.button, shared.buttonSecondary] produces a standard primary-outlined button
    button: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPill: {
        paddingVertical: 30,
        borderRadius: 100,
        marginTop: 20,
    },
    buttonPrimary: {
        backgroundColor: colors.primary,
    },
    buttonSecondary: {
        borderWidth: 1,
        borderColor: colors.primary,
    },
    buttonDanger: {
        backgroundColor: colors.error,
    },
    buttonText: {
        color: colors.text,
        fontSize: 40,
        textAlign: 'center',
        fontFamily: 'Social Media'
    },
    buttonTextLarge: {
        fontSize: 40,
    },
    buttonSubText: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    // Wraps an icon and its label inside a Pressable.
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },


    row: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 16,
        alignSelf: 'stretch',
    },
    imageButton: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center'
    },
    imageButtonImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        borderColor: colors.primary,
        borderWidth: 2
    },

    section: {
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 24,
        padding: 16,
        marginBottom: 20,
        alignSelf: 'stretch',
    },

    card: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        // alignSelf rather than width: '100%'. In a column it fills the width
        // the same way, but inside a row it doesn't force the card to be as
        // wide as its parent and push siblings off screen.
        alignSelf: 'stretch',
    },
    cardTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    cardContent: {
        color: colors.textSecondary,
        fontSize: 16,
    },

    mininote: {
        color: colors.textSecondary,
        fontSize: 10,
        marginBottom: 8,
    },

    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    tag: {
        backgroundColor: colors.primary,
        color: colors.text,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 4,
        marginBottom: 4,
        fontSize: 12,
    },
    tagSecondary: {
        backgroundColor: colors.surface,
        color: colors.textSecondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 4,
        marginBottom: 4,
        fontSize: 12,
    },




    transcriptBox: {
        minHeight: 100,
        flex: 1,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.textSecondary,
        marginBottom: 10
    },
    // contentContainerStyle for the ScrollView inside transcriptBox.
    transcriptContent: {
        padding: 16,
    },

    // maxHeight is what makes a multiline TextInput scroll: without it the
    // field keeps growing to fit its content and pushes the screen instead.
    transcriptInput: {
        color: colors.text,
        fontSize: 16,
        lineHeight: 22,
        minHeight: 120,
        maxHeight: 320,
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.textSecondary,
    },
});
