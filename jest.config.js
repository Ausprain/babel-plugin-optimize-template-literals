/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  cacheDirectory: 'test/.tmp',
  testMatch: [
    '**/test/**/*'
  ],
  transform: {}
};