// Native Web Push encryption implementation for Cloudflare Workers (Edge runtime)
// Resolves "Illegal invocation" errors by avoiding third-party libraries that destructure SubtleCrypto methods.
// All Web Crypto calls are invoked directly on the native namespace (globalThis.crypto / globalThis.crypto.subtle).

export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
}

export interface PushSubscription {
    endpoint: string;
    keys: PushSubscriptionKeys;
}

export interface PushMessagePayload {
    title: string;
    body: string;
    url: string;
}

export interface PushMessage {
    payload: PushMessagePayload;
    options?: {
        ttl?: number;
        urgency?: 'very-low' | 'low' | 'normal' | 'high';
        topic?: string;
    };
    adminContact: string;
}

export interface VapidKey {
    alg: string;
    key_ops: string[];
    ext: boolean;
    kty: string;
    x: string;
    y: string;
    crv: string;
    d: string;
}

const stringFromArrayBuffer = (s: ArrayBuffer | Uint8Array): string => {
    let result = '';
    const bytes = new Uint8Array(s as any);
    for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
    }
    return result;
};

const base64UrlEncode = (input: string | ArrayBuffer | Uint8Array): string => {
    const text = typeof input === 'string' ? input : stringFromArrayBuffer(input);
    let base64: string;
    if (typeof globalThis !== 'undefined' && 'btoa' in globalThis) {
        base64 = globalThis.btoa(text);
    } else {
        base64 = Buffer.from(text, 'binary').toString('base64');
    }
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64UrlDecodeString = (s: string): string => {
    if (!s) throw new Error('Invalid input');
    return s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
};

const base64Decode = (base64String: string): string => {
    const paddedBase64 = base64String.padEnd(base64String.length + ((4 - (base64String.length % 4 || 4)) % 4), '=');
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(paddedBase64, 'base64').toString('binary');
    }
    if (typeof atob === 'function') {
        return atob(paddedBase64);
    }
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    let i = 0;
    while (i < paddedBase64.length) {
        const enc1 = characters.indexOf(paddedBase64.charAt(i++));
        const enc2 = characters.indexOf(paddedBase64.charAt(i++));
        const enc3 = characters.indexOf(paddedBase64.charAt(i++));
        const enc4 = characters.indexOf(paddedBase64.charAt(i++));
        const char1 = (enc1 << 2) | (enc2 >> 4);
        const char2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const char3 = ((enc3 & 3) << 6) | enc4;
        result += String.fromCharCode(char1);
        if (enc3 !== 64) result += String.fromCharCode(char2);
        if (enc4 !== 64) result += String.fromCharCode(char3);
    }
    return result;
};

const base64UrlDecode = (input: string): ArrayBuffer => {
    const base64 = base64UrlDecodeString(input);
    if (typeof globalThis !== 'undefined' && 'atob' in globalThis) {
        const binaryString = globalThis.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf).buffer;
};

const concatTypedArrays = (arrays: Uint8Array[]): Uint8Array => {
    const length = arrays.reduce((acc, curr) => acc + curr.byteLength, 0);
    let index = 0;
    const targetArray = new Uint8Array(length);
    for (const array of arrays) {
        targetArray.set(array, index);
        index += array.byteLength;
    }
    return targetArray;
};

const importClientKeys = async (keys: PushSubscriptionKeys) => {
    const auth = base64UrlDecode(keys.auth);
    if (auth.byteLength !== 16) {
        throw new Error(`Incorrect auth length, expected 16 bytes but got ${auth.byteLength}`);
    }
    let decodedKey: Uint8Array;
    const base64Key = base64UrlDecodeString(keys.p256dh);
    if (typeof globalThis !== 'undefined' && 'atob' in globalThis) {
        const binaryStr = globalThis.atob(base64Key);
        decodedKey = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            decodedKey[i] = binaryStr.charCodeAt(i);
        }
    } else {
        const buf = Buffer.from(base64Key, 'base64');
        decodedKey = new Uint8Array(buf);
    }

    if (decodedKey.byteLength !== 65) {
        throw new Error(`Invalid p256dh key: expected 65 bytes but got ${decodedKey.byteLength} bytes`);
    }
    if (decodedKey[0] !== 0x04) {
        throw new Error(`Invalid p256dh key: expected uncompressed point format (0x04 prefix) but got 0x${decodedKey[0].toString(16).padStart(2, '0')}`);
    }

    const p256 = await globalThis.crypto.subtle.importKey(
        'jwk',
        {
            kty: 'EC',
            crv: 'P-256',
            x: base64UrlEncode(decodedKey.slice(1, 33)),
            y: base64UrlEncode(decodedKey.slice(33, 65)),
            ext: true,
        },
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
    );
    return { auth, p256 };
};

