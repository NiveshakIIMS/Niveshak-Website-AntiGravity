// Monkey-patch to bind crypto.subtle methods to itself.
// This is required on Cloudflare Workers / Edge Runtime because destructuring SubtleCrypto methods
// (which is done inside third-party libraries like @pushforge/builder) loses their 'this' binding
// and throws "TypeError: Illegal invocation: function called with incorrect 'this' reference".
if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    const subtle = globalThis.crypto.subtle;
    const methods: (keyof SubtleCrypto)[] = [
        "importKey",
        "sign",
        "verify",
        "encrypt",
        "decrypt",
        "digest",
        "generateKey",
        "deriveKey",
        "deriveBits",
        "exportKey",
        "wrapKey",
        "unwrapKey"
    ];
    methods.forEach((method) => {
        const original = subtle[method];
        if (typeof original === "function" && !(original as any).__bound) {
            const bound = original.bind(subtle);
            (bound as any).__bound = true;
            (subtle as any)[method] = bound;
        }
    });
}
