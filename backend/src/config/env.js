const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_RESET_SECRET',
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  // Warn about optional but important vars
  const optional = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];
  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(
      '⚠️  Optional env vars not set (some features may be disabled):',
      missingOptional.join(', ')
    );
  }
};

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  JWT_RESET_SECRET: process.env.JWT_RESET_SECRET,
  JWT_RESET_EXPIRES_IN: process.env.JWT_RESET_EXPIRES_IN || '1h',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@lostlink.app',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'LostLink',

  POST_DEFAULT_EXPIRY_DAYS: parseInt(process.env.POST_DEFAULT_EXPIRY_DAYS, 10) || 30,
  POST_EXPIRY_WARN_DAYS: parseInt(process.env.POST_EXPIRY_WARN_DAYS, 10) || 3,

  MATCH_HIGH_CONFIDENCE_THRESHOLD:
    parseInt(process.env.MATCH_HIGH_CONFIDENCE_THRESHOLD, 10) || 90,
  MATCH_MEDIUM_CONFIDENCE_THRESHOLD:
    parseInt(process.env.MATCH_MEDIUM_CONFIDENCE_THRESHOLD, 10) || 70,

  VERIFICATION_MIN_CORRECT: parseInt(process.env.VERIFICATION_MIN_CORRECT, 10) || 2,
  VERIFICATION_MAX_ATTEMPTS: parseInt(process.env.VERIFICATION_MAX_ATTEMPTS, 10) || 3,

  INITIAL_TRUST_SCORE: parseInt(process.env.INITIAL_TRUST_SCORE, 10) || 50,
};

module.exports = { env, validateEnv };
