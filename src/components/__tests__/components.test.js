const React = require('react');
const { render } = require('@testing-library/react-native');

const { ToggleRow } = require('../ToggleRow');
const { DreamListCard } = require('../DreamListCard');

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: jest.fn() }),
}));

// Pin the clock so relative dates in DreamListCard snapshots don't drift.
beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-09-07T12:00:00Z') }); });
afterAll(() => { jest.useRealTimers(); });

describe('ToggleRow', () => {
    it('renders ON state and matches snapshot', async () => {
        const { toJSON } = await render(
            <ToggleRow label="Auto-tagging" value={true} onValueChange={() => {}} />
        );
        expect(toJSON()).toMatchSnapshot();
    });

    it('renders OFF state and matches snapshot', async () => {
        const { toJSON } = await render(
            <ToggleRow label="Auto-tagging" value={false} onValueChange={() => {}} />
        );
        expect(toJSON()).toMatchSnapshot();
    });

    it('renders custom on/off labels', async () => {
        const { getByText, toJSON } = await render(
            <ToggleRow
                label="Entry Mode"
                value={true}
                onValueChange={() => {}}
                onLabel="Voice"
                offLabel="Keyboard"
            />
        );
        expect(getByText('Voice')).toBeTruthy();
        expect(toJSON()).toMatchSnapshot();
    });

    it('renders description when provided', async () => {
        const { getByText } = await render(
            <ToggleRow
                label="Keep audio"
                value={false}
                onValueChange={() => {}}
                description="Save the audio recording alongside the transcript"
            />
        );
        expect(getByText('Save the audio recording alongside the transcript')).toBeTruthy();
    });
});

describe('DreamListCard', () => {
    const dream = {
        id: 1,
        created_at: '2026-08-15T08:30:00.000Z',
        transcript: 'I was flying over a vast purple ocean with glowing fish beneath the surface.',
        tags: [
            { id: 10, tag: 'flying' },
            { id: 11, tag: 'water' },
        ],
    };

    it('renders a dream card with tags and matches snapshot', async () => {
        const { toJSON } = await render(<DreamListCard dream={dream} />);
        expect(toJSON()).toMatchSnapshot();
    });

    it('renders tags when present', async () => {
        const { getByText } = await render(<DreamListCard dream={dream} />);
        expect(getByText('flying')).toBeTruthy();
        expect(getByText('water')).toBeTruthy();
    });

    it('renders without tags and matches snapshot', async () => {
        const { toJSON } = await render(<DreamListCard dream={{ ...dream, tags: [] }} />);
        expect(toJSON()).toMatchSnapshot();
    });
});
