// 15s: the first render in a suite can exceed jest's 5s default on a cold transform cache or a slow machine.
module.exports = { preset: "jest-expo", testTimeout: 15000 };
