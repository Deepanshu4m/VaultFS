// This is the entry point
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { startHealthCheck } from './src/services/healthcheck.service.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`VaultFS server running on port ${PORT}`);
  startHealthCheck();
});