import createModule from 'bentopdf-pdfium';
import wasmUrl from 'bentopdf-pdfium/editcore.wasm?url';

let ENGINE_VERSION = 'dev';
try {
  ENGINE_VERSION = __ENGINE_VERSION__;
} catch {
  ENGINE_VERSION = 'dev';
}

export const ENGINE_BUILD = `bentopdf-pdfium@${ENGINE_VERSION}`;

export function createEngineModule(options) {
  return createModule({
    locateFile(path) {
      if (path.endsWith('.wasm')) return wasmUrl;
      return path;
    },
    ...options,
  });
}
