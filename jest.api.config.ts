import type { Config } from 'jest'

// API integration tests: run serially against the dockerized test DB
const config: Config = {
  clearMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      {
        presets: ['@babel/preset-env', '@babel/preset-typescript'],
      },
    ],
  },
  testMatch: ['<rootDir>/__tests__/api/**/*.test.ts'],
  globalSetup: '<rootDir>/__tests__/api/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/api/global-teardown.ts',
  setupFiles: ['<rootDir>/__tests__/api/setup-env.ts'],
  maxWorkers: 1,
  testTimeout: 60_000,
}

export default config
