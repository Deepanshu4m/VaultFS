import { jest } from '@jest/globals';
import path from 'path';
const mockQuery = jest.fn();
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: { query: mockQuery },
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    promises: {
      writeFile: mockWriteFile,
      readFile: mockReadFile,
    },
  },
  promises: {
    writeFile: mockWriteFile,
    readFile: mockReadFile,
  },
}));

const { getActiveNodes, saveChunk, readChunk } = await import('../../src/services/storage.service.js');

describe('getActiveNodes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the rows from the query result', async () => {
    const fakeRows = [
      { id: 1, name: 'node-1', is_active: true },
      { id: 2, name: 'node-2', is_active: true },
    ];
    mockQuery.mockResolvedValue({ rows: fakeRows });

    const result = await getActiveNodes();

    expect(result).toEqual(fakeRows);
  });

  it('queries only active nodes', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await getActiveNodes();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE')
    );
  });
});

describe('saveChunk', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

it('writes the buffer to the correct joined path', async () => {
    mockWriteFile.mockResolvedValue(undefined);
    const buffer = Buffer.from('chunk-data');
    const expectedPath = path.join('/data/node-1', 'chunk-abc123');

    const result = await saveChunk('/data/node-1', 'chunk-abc123', buffer);

    expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, buffer);
    expect(result).toBe(expectedPath);
  });

  it('propagates an error if the write fails', async () => {
    mockWriteFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

    await expect(saveChunk('/data/node-1', 'chunk-x', Buffer.from('x')))
      .rejects.toThrow('ENOSPC');
  });
});

describe('readChunk', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the buffer read from the given file path', async () => {
    const fakeBuffer = Buffer.from('stored-chunk-content');
    mockReadFile.mockResolvedValue(fakeBuffer);

    const result = await readChunk('/data/node-1/chunk-abc123');

    expect(result).toEqual(fakeBuffer);
  });

  it('propagates an error if the file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    await expect(readChunk('/data/missing/chunk-x')).rejects.toThrow('ENOENT');
  });
});