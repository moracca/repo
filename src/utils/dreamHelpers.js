export function dreamSummary(dream, limit = 100) {
    if (!dream) return "";
    return dream.transcript.substring(0, limit) + (dream.transcript.length > limit ? "..." : "");
}