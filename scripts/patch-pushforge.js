const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/@pushforge/builder/dist/lib/crypto.js');

if (fs.existsSync(targetPath)) {
  const content = `// Patched to prevent "Illegal invocation: function called with incorrect 'this' reference" on Cloudflare/Edge runtimes.
if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API not available. Ensure you are using Node.js 20+ or a modern runtime with globalThis.crypto support.');
}
const isomorphicCrypto = globalThis.crypto;
const nativeSubtle = isomorphicCrypto.subtle;

const subtle = {
    encrypt: nativeSubtle.encrypt.bind(nativeSubtle),
    decrypt: nativeSubtle.decrypt.bind(nativeSubtle),
    sign: nativeSubtle.sign.bind(nativeSubtle),
    verify: nativeSubtle.verify.bind(nativeSubtle),
    digest: nativeSubtle.digest.bind(nativeSubtle),
    generateKey: nativeSubtle.generateKey.bind(nativeSubtle),
    deriveKey: nativeSubtle.deriveKey.bind(nativeSubtle),
    deriveBits: nativeSubtle.deriveBits.bind(nativeSubtle),
    importKey: nativeSubtle.importKey.bind(nativeSubtle),
    exportKey: nativeSubtle.exportKey.bind(nativeSubtle),
    wrapKey: nativeSubtle.wrapKey.bind(nativeSubtle),
    unwrapKey: nativeSubtle.unwrapKey.bind(nativeSubtle),
};

export const crypto = {
    getRandomValues(array) {
        return isomorphicCrypto.getRandomValues.bind(isomorphicCrypto)(array);
    },
    subtle,
};
`;
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Successfully patched @pushforge/builder/dist/lib/crypto.js with plain pre-bound subtle object');
} else {
  console.warn('Could not find @pushforge/builder/dist/lib/crypto.js to patch');
}
