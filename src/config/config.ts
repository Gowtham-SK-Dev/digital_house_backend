import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DB || 'digital_house',
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_house',
    },
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'digital_house',
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRY || '7d',
  },

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // OneSignal
  oneSignal: {
    appId: process.env.ONESIGNAL_APP_ID,
    restApiKey: process.env.ONESIGNAL_REST_API_KEY,
  },

  // Analytics
  analytics: {
    googleId: process.env.GOOGLE_ANALYTICS_ID,
    metaPixelId: process.env.META_PIXEL_ID,
  },

  // Socket.io
  socketIO: {
    corsOrigin: (process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:3000').split(','),
  },
};
