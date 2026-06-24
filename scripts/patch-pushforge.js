const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/@pushforge/builder/dist/lib/crypto.js');

if (fs.existsSync(targetPath)) {
  const content = `// Patched to prevent "Illegal invocation: function called with incorrect 'this' reference" on Cloudflare/Edge runtimes.
if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API not available. Ensure you are using Node.js 20+ or a modern runtime with globalThis.crypto support.');
}
const isomorphicCrypto = globalThis.crypto;

const subtleProxy = new Proxy(isomorphicCrypto.subtle, {
    get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === "function") {
            return val.bind(target);
        }
        return val;
    }
});

export const crypto = {
    getRandomValues(array) {
        return isomorphicCrypto.getRandomValues.bind(isomorphicCrypto)(array);
    },
    subtle: subtleProxy,
};
`;
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Successfully patched @pushforge/builder/dist/lib/crypto.js');
} else {
  console.warn('Could not find @pushforge/builder/dist/lib/crypto.js to patch');
}
