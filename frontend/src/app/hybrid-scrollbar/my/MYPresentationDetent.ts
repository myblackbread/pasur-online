export type MYPresentationDetent =
    | 'medium'
    | 'large'
    | number
    | `${number}px`
    | `${number}%`;

const clamp = (val: number, min: number, max: number): number =>
    Math.min(Math.max(val, min), max);

export const myResolveDetentHeight = ({
    detent = 'medium',
    windowHeight,
}: {
    detent?: MYPresentationDetent;
    windowHeight: number;
}): number => {
    if (windowHeight <= 0) {
        return 0;
    }

    if (detent === 'medium') {
        return windowHeight * 0.5;
    }

    if (detent === 'large') {
        return windowHeight * 0.92;
    }

    // Число трактуется как доля экрана (0..1). Значения > 1 превращаются в 1 (100%)
    if (typeof detent === 'number') {
        if (Number.isNaN(detent)) {
            return windowHeight * 0.5;
        }
        const normalized = Math.min(Math.max(detent, 0), 1);
        return normalized * windowHeight;
    }

    if (typeof detent === 'string') {
        if (detent.endsWith('px')) {
            const parsed = parseFloat(detent);
            if (Number.isNaN(parsed)) {
                return windowHeight * 0.5;
            }
            return clamp(parsed, 0, windowHeight);
        }

        if (detent.endsWith('%')) {
            const parsed = parseFloat(detent);
            if (Number.isNaN(parsed)) {
                return windowHeight * 0.5;
            }
            // Проценты ограничиваются максимумом в 100%
            const pct = Math.min(Math.max(parsed, 0), 100);
            return (pct / 100) * windowHeight;
        }
    }

    return windowHeight * 0.5;
};