export type MYInsetValue = number | string;

const formatValue = (v: MYInsetValue): string => {
    if (typeof v === 'number') {
        return v === 0 ? '0px' : `${v}px`;
    }
    return v;
};

type EdgeInsetsProps = {
    top?: MYInsetValue;
    right?: MYInsetValue;
    bottom?: MYInsetValue;
    left?: MYInsetValue;
};

export class MYEdgeInsets {
    readonly top: MYInsetValue;
    readonly right: MYInsetValue;
    readonly bottom: MYInsetValue;
    readonly left: MYInsetValue;

    constructor(insets: EdgeInsetsProps = {}) {
        this.top = insets.top ?? 0;
        this.right = insets.right ?? 0;
        this.bottom = insets.bottom ?? 0;
        this.left = insets.left ?? 0;
    }

    static readonly zero = new MYEdgeInsets();

    static all(value: MYInsetValue): MYEdgeInsets {
        return new MYEdgeInsets({ top: value, right: value, bottom: value, left: value });
    }

    static symmetric({
        horizontal = 0,
        vertical = 0,
    }: {
        horizontal?: MYInsetValue;
        vertical?: MYInsetValue;
    }): MYEdgeInsets {
        return new MYEdgeInsets({ top: vertical, right: horizontal, bottom: vertical, left: horizontal });
    }

    static only(insets: EdgeInsetsProps): MYEdgeInsets {
        return new MYEdgeInsets(insets);
    }

    copyWith(insets: EdgeInsetsProps): MYEdgeInsets {
        return new MYEdgeInsets({
            top: insets.top ?? this.top,
            right: insets.right ?? this.right,
            bottom: insets.bottom ?? this.bottom,
            left: insets.left ?? this.left,
        });
    }

    toCSS(): string {
        const t = formatValue(this.top);
        const r = formatValue(this.right);
        const b = formatValue(this.bottom);
        const l = formatValue(this.left);

        if (t === r && t === b && t === l) {
            return t;
        }

        if (t === b && r === l) {
            return `${t} ${r}`;
        }

        if (r === l) {
            return `${t} ${r} ${b}`;
        }

        return `${t} ${r} ${b} ${l}`;
    }

    toStyle<P extends 'padding' | 'margin' = 'padding'>({
        property = 'padding' as P,
    }: {
        property?: P;
    } = {}): Record<`${P}${'Top' | 'Right' | 'Bottom' | 'Left'}`, string> {
        return {
            [`${property}Top`]: formatValue(this.top),
            [`${property}Right`]: formatValue(this.right),
            [`${property}Bottom`]: formatValue(this.bottom),
            [`${property}Left`]: formatValue(this.left),
        } as Record<`${P}${'Top' | 'Right' | 'Bottom' | 'Left'}`, string>;
    }
}