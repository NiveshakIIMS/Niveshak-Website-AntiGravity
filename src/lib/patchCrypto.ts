// Global monkey-patch for SubtleCrypto and Crypto prototypes.
// This is required on Cloudflare Workers / Edge Runtime because bundlers or third-party libraries
// may destructure or reassign Web Crypto methods, causing them to lose their 'this' context
// and throw "TypeError: Illegal invocation: function called with incorrect 'this' reference".
// Overriding the prototypes guarantees that methods always execute with the correct native context.

export function patchCrypto() {
    if (typeof globalThis === "undefined") return;

    // 1. Patch SubtleCrypto Prototype Methods
    if (globalThis.SubtleCrypto && globalThis.SubtleCrypto.prototype) {
        const proto = globalThis.SubtleCrypto.prototype;
        const methods = [
            "encrypt", "decrypt", "sign", "verify", "digest",
            "generateKey", "deriveKey", "deriveBits", "importKey", "exportKey", "wrapKey", "unwrapKey"
        ];

        methods.forEach((method) => {
            try {
                const original = (proto as any)[method];
                if (typeof original === "function" && !original.__bound) {
                    const wrapper = function(this: any, ...args: any[]) {
                        // Ensure we always use the native crypto.subtle as the 'this' context
                        const context = (this instanceof globalThis.SubtleCrypto) ? this : globalThis.crypto.subtle;
                        return original.apply(context, args);
                    };
                    wrapper.__bound = true;
                    Object.defineProperty(proto, method, {
                        value: wrapper,
                        writable: true,
                        configurable: true
                    });
                }
            } catch (err) {
                console.error(`Failed to patch SubtleCrypto.prototype.${method}:`, err);
            }
        });
        console.log("Successfully patched SubtleCrypto.prototype methods");
    }

    // 2. Patch Crypto Prototype getRandomValues
    if (globalThis.Crypto && globalThis.Crypto.prototype) {
        const proto = globalThis.Crypto.prototype;
        try {
            const original = proto.getRandomValues as any;
            if (typeof original === "function" && !original.__bound) {
                const wrapper = function(this: any, ...args: any[]) {
                    const context = (this instanceof globalThis.Crypto) ? this : globalThis.crypto;
                    return original.apply(context, args);
                };
                wrapper.__bound = true;
                Object.defineProperty(proto, "getRandomValues", {
                    value: wrapper,
                    writable: true,
                    configurable: true
                });
            }
            console.log("Successfully patched Crypto.prototype.getRandomValues");
        } catch (err) {
            console.error("Failed to patch Crypto.prototype.getRandomValues:", err);
        }
    }
}
