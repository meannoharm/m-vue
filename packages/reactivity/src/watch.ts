import { isFunction, isObject } from "@m-vue/shared";
import { isReactive } from "./reactive";
import { ReactiveEffect } from "./effect";

// 递归
const traversal = (value, set = new Set()) => {
  if (isObject(value)) return value;
  if (set.has(value)) return value;
  set.add(value);
  for (let key in value) {
    traversal(value[key], set);
  }
  return value;
};

// source 用户传入的对象，cb对应的回调
export const watch = (source, cb) => {
  let getter;
  if (isReactive(source)) {
    getter = () => traversal(source);
  } else if (isFunction(source)) {
    getter = source;
  }
  let cleanup;
  const onCleanup = (fn) => {
    cleanup = fn;
  };
  let oldValue;
  const job = () => {
    // 下次watch触发，触发上次的cleanup
    if (cleanup) cleanup();
    const newValue = effect.run();
    cb(newValue, oldValue, onCleanup);
    oldValue = newValue;
  };
  // 监控构造的函数，变化后重新执行job
  const effect = new ReactiveEffect(getter, job);
  oldValue = effect.run();
};
