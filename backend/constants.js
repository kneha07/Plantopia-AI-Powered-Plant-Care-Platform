const WATER_FREQUENCY_DAYS = {
  low: 14,
  moderate: 7,
  frequent: 3,
};

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'expert'];

const CACHE_KEYS = {
  ALL_PLANTS: 'plants:all',
};

const CACHE_TTL = {
  PLANTS: 3600,
};

module.exports = {
  WATER_FREQUENCY_DAYS,
  DIFFICULTY_LEVELS,
  EXPERIENCE_LEVELS,
  CACHE_KEYS,
  CACHE_TTL,
};
