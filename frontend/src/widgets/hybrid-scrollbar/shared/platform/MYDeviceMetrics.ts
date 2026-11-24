import { myGetPlatformType, MYPlatformType } from './MYPlatformType';
import { MYEdgeInsets } from './MYEdgeInsets';

const MY_MOBILE_BASE_INSET = 8;
const MY_DESKTOP_BASE_INSET = 16;

export const myGetDefaultCornerRadius = ({
    platform = myGetPlatformType(),
}: {
    platform?: MYPlatformType;
} = {}): number => {
    switch (platform) {
        case 'ios': {
            if (typeof window !== 'undefined') {
                const maxDimension = Math.max(window.screen.width, window.screen.height);
                return maxDimension > 840 ? 38 : 32;
            }
            return 32;
        }
        case 'android':
            return 28; // Material Design 3
        case 'desktop':
        default:
            return 24;
    }
};

export const myGetDefaultSheetPadding = ({
    platform = myGetPlatformType(),
}: {
    platform?: MYPlatformType;
} = {}): MYEdgeInsets => {
    if (platform === 'desktop') {
        return MYEdgeInsets.only({
            left: MY_DESKTOP_BASE_INSET,
            right: MY_DESKTOP_BASE_INSET,
            bottom: MY_DESKTOP_BASE_INSET,
        });
    }

    return MYEdgeInsets.only({
        left: MY_MOBILE_BASE_INSET,
        right: MY_MOBILE_BASE_INSET,
        bottom: MY_MOBILE_BASE_INSET, // Строго физический отступ
    });
};