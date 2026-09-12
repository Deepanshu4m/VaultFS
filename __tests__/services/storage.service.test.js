import { chunkBuffer, hashChunk } from '../../src/services/storage.service.js';

describe('chunkBuffer', () => {
  it('splits a buffer into chunks of the given size', () => {
    const buffer = Buffer.from('1234567890'); // arrange: creates a fake input data

    const chunks = chunkBuffer(buffer, 3); // calls the function to be tested with the input data and a chunk size of 3

    expect(chunks).toHaveLength(4); // check the result
    expect(chunks[0].toString()).toBe('123');
    expect(chunks[3].toString()).toBe('0');
  });

  it('returns a single chunk when buffer is smaller than chunk size', () => {
    const buffer = Buffer.from('hi');

    const chunks = chunkBuffer(buffer, 1024 * 1024);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].toString()).toBe('hi');
  });

  it('returns an empty array for an empty buffer', () => {
    const buffer = Buffer.from('');

    const chunks = chunkBuffer(buffer, 1024);

    expect(chunks).toHaveLength(0);
  });
});

describe('hashChunk', () => {
  it('returns the same hash for identical content', () => {
    const bufferA = Buffer.from('hello world');
    const bufferB = Buffer.from('hello world');

    expect(hashChunk(bufferA)).toBe(hashChunk(bufferB));
  });

  it('returns different hashes for different content', () => {
    const bufferA = Buffer.from('hello');
    const bufferB = Buffer.from('world');

    expect(hashChunk(bufferA)).not.toBe(hashChunk(bufferB));
  });
}); 