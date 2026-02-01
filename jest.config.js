module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'electron/**/*.js',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/App.tsx'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  // Exclude better-sqlite3 from Jest's module resolution
  modulePathIgnorePatterns: ['<rootDir>/node_modules/better-sqlite3'],
  // Mock better-sqlite3 for tests
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'better-sqlite3': '<rootDir>/tests/__mocks__/better-sqlite3.js'
  }
};
