const { matchTags, deduplicateTagNames } = require('../dreamdb.js');

// Simulates the rows returned by the SQL query in suggestTags.
// Aliases have a different match_text than their canonical;
// canonical tags have the same value for both.
const TAG_ROWS = [
    { match_text: 'flying',     canonical: 'flying' },
    { match_text: 'flew',       canonical: 'flying' },
    { match_text: 'flight',     canonical: 'flying' },
    { match_text: 'water',      canonical: 'water' },
    { match_text: 'ocean',      canonical: 'water' },
    { match_text: 'underwater', canonical: 'water' },
    { match_text: 'swimming',   canonical: 'water' },
    { match_text: 'lucid',      canonical: 'lucid' },
    { match_text: 'nightmare',  canonical: 'nightmare' },
    { match_text: 'scary',      canonical: 'nightmare' },
    { match_text: 'teeth',      canonical: 'teeth' },
    { match_text: 'tooth',      canonical: 'teeth' },
    { match_text: 'school',     canonical: 'school' },
    { match_text: 'classroom',  canonical: 'school' },
];

describe('matchTags', () => {

    it('should return canonical tag when transcript contains it', () => {
        const result = matchTags(TAG_ROWS, 'I was flying over the city');
        expect(result).toContain('flying');
    });

    it('should resolve an alias to its canonical tag', () => {
        const result = matchTags(TAG_ROWS, 'I was in an underwater cave');
        expect(result).toContain('water');
        expect(result).not.toContain('underwater');
    });

    it('should not return duplicates when transcript matches both alias and canonical', () => {
        const result = matchTags(TAG_ROWS, 'I was swimming in the water');
        const waterCount = result.filter(t => t === 'water').length;
        expect(waterCount).toBe(1);
    });

    it('should return multiple tags when transcript matches several', () => {
        const result = matchTags(TAG_ROWS, 'I was flying over a scary ocean');
        expect(result).toContain('flying');
        expect(result).toContain('nightmare');
        expect(result).toContain('water');
    });

    it('should return an empty array when nothing matches', () => {
        const result = matchTags(TAG_ROWS, 'I was walking down the street');
        expect(result).toEqual([]);
    });

    it('should match case-insensitively', () => {
        const result = matchTags(TAG_ROWS, 'It was a LUCID dream');
        expect(result).toContain('lucid');
    });

});

describe('deduplicateTagNames', () => {
    it('should handle case sensitivity dedup', () => {
        const result = deduplicateTagNames(["Lucid", "lucid", "LUCID"]);
        expect(result).toStrictEqual(["Lucid"]);
    });

    it('should trim whitespace', () => {
        const result = deduplicateTagNames(["  flying  ", "water"]);
        expect(result).toStrictEqual(["flying", "water"]);
    });

    it('should filter whitespace-only', () => {
        const result = deduplicateTagNames(["", "  ", "water"]);
        expect(result).toStrictEqual(["water"]);
    });

    it('should preserve order', () => {
        const result = deduplicateTagNames(["water", "flying", "lucid"]);
        expect(result).toStrictEqual(["water", "flying", "lucid"]);
    });

    it('should handle empty input', () => {
        const result = deduplicateTagNames([]);
        expect(result).toStrictEqual([]);
    });

    it('should coerce non-strings to string', () => {
        const result = deduplicateTagNames([123, null, "water"]);
        expect(result).toStrictEqual(["123", "null", "water"]);
    });
});
