// Unit tests for the pure reducer in src/state/harmoniaReducer.ts run on Node:
// no React renderer, no emulator. `npm test` needs the devDependencies declared
// in package.json (jest, babel-jest, @babel/preset-*), which the EAS cloud
// install picks up automatically.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorage.js',
  },
  modulePathIgnorePatterns: ['<rootDir>/.expo/', '<rootDir>/dist/'],
};
