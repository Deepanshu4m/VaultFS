import { jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: { query: mockQuery },
}));

const { createBucket, getBuckets, deleteBucket } = await import('../../src/controllers/bucket.controller.js');

const buildMockReqRes = ({ body = {}, params = {} } = {}) => {
  const req = { body, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

describe('createBucket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const { req, res } = buildMockReqRes({ body: {} });

    await createBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bucket name is required' });
  });

  it('returns 201 with the created bucket on success', async () => {
    const { req, res } = buildMockReqRes({ body: { name: 'my-bucket' } });
    const fakeBucket = { id: 1, name: 'my-bucket' };
    mockQuery.mockResolvedValue({ rows: [fakeBucket] });

    await createBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeBucket);
  });

  it('returns 400 when bucket name already exists (Postgres unique violation)', async () => {
    const { req, res } = buildMockReqRes({ body: { name: 'dup-bucket' } });
    const duplicateError = new Error('duplicate key');
    duplicateError.code = '23505';
    mockQuery.mockRejectedValue(duplicateError);

    await createBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bucket name already exists' });
  });

  it('returns 500 on an unexpected database error', async () => {
    const { req, res } = buildMockReqRes({ body: { name: 'my-bucket' } });
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await createBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getBuckets', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with the list of buckets', async () => {
    const { req, res } = buildMockReqRes();
    const fakeBuckets = [{ id: 1, name: 'bucket-a' }, { id: 2, name: 'bucket-b' }];
    mockQuery.mockResolvedValue({ rows: fakeBuckets });

    await getBuckets(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeBuckets);
  });

  it('returns 500 when the database throws', async () => {
    const { req, res } = buildMockReqRes();
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await getBuckets(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deleteBucket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when the bucket is deleted successfully', async () => {
    const { req, res } = buildMockReqRes({ params: { id: '1' } });
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'my-bucket' }] });

    await deleteBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bucket deleted' });
  });

  it('returns 404 when the bucket does not exist', async () => {
    const { req, res } = buildMockReqRes({ params: { id: '999' } });
    mockQuery.mockResolvedValue({ rows: [] });

    await deleteBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bucket not found' });
  });

  it('returns 500 when the database throws', async () => {
    const { req, res } = buildMockReqRes({ params: { id: '1' } });
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await deleteBucket(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});