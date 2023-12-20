import { reactive } from "./reactive";
import { isArray, isObject } from "@m-vue/shared";
import { trackEffects, triggerEffect } from "./effect";

function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}

class RefImpl {
  public dep = new Set();
  public _value;
  public __v_isRef = true;
  constructor(public rawValue) {
    this._value = toReactive(rawValue);
  }
  get value() {
    trackEffects(this.dep);
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = toReactive(newValue);
      this.rawValue = newValue;
      triggerEffect(this.dep);
    }
  }
}

export const ref = (value) => {
  return new RefImpl(value);
};

class ObjectRefImpl {
  constructor(public object, public key) {}
  get value() {
    return this.object[this.key];
  }
  set value(newValue) {
    this.object[this.key] = newValue;
  }
}

export const toRef = (object, key) => {
  return new ObjectRefImpl(object, key);
};

export const toRefs = (object) => {
  const result = isArray(object) ? new Array(object.length) : {};

  for (let key in object) {
    result[key] = toRef(object, key);
  }

  return result;
};

export const proxyRefs = (object) => {
  return new Proxy(object, {
    get(target, key, receiver) {
      let r = Reflect.get(target, key, receiver);
      return r.__v_isRef ? r.value : r;
    },
    set(target, key, value, receiver) {
      let oldValue = target[key];
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      } else {
        Reflect.set(target, key, value, receiver);
      }
    },
  });
};
