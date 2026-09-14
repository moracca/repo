const { assembleChunks, PARAGRAPH_BREAK } = require('../assembleChunks');

describe('assembleChunks', () => {
    // This test suite verifies the behavior of the assembleChunks function, which 
    // combines an array of text chunks and an interim chunk into a single string, 
    // handling paragraph breaks and whitespace appropriately.

    it('joins existing chunks together with spaces', () => {
        expect(assembleChunks(['Hello', 'world'], ''))
            .toBe('Hello world');
    });

    it('appends the interim result to the end of the existing chunks', () => {
        expect(assembleChunks(['Hello'], 'wor'))
            .toBe('Hello wor');
    });

    it('returns an empty string when both chunks and interim are empty', () => {
        expect(assembleChunks([], ''))
            .toBe('');
    });

    // The PARAGRAPH_BREAK symbol is used to indicate a paragraph break in the
    // transcript.  We need to make sure it gets replaced with a blank line that
    // will be rendered as a paragraph break in the final transcript.
    
    it('inserts a blank line for PARAGRAPH_BREAK', () => {
        expect(assembleChunks(['First paragraph', PARAGRAPH_BREAK, 'Second paragraph'], ''))
            .toBe('First paragraph\n\nSecond paragraph');
    });

    it('trims trailing spaces before a paragraph break', () => {
        expect(assembleChunks(['trailing spaces   ', PARAGRAPH_BREAK, 'next'], ''))
            .toBe('trailing spaces\n\nnext');
    });

    it('does not stack consecutive paragraph breaks', () => {
        const result = assembleChunks(['one', PARAGRAPH_BREAK, PARAGRAPH_BREAK, 'two'], '');
        expect(result).toBe('one\n\ntwo');
    });

    it('strips leading whitespace from the final transcript', () => {
        expect(assembleChunks([' leading space'], ''))
            .toBe('leading space');
    });

    it('preserves trailing newlines so the mic icon moves down', () => {
        const result = assembleChunks(['Some text', PARAGRAPH_BREAK], '');
        expect(result.endsWith('\n\n')).toBe(true);
    });

    it('filters out empty chunks', () => {
        expect(assembleChunks(['Hello', '', 'world'], ''))
            .toBe('Hello world');
    });
});
