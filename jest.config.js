/** @type {import('jest').Config} */
module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  moduleNameMapper: {
    "@m-vue\\/([\\w-]*)": "<rootDir>/packages/\$1/src"
  }
};