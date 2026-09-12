import { jest } from '@jest/globals';

// ---- Mocks for everything file.controller.js depends on ----
const mockQuery = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockQueueAdd = jest.fn();
const mockRandomBytes = jest.fn();

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: { query: mockQuery },
}));

jest.unstable_mockModule('@upstash/redis', () => ({
  Redis: {
    fromEnv: jest.fn().mockReturnValue({
      get: mockRedisGet,
      set: mockRedisSet,
    }),
  },
}));

jest.unstable_mockModule('../../src/queues/upload.queue.js', () => ({
  replicationQueue: { add: mockQueueAdd },
}));

jest.unstable_mockModule('crypto', () => ({
  default: { randomBytes: mockRandomBytes },
  randomBytes: mockRandomBytes,
}));

// Import AFTER mocks are registered, so the mocked versions get wired in
const { listFiles, generateSignedUrl } = await import('../../src/controllers/file.controller.js');

// ---- Shared helper for building fake req/res ----
const buildMockReqRes = ({ body = {}, params = {}, query = {} } = {}) => {
  const req = { body, params, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    send: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

// generateSignedUrl needs extra fields (protocol, get) that other functions don't
const buildSignedUrlReqRes = (params, body) => {
  const req = {
    params,
    body,
    protocol: 'https',
    get: jest.fn().mockReturnValue('vaultfs.example.com'),
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

describe('listFiles', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with the latest version of each file in the bucket', async () => {
    const { req, res } = buildMockReqRes({ params: { bucketId: '1' } });
    const fakeFiles = [{ id: 1, name: 'doc.pdf', version: 2 }];
    mockQuery.mockResolvedValue({ rows: fakeFiles });

    await listFiles(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeFiles);
  });

  it('returns 500 when the database throws', async () => {
    const { req, res } = buildMockReqRes({ params: { bucketId: '1' } });
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await listFiles(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('generateSignedUrl', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when the file does not exist', async () => {
    const { req, res } = buildSignedUrlReqRes({ fileId: '999' }, {});
    mockQuery.mockResolvedValue({ rows: [] });

    await generateSignedUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'File not found' });
  });

  it('returns a signed URL using the custom expiresIn value', async () => {
    const { req, res } = buildSignedUrlReqRes({ fileId: '1' }, { expiresIn: 600 });
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'doc.pdf' }] });
    mockRandomBytes.mockReturnValue(Buffer.from('abcd1234abcd1234', 'hex'));
    mockRedisSet.mockResolvedValue('OK');

    await generateSignedUrl(req, res);

    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('signed:'),
      '1',
      { ex: 600 }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ expiresIn: 600 })
    );
  });

  it('defaults expiresIn to 300 seconds when not provided', async () => {
    const { req, res } = buildSignedUrlReqRes({ fileId: '1' }, {});
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'doc.pdf' }] });
    mockRandomBytes.mockReturnValue(Buffer.from('abcd1234abcd1234', 'hex'));
    mockRedisSet.mockResolvedValue('OK');

    await generateSignedUrl(req, res);

    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('signed:'),
      '1',
      { ex: 300 }
    );
  });

  it('returns 500 when the database throws', async () => {
    const { req, res } = buildSignedUrlReqRes({ fileId: '1' }, {});
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await generateSignedUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});