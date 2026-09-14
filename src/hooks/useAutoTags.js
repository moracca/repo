/*
  This hook is responsible for automatically suggesting tags based on the
  transcript. It uses a timer to avoid calling the auto-tagging service on every
  new transcript segment, and it keeps track of which tags have already been
  suggested to avoid duplicates and prevent re-adding tags that the user has
  already dismissed. The hook takes in the transcript, a boolean indicating
  whether auto-tagging is enabled, a callback to handle the suggested tags, and
  an optional delay (defaulting to 800ms) for the timer.
*/
import { useEffect, useRef } from "react";
import { suggestTags } from "../db/dreamdb";

export function useAutoTags({ transcript, enabled, onSuggest, delay = 800 }) {
    const seenRef = useRef(new Set());
    // Keep a ref to the onSuggest callback to avoid re-running the effect when
    // it changes, which resets the timer, preventing the auto-tagging service
    // from being called.
    const onSuggestRef = useRef(onSuggest);
    onSuggestRef.current = onSuggest;

    useEffect(() => {
        if (!enabled || !transcript.trim()) return;

        let cancelled = false;
        // Use a timer (800ms delay by default) to avoid calling the auto-tagging
        // service too frequently if we are receiving new transcript segments
        // rapidly
        const timer = setTimeout(() => {
            suggestTags(transcript)
                .then((suggested) => {
                    if (cancelled) return;
                    const fresh = suggested.filter((t) => !seenRef.current.has(t.toLowerCase()));
                    suggested.forEach((t) => seenRef.current.add(t.toLowerCase()));
                    // call the onSuggest callback to merge the new entries into
                    // the existing list
                    if (fresh.length) onSuggestRef.current(fresh);
                })
                .catch((error) => console.warn("Auto-tagging failed:", error));
        }, delay);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [transcript, enabled, delay]);
}
