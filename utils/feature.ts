// These capabilities are based on the build target, not runtime detection.
export const supportsLinkText = import.meta.env.BROWSER === 'firefox';
export const supportsMenuClickButton = import.meta.env.BROWSER === 'firefox';
