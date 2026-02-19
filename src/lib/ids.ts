export function makeReferenceId(prefix: string) {
    return `${prefix}-${Date.now()}`;
}

export function makeReceiptNo() {
    return String(Date.now()).slice(-6);
}

export function makeClientTxnId(deviceId = 'web') {
    const rand = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? (globalThis.crypto as Crypto).randomUUID()
        : Math.random().toString(16).slice(2);
    return `${deviceId}-${Date.now()}-${rand}`;
}
