export function stringToU8Array(input: string): number[] {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(input);
  
  if (encoded.length > 32) {
    throw new Error(`String too long: ${encoded.length} bytes (max 32)`);
  }
  
  // Create array of 32 zeros and fill with encoded bytes
  const result = new Array(32).fill(0);
  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i];
  }
  
  return result;
}