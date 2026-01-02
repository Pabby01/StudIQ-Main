/**
 * Mobile wallet detection utilities
 * Copied from Campus Store
 */

export function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;

    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
}

export function isIOS(): boolean {
    if (typeof window === 'undefined') return false;

    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
    if (typeof window === 'undefined') return false;

    return /Android/.test(navigator.userAgent);
}

/**
 * Get the appropriate wallet deep link for mobile
 */
export function getWalletDeepLink(walletName: string, url: string): string {
    const encodedUrl = encodeURIComponent(url);

    switch (walletName.toLowerCase()) {
        case 'phantom':
            return `phantom://browse/${encodedUrl}`;
        case 'solflare':
            return `solflare://browse/${encodedUrl}`;
        default:
            return url;
    }
}
