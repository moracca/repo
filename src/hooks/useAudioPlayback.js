import { useCallback } from "react";
// https://docs.expo.dev/versions/latest/sdk/audio/#useaudioplayerstatusplayer
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

export function useAudioPlayback(uri) {
    const player = useAudioPlayer(uri ?? undefined);
    const status = useAudioPlayerStatus(player);

    const isPlaying = status.playing;

    const togglePlayback = useCallback(() => {
        if (isPlaying) {
            player.pause();
        } else {
            player.seekTo(0);
            player.play();
        }
    }, [player, isPlaying]);

    return { togglePlayback, isPlaying, hasAudio: !!uri };
}