const deriveSharedSecret = async (clientPublicKey: CryptoKey, localPrivateKey: CryptoKey): Promise<CryptoKey> => {
    const sharedSecretBytes = await globalThis.crypto.subtle.deriveBits(
        { name: 'ECDH', public: clientPublicKey },
        localPrivateKey,
        256
    );
    return globalThis.crypto.subtle.importKey(
        'raw',
        sharedSecretBytes,
        { name: 'HKDF' },
        false,
        ['deriveBits', 'deriveKey']
    );
};

const derivePseudoRandomKey = async (auth: ArrayBuffer, sharedSecret: CryptoKey): Promise<CryptoKey> => {
    const pseudoRandomKeyBytes = await globalThis.crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: auth,
            info: new TextEncoder().encode('Content-Encoding: auth\0'),
        } as any,
        sharedSecret,
        256
    );
    return globalThis.crypto.subtle.importKey(
        'raw',
        pseudoRandomKeyBytes,
        'HKDF',
        false,
        ['deriveBits']
    );
};

const createContext = async (clientPublicKey: CryptoKey, localPublicKey: CryptoKey): Promise<Uint8Array> => {
    const [clientKeyBytes, localKeyBytes] = await Promise.all([
        globalThis.crypto.subtle.exportKey('raw', clientPublicKey),
        globalThis.crypto.subtle.exportKey('raw', localPublicKey),
    ]);
    return concatTypedArrays([
        new TextEncoder().encode('P-256\0'),
        new Uint8Array([0, clientKeyBytes.byteLength]),
        new Uint8Array(clientKeyBytes),
        new Uint8Array([0, localKeyBytes.byteLength]),
        new Uint8Array(localKeyBytes),
    ]);
};

const deriveNonce = async (pseudoRandomKey: CryptoKey, salt: any, context: Uint8Array): Promise<ArrayBuffer> => {
    const nonceInfo = concatTypedArrays([
        new TextEncoder().encode('Content-Encoding: nonce\0'),
        context,
    ]);
    return globalThis.crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo } as any,
        pseudoRandomKey,
        12 * 8
    );
};

const deriveContentEncryptionKey = async (pseudoRandomKey: CryptoKey, salt: any, context: Uint8Array): Promise<CryptoKey> => {
    const info = concatTypedArrays([
        new TextEncoder().encode('Content-Encoding: aesgcm\0'),
        context,
    ]);
    const bits = await globalThis.crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info } as any,
        pseudoRandomKey,
        16 * 8
    );
    return globalThis.crypto.subtle.importKey(
        'raw',
        bits,
        'AES-GCM',
        false,
        ['encrypt']
    );
};

const MAX_PAYLOAD_SIZE = 4078;
const PADDING_LENGTH_PREFIX_SIZE = 2;

const padPayload = (payload: Uint8Array): Uint8Array => {
    const maxPayloadContentSize = MAX_PAYLOAD_SIZE - PADDING_LENGTH_PREFIX_SIZE;
    if (payload.byteLength > maxPayloadContentSize) {
        throw new Error(`Payload too large. Maximum size is ${maxPayloadContentSize} bytes, but received ${payload.byteLength} bytes`);
    }
    const availableSpace = MAX_PAYLOAD_SIZE - PADDING_LENGTH_PREFIX_SIZE - payload.byteLength;
    const maxRandomPadding = Math.min(100, availableSpace);
    const paddingSize = maxRandomPadding > 0 ? Math.floor(Math.random() * (maxRandomPadding + 1)) : 0;
    const paddingArray = new ArrayBuffer(PADDING_LENGTH_PREFIX_SIZE + paddingSize);
    new DataView(paddingArray).setUint16(0, paddingSize);
    return concatTypedArrays([new Uint8Array(paddingArray), payload]);
};

