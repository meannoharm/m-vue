import { reactive, isReactive, toRaw } from '../src/reactive';
describe('reactive', () => {
  test('Object', () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    // get
    expect(observed.foo).toBe(1);
    //     // has
    expect('foo' in observed).toBe(true);
    //     // ownKeys
    expect(Object.keys(observed)).toEqual(['foo']);
  });

  test('Map', () => {
    const original = new Map();
    original.set('foo', 1);
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(observed.get('foo')).toBe(1);
    expect(Array.from(observed.keys())).toEqual(['foo']);
  });

  test('Set', () => {
    const original = new Set();
    original.add(1);
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(Array.from(observed.values())).toEqual([1]);
  });

  test('nested reactives', () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });

  test('toRaw', () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(toRaw(observed)).toBe(original);
    expect(toRaw(original)).toBe(original);
  });
});
