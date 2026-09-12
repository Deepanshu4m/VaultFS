import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockExistsSync = jest.fn();

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: { query: mockQuery },
}));

jest.unstable_mockModule('fs', () => ({
  default: { existsSync: mockExistsSync },
  existsSync: mockExistsSync,
}));

const { registerNode, listNodes, deactivateNode } = await import('../../src/controllers/node.controller.js');

const buildMockReqRes = ({ body = {}, params = {} } = {}) => {
  const req = { body, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

describe('registerNode', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when path is missing', async () => {
    const { req, res } = buildMockReqRes({ body: {} });

    await registerNode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Node path is required' });
  });

  it('returns 400 when the path does not exist on disk', async () => {
    const { req, res } = buildMockReqRes({ body: { path: '/fake/missing' } });
    mockExistsSync.mockReturnValue(false);

    await registerNode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Path does not exist on disk: /fake/missing' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 201 with the created node on success', async () => {
    const { req, res } = buildMockReqRes({ body: { path: '/data/node-1' } });
    mockExistsSync.mockReturnValue(true);
    const fakeNode = { id: 1, path: '/data/node-1' };
    mockQuery.mockResolvedValue({ rows: [fakeNode] });

    await registerNode(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeNode);
  });

  it('returns 400 when node path already exists (Postgres unique violation)', async () => {
    const { req, res } = buildMockReqRes({ body: { path: '/data/node-1' } });
    mockExistsSync.mockReturnValue(true);
    const duplicateError = new Error('duplicate key');
    duplicateError.code = '23505';
    mockQuery.mockRejectedValue(duplicateError);

    await registerNode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Node with this path already exists' });
  });

  it('returns 500 on an unexpected database error', async () => {
    const { req, res } = buildMockReqRes({ body: { path: '/data/node-1' } });
    mockExistsSync.mockReturnValue(true);
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await registerNode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('listNodes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with the list of nodes', async () => {
    const { req, res } = buildMockReqRes();
    const fakeNodes = [{ id: 1, path: '/data/node-1' }, { id: 2, path: '/data/node-2' }];
    mockQuery.mockResolvedValue({ rows: fakeNodes });

    await listNodes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeNodes);
  });

  it('returns 500 when the database throws', async () => {
    const { req, res } = buildMockReqRes();
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await listNodes(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deactivateNode', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when the node is deactivated successfully', async () => {
    const { req, res } = buildMockReqRes({ params: { id: '1' } });
    const fakeNode = { id: 1, path: '/data/node-1', is_active: false };
    mockQuery.mockResolvedValue({ rows: [fakeNode] });

    await deactivateNode(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Node deactivated', node: fakeNode });
  });

  it('returns 404 when the node does not exist', async () => {
    const { req, res } = buildMockReqRes({ params: { id: '999' } });
    mockQuery.mockResolvedValue({ rows: [] });

    await deactivateNode(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Node not found' });
  });

  it('returns 500 when the database throws', async () => {
    const { req, res } = buildMockReqRes({ params: { id: '1' } });
    mockQuery.mockRejectedValue(new Error('connection lost'));

    await deactivateNode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});