export const encryptPayload = async (
    localKeys: CryptoKeyPair,
    salt: any,
    payload: string,
    target: PushSubscription
): Promise<ArrayBuffer> => {
    const clientKeys = await importClientKeys(target.keys);
    const sharedSecret = await deriveSharedSecret(clientKeys.p256, localKeys.privateKey);
    const pseudoRandomKey = await derivePseudoRandomKey(clientKeys.auth, sharedSecret);
    const context = await createContext(clientKeys.p256, localKeys.publicKey);
    const nonce = await deriveNonce(pseudoRandomKey, salt, context);
    const contentEncryptionKey = await deriveContentEncryptionKey(pseudoRandomKey, salt, context);
    const encodedPayload = new TextEncoder().encode(payload);
    const paddedPayload = padPayload(encodedPayload);
    return globalThis.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        contentEncryptionKey,
        paddedPayload as any
    );
};

export const createJwt = async (jwk: VapidKey, jwtData: any): Promise<string> => {
    const jwtInfo = {
        typ: 'JWT',
        alg: 'ES256',
    };
    const base64JwtInfo = base64UrlEncode(JSON.stringify(jwtInfo));
    const base64JwtData = base64UrlEncode(JSON.stringify(jwtData));
    const unsignedToken = `${base64JwtInfo}.${base64JwtData}`;

    const privateKey = await globalThis.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
    );

    const signature = await globalThis.crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        privateKey,
        new TextEncoder().encode(unsignedToken)
    );

    return `${base64JwtInfo}.${base64JwtData}.${base64UrlEncode(signature)}`;
};

export const vapidHeaders = async (
    options: { jwk: VapidKey; jwt: any; ttl?: number; topic?: string; urgency?: string },
    payloadLength: number,
    salt: any,
    localPublicKey: CryptoKey
): Promise<Record<string, string>> => {
    const localPublicKeyBase64 = await globalThis.crypto.subtle.exportKey('raw', localPublicKey)
        .then((bytes) => base64UrlEncode(bytes));
    
    const serverPublicKey = base64UrlEncode(`\x04${base64Decode(base64UrlDecodeString(options.jwk.x))}${base64Decode(base64UrlDecodeString(options.jwk.y))}`);
    const jwt = await createJwt(options.jwk, options.jwt);

    const headerValues: Record<string, string> = {
        Encryption: `salt=${base64UrlEncode(salt)}`,
        'Crypto-Key': `dh=${localPublicKeyBase64}`,
        'Content-Length': payloadLength.toString(),
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        Authorization: `vapid t=${jwt}, k=${serverPublicKey}`,
    };

    if (options.ttl !== undefined) headerValues.TTL = options.ttl.toString();
    if (options.topic !== undefined) headerValues.Topic = options.topic;
    if (options.urgency !== undefined) headerValues.Urgency = options.urgency;

    return headerValues;
};

export async function buildPushHTTPRequest(options: {
    privateJWK: VapidKey | string;
    message: PushMessage;
    subscription: PushSubscription;
}) {
    let jwk: VapidKey;
    try {
        jwk = typeof options.privateJWK === 'string' ? JSON.parse(options.privateJWK) : options.privateJWK;
    } catch {
        throw new Error('Invalid privateJWK: failed to parse JSON string');
    }

    if (jwk.kty !== 'EC') throw new Error("Invalid JWK: 'kty' must be 'EC'");
    if (jwk.crv !== 'P-256') throw new Error("Invalid JWK: 'crv' must be 'P-256'");
    if (!jwk.x) throw new Error("Invalid JWK: missing 'x'");
    if (!jwk.y) throw new Error("Invalid JWK: missing 'y'");
    if (!jwk.d) throw new Error("Invalid JWK: missing 'd'");

    const endpoint = options.subscription.endpoint;
    try {
        new URL(endpoint);
    } catch {
        throw new Error(`Invalid subscription endpoint: '${endpoint}' is not a valid URL`);
    }

    const maxTtl = 24 * 60 * 60;
    const ttl = options.message.options?.ttl && options.message.options.ttl > 0 ? options.message.options.ttl : maxTtl;

    const jwt = {
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + ttl,
        sub: options.message.adminContact,
    };

    const buildOptions = {
        jwk,
        jwt,
        payload: JSON.stringify(options.message.payload),
        ttl,
        urgency: options.message.options?.urgency,
        topic: options.message.options?.topic,
    };

    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const localKeys = await globalThis.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );

    const body = await encryptPayload(localKeys, salt, buildOptions.payload, options.subscription);
    const headers = await vapidHeaders(buildOptions, body.byteLength, salt, localKeys.publicKey);

    return { endpoint, body, headers };
}
