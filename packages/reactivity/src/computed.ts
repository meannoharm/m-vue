import { isFunction } from "@m-vue/shared";
import { ReactiveEffect, trackEffects, triggerEffect } from "./effect";

class ComputedRefImpl {
  public effect;
  // 默认取值时计算值
  public _dirty = true;
  public __v_isReadonly = true;
  public __v_isRef = true;
  public _value;
  public dep = new Set();
  constructor(public getter, public setter) {
    this.effect = new ReactiveEffect(getter, () => {
      // 依赖属性变化，出发此调度函数
      if (!this._dirty) {
        this._dirty = true;
        triggerEffect(this.dep);
      }
    });
  }

  get value() {
    // 依赖收集
    trackEffects(this.dep);
    // 脏值
    if (this._dirty) {
      this._dirty = false;
      this._value = this.effect.run();
    }
    return this._value;
  }

  set value(newValue) {
    this.setter(newValue);
  }
}

export const computed = (getterOrOptions) => {
  let onlyGetter = isFunction(getterOrOptions);
  let getter;
  let setter;

  if (onlyGetter) {
    getter = getterOrOptions;
    setter = () => {
      throw new Error("Computed getter is read-only.");
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter);
};
