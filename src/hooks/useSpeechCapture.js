import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import { assembleChunks, PARAGRAPH_BREAK } from "./assembleChunks";

/*

This hook provides a simple interface for capturing speech input and converting
it to text. It uses the Expo Speech Recognition module to handle the underlying
speech recognition functionality, and uses hooks to manage the state of the
speech recognition process.

This file is heavily influenced/inspired by the Expo Speech Recognition module's
own example code (https://github.com/jamsch/expo-speech-recognition), but has
been modified to support continuous speech recognition, interim results, and
the ability to persist audio recordings for later playback. It also provides a
simple interface for starting, stopping, and aborting the speech recognition
process, as well as for accessing the final transcript and any errors that may
occur during the process.

*/

// Default options for the speech recognition process. These can be overridden
// by passing in an options object to the useSpeechCapture hook.
const DEFAULT_OPTIONS = {
    lang: "en-US",
    interimResults: true,
    continuous: true,
    addsPunctuation: true
};

export function useSpeechCapture(options = {}) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState(null);
    const isCapturingRef = useRef(false);

    // use a ref to capture the URI synchronously
    const audioUriRef = useRef(null);

    // Keep the latest options without re-creating start() on every render.
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const interimRef = useRef("");
    const chunksRef = useRef([]);

    useSpeechRecognitionEvent("start", () => {
        setIsCapturing(true);
        isCapturingRef.current = true;
        setError(null);
    });

    useSpeechRecognitionEvent("end", () => {
        setIsCapturing(false);
        isCapturingRef.current = false;
        interimRef.current = "";
    });

    // the "result" event is emitted when the recognizer has a final result, or an
    // interim result if interimResults is true.  The event contains an array of
    // results, but we only care about the first one.
    useSpeechRecognitionEvent("result", (event) => {
        const text = event.results[0]?.transcript ?? "";
        if (event.isFinal) {
            interimRef.current = "";
            if (text.trim()) {
                chunksRef.current = [...chunksRef.current, text.trim()];
            }
        } else {
            interimRef.current = text;
        }
        optionsRef.current.onTranscriptChange?.(assembleChunks(chunksRef.current, interimRef.current));
  });

    useSpeechRecognitionEvent("error", (event) => {
        setIsCapturing(false);
        // abort() always emits an "aborted" error; that is a normal cancellation.
        if (event.error !== "aborted") {
            setError(event.message || event.error);
        }
    });

    // The "audioend" event is emitted when the recognizer has finished capturing
    // audio, and the audio file is available.  The event contains a uri property
    // with the path to the audio file.  This is only supported on iOS and Android
    // 13+, and only if persistAudio is true in the options passed to start().
    useSpeechRecognitionEvent("audioend", (event) => {
        if (event.uri) {
            audioUriRef.current = event.uri;
        }
    });

    function insertBreak() {
        const chunks = chunksRef.current;
        if (chunks.length === 0) return;
        if (chunks[chunks.length - 1] === PARAGRAPH_BREAK) return;
        chunksRef.current = [...chunks, PARAGRAPH_BREAK];
    }

    function startRecognizer() {
        const { persistAudio, ...speechOptions } = optionsRef.current;
        ExpoSpeechRecognitionModule.start({
            ...DEFAULT_OPTIONS,
            ...speechOptions,
            ...(persistAudio && ExpoSpeechRecognitionModule.supportsRecording()
                ? { recordingOptions: { persist: true } }
                : {})
        });
    }

    // Stops the recognizer so current speech finalizes into chunks, inserts a
    // paragraph break, then restarts a fresh session so new speech lands after
    // the break without duplicating earlier text.
    const addParagraphBreak = useCallback(() => {
        if (!isCapturingRef.current) {
            insertBreak();
            optionsRef.current.onTranscriptChange?.(assembleChunks(chunksRef.current, interimRef.current));
            return;
        }
        const sub = ExpoSpeechRecognitionModule.addListener('end', () => {
            sub.remove();
            insertBreak();
            optionsRef.current.onTranscriptChange?.(assembleChunks(chunksRef.current, interimRef.current));
            startRecognizer();
        });
        ExpoSpeechRecognitionModule.stop();
    }, []);

    const start = useCallback(async (existingText) => {
        setError(null);

        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
            setError("Microphone and speech recognition access are required to record a dream.");
            return false;
        }

        if (existingText) {
            chunksRef.current = [existingText];
        }
        insertBreak();
        startRecognizer();
        return true;
    }, []);

    // Ends the session and lets the recognizer emit its final result.
    const stop = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
    }, []);

    // testing revealed that just calling stop when we handle a save&close event
    // introduces a race condition where the autioUri may not be available yet
    // to pass to insertDream.  To avoid this, we use a Promise that will resolve
    // after the end event fires, when we have the audioUri for saving
    const stopAsync = useCallback(() => {
        return new Promise((resolve) => {
            const sub = ExpoSpeechRecognitionModule.addListener('end', () => {
                sub.remove();
                resolve();
            });
            ExpoSpeechRecognitionModule.stop();
        });
    }, []);

    // Throws away the session without waiting for a final result.
    const abort = useCallback(() => {
        ExpoSpeechRecognitionModule.abort();
    }, []);

    const reset = useCallback(() => {
        chunksRef.current = [];
        interimRef.current = "";
        setError(null);
        audioUriRef.current = null;
    }, []);

    // Never leave the microphone running if the screen goes away.
    useEffect(() => {
        return () => ExpoSpeechRecognitionModule.abort();
    }, []);

    return {
        start,
        stop,
        stopAsync,
        abort,
        reset,
        addParagraphBreak,
        isCapturing,
        error,
        audioUriRef
    };
}
