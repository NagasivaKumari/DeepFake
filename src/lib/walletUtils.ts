export function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
}

export function normalizeSignedTxn(signed: any): string {
  // Returns base64 string representation of the signed txn
  if (!signed) throw new Error('No signed txn returned');
  // If already a base64 string
  if (typeof signed === 'string') return signed;
  // If Uint8Array
  if (signed instanceof Uint8Array) return toBase64(signed);
  // Some wallets return ArrayBuffer
  if (signed instanceof ArrayBuffer) return toBase64(new Uint8Array(signed));
  // Some wallets return an array of bytes
  if (Array.isArray(signed)) return toBase64(new Uint8Array(signed as number[]));
  // If object with blob or bytes
  if (signed?.blob && signed.blob instanceof Blob) {
    // Can't synchronously convert blob here; upstream should handle
    throw new Error('Received Blob signed txn - not supported synchronously');
  }
  // Last resort: try JSON -> base64
  try {
    return btoa(JSON.stringify(signed));
  } catch (e) {
    throw new Error('Unable to normalize signed txn');
  }
}

export default { normalizeSignedTxn };
