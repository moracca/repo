import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shared } from '../theme/styles';

import { formatDreamDate, distanceOfTime } from '../utils/dateHelpers';
import { dreamSummary } from '../utils/dreamHelpers';

export function DreamListCard({ dream, style, onTagPress }) {
    const navigation = useNavigation();

    return (
        <Pressable
            onPress={() => navigation.navigate('DreamDetail', { id: dream.id })}
            style={[shared.card, style]}
            accessibilityLabel={`Dream from ${formatDreamDate(dream.created_at)}`}
            accessibilityRole="button"
            accessibilityHint="Opens dream details"
        >
            <Text style={shared.cardTitle}>{formatDreamDate(dream.created_at)}</Text>
            <Text style={shared.mininote}>({distanceOfTime(dream.created_at)})</Text>
            <Text style={shared.cardContent} numberOfLines={3}>
                {dreamSummary(dream, 200)}
            </Text>
            {dream.tags?.length > 0 && (
                <View style={shared.tagContainer}>
                    {dream.tags.map((tag) => (
                        (onTagPress ? (
                            <Pressable
                                key={tag.id}
                                onPress={() => onTagPress(tag.tag)}
                                accessibilityLabel={`Filter by tag ${tag.tag}`}
                                accessibilityRole="button"
                            >
                                <Text style={shared.tag}>{tag.tag}</Text>
                            </Pressable>
                        ) : <Text key={tag.id} style={shared.tag}>{tag.tag}</Text>
                    )))}
                </View>
            )}
        </Pressable>
    );
}
