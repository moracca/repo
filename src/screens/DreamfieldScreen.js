import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { DreamForceGraph } from "../components/DreamForceGraph";
import { DreamOverlay } from "../components/DreamOverlay";
import { TagOverlay } from "../components/TagOverlay";
import { getSettings, setSetting, listDreamsWithTags } from "../db/dreamdb";
import { colors } from "../theme/colors";

export function DreamfieldScreen() {
    const graphRef = useRef(null);
    const [selected, setSelected] = useState(null);
    const [selectedTag, setSelectedTag] = useState(null);
    const [tagDreams, setTagDreams] = useState([]);
    const [gyroEnabled, setGyroEnabled] = useState(true);
    const dreamsRef = useRef([]);

    useEffect(() => {
        getSettings().then((s) => setGyroEnabled(s.gyroEnabled !== 'false'));
        listDreamsWithTags().then((d) => { dreamsRef.current = d; });
    }, []);

    const handleNodeSelect = useCallback((node) => {
        if (node.type === 'dream') {
            setSelectedTag(null);
            setSelected(node);
        } else if (node.type === 'tag') {
            setSelected(null);
            setSelectedTag(node.name);
            const matching = dreamsRef.current.filter(
                (d) => d.tags?.some((t) => t.tag.toLowerCase() === node.name.toLowerCase())
            );
            setTagDreams(matching);
        }
    }, []);

    const handleBackgroundClick = useCallback(() => {
        setSelected(null);
        setSelectedTag(null);
    }, []);

    return (
        <Screen>
            <DreamForceGraph
                ref={graphRef}
                style={{ flex: 1 }}
                onNodeSelect={handleNodeSelect}
                onBackgroundClick={handleBackgroundClick}
                gyroEnabled={gyroEnabled}
            />

            <Pressable
                onPress={() => setGyroEnabled(prev => {
                    const next = !prev;
                    setSetting('gyroEnabled', String(next));
                    return next;
                })}
                style={styles.gyroButton}
                accessibilityLabel={gyroEnabled ? "Disable gyroscope camera orbit" : "Enable gyroscope camera orbit"}
                accessibilityRole="togglebutton"
                accessibilityState={{ checked: gyroEnabled }}
            >
                <MaterialIcons
                    name={"view-in-ar"}
                    size={20}
                    color={gyroEnabled ? colors.primary : colors.textTertiary}
                />
            </Pressable>

            <Pressable
                onPress={() => graphRef.current?.zoomToFit()}
                style={styles.zoomButton}
                accessibilityLabel="Zoom to fit entire graph"
                accessibilityRole="button"
            >
                <MaterialIcons name="zoom-out-map" size={20} color={colors.textSecondary} />
            </Pressable>

            <DreamOverlay
                dream={selected}
                onClose={() => setSelected(null)}
                onTagPress={(tagName) => {
                    setSelected(null);
                    graphRef.current?.focusNode(tagName, 'tag');
                    handleNodeSelect({ type: 'tag', name: tagName });
                }}
            />

            <TagOverlay
                tagName={selectedTag}
                dreams={tagDreams}
                onClose={() => setSelectedTag(null)}
                onDreamPress={(dream) => {
                    setSelectedTag(null);
                    graphRef.current?.focusNode(dream.transcript?.slice(0, 30), 'dream');
                    setSelected({
                        type: 'dream',
                        dreamId: dream.id,
                        transcript: dream.transcript,
                        tags: dream.tags,
                    });
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    gyroButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(194, 247, 255, 0.15)',
    },
    zoomButton: {
        position: 'absolute',
        top: 56,
        right: 12,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(194, 247, 255, 0.15)',
    },
});
