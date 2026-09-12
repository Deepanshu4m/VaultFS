import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockIncr = jest.fn();
const mockExpire = jest.fn();
const mockTtl = jest.fn();

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: { query: mockQuery },
}));

jest.unstable_mockModule('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
    ttl: mockTtl,
  })),
}));

const { requireApiKey } = await import('../../src/middlewares/auth.middleware.js');

// Helper to build a fake Express req/res/next for each test
const buildMockReqRes = (headers = {}) => {
  const req = { headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('requireApiKey', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no API key header is present', async () => {
    const { req, res, next } = buildMockReqRes({});

    await requireApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'API key is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the API key is not found or inactive', async () => {
    const { req, res, next } = buildMockReqRes({ 'x-api-key': 'bad-key' });
    mockQuery.mockResolvedValue({ rows: [] });

    await requireApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or revoked API key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches req.apiKey when the key is valid and under rate limit', async () => {
    const { req, res, next } = buildMockReqRes({ 'x-api-key': 'good-key' });
    mockQuery.mockResolvedValue({ rows: [{ key: 'good-key', is_active: true }] });
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toEqual({ key: 'good-key', is_active: true });
    expect(res.status).not.toHaveBeenCalledWith(401);
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const { req, res, next } = buildMockReqRes({ 'x-api-key': 'good-key' });
    mockQuery.mockResolvedValue({ rows: [{ key: 'good-key', is_active: true }] });
    mockIncr.mockResolvedValue(101); // over the RATE_LIMIT of 100
    mockTtl.mockResolvedValue(30);

    await requireApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when the database throws an error', async () => {
    const { req, res, next } = buildMockReqRes({ 'x-api-key': 'good-key' });
    mockQuery.mockRejectedValue(new Error('connection refused'));

    await requireApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});