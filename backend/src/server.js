require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { initSocketIO } = require('./config/socket');
const { startScheduler } = require('./services/schedulerService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // 1. Connect MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected');

    // 2. Create HTTP server
    const server = http.createServer(app);

    // 3. Init Socket.IO
    initSocketIO(server);
    logger.info('✅ Socket.IO initialised');

    // 4. Start background scheduler
    startScheduler();
    logger.info('✅ Background scheduler started');

    // 5. Listen
    server.listen(PORT, () => {
      logger.info(`🚀 SecureGate API running on http://localhost:${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received – shutting down gracefully');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
