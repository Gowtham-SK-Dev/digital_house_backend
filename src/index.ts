import { startServer } from './app';

startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
