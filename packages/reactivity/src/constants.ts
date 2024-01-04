export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  RAW = '__v_raw',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
}

export enum TriggerOpTypes {
  ADD = 'add',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
}
