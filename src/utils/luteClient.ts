import LuteConnect from "lute-connect";

// Maintain a single shared LuteConnect instance, but allow forcing
// a fresh instance when the extension port becomes disconnected
// (e.g., after HMR). Avoid creating multiples unless explicitly requested.
let _lute: LuteConnect | null = null;
export function getLute(fresh = false): LuteConnect {
  if (fresh || !_lute) {
    _lute = new LuteConnect(document?.title || "ProofChain");
  }
  return _lute;
}

// Export the factory by default (not a pre-created instance) so callers
// can request a fresh instance when needed.
export default getLute;
