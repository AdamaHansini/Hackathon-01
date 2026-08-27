const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a password or answer string
 */
const hashPassword = async (plainText) => {
  if (!plainText) throw new Error('Cannot hash empty string');
  return bcrypt.hash(plainText, SALT_ROUNDS);
};

/**
 * Compare a plain text value against a stored hash
 */
const comparePassword = async (plainText, hash) => {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
};

/**
 * Normalize a verification answer for consistent hashing:
 * - trim whitespace
 * - lowercase
 * - collapse multiple spaces
 */
const normalizeAnswer = (answer) => {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Hash a verification answer (normalized before hashing)
 */
const hashAnswer = async (answer) => {
  const normalized = normalizeAnswer(answer);
  return bcrypt.hash(normalized, SALT_ROUNDS);
};

/**
 * Compare a submitted verification answer against its stored hash
 */
const compareAnswer = async (submittedAnswer, storedHash) => {
  if (!submittedAnswer || !storedHash) return false;
  const normalized = normalizeAnswer(submittedAnswer);
  return bcrypt.compare(normalized, storedHash);
};

module.exports = {
  hashPassword,
  comparePassword,
  normalizeAnswer,
  hashAnswer,
  compareAnswer,
};
