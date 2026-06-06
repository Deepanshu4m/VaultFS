// app.js sets up everything — middleware, routes, etc. It’s imported by index.js, which starts the server.
import express from 'express';
import bucketRoutes from './routes/bucket.routes.js';
import fileRoutes from './routes/file.routes.js';
import nodeRoutes from './routes/node.routes.js'; 
import statsRoutes from './routes/stats.routes.js';

const app = express();

app.use(express.json());

app.use('/api/buckets', bucketRoutes);
app.use('/api/buckets', fileRoutes);
app.use('/api/nodes', nodeRoutes); 
app.use('/api/stats', statsRoutes); 

export default app;