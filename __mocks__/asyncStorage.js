const store = new Map();
module.exports = {
  getItem: jest.fn((k) => Promise.resolve(store.has(k) ? store.get(k) : null)),
  setItem: jest.fn((k, v) => { store.set(k, v); return Promise.resolve(); }),
  removeItem: jest.fn((k) => { store.delete(k); return Promise.resolve(); }),
  __store: store,
};
