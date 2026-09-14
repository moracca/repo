// Pushed into finalChunks when a new session starts with pre-existing text, so
// that pausing and resuming reads as a new paragraph.  This gets converted to a
// blank line in the final transcript, but is never stored in the database. 
// We use an exported Symbol instead of a sentinel string so that it cannot be
// confused with any actual transcript text
export const PARAGRAPH_BREAK = Symbol("paragraph-break");

export function assembleChunks(chunks, interim) {
    return [...chunks, interim]
        // filter out any empty strings or paragraph breaks that are at the start
        // or end of the transcript, so that we don't have stray blank lines at the top or bottom.
        .filter(Boolean)
        .reduce((text, piece) => {
            if (piece === PARAGRAPH_BREAK) {
                return `${text.trimEnd()}\n\n`;
            }
            if (!text || text.endsWith("\n")) {
                return text + piece;
            }
            return `${text} ${piece}`;
        }, "")
        // leave trailing newlines so the inline mic icon moves to the new line
        .trimStart();
}
