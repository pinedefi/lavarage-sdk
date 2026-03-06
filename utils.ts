import { Program } from "@coral-xyz/anchor";
import LavarageSOLIdl from "./idl/lavarageSOL.json";

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        // exponentially increase delay
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

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

export function u8ArrayToString(input: number[]): string {
  // validate that input has no more than 32 bytes
  if (input.length > 32) {
    throw new Error('Input has more than 32 bytes');
  }
  
  return '0x' + Buffer.from(input).toString('hex');
}

export function isSolProgram(program: Program<any>): boolean {
  return program.programId.toBase58() === LavarageSOLIdl.address;
}