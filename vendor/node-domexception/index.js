// Credi requires Node.js 24+, which provides the native DOMException globally.
// fetch-blob@3.x still imports node-domexception for older Node compatibility.
// Keep that import contract without installing the deprecated polyfill package.
const NativeDOMException = globalThis.DOMException;

if (typeof NativeDOMException !== "function") {
  throw new Error(
    "Credi requires the native DOMException available in Node.js 17 and newer.",
  );
}

export default NativeDOMException;
