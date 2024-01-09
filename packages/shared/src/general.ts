export const isObject = (value) => {
  return typeof value === 'object' && value !== null;
};

export const isString = (value) => {
  return typeof value === 'string';
};

export const isNumber = (value) => {
  return typeof value === 'number';
};

export const isFunction = (value) => {
  return typeof value === 'function';
};

export const isArray = Array.isArray;

export const assign = Object.assign;

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string => objectToString.call(value);

export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1);
};

export const isMap = (value: any) => {
  return toTypeString(value) === 'Map';
};

export const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (val: object, key: string | symbol): key is keyof typeof val =>
  hasOwnProperty.call(val, key);

// 首字母大写
export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// 添加 on 前缀，并且首字母大写
export const toHandlerKey = (str: string) => (str ? `on${capitalize(str)}` : ``);

// 用来匹配 kebab-case 的情况
// 比如 onTest-event 可以匹配到 T
// 然后取到 T 在前面加一个 - 就可以
// \BT 就可以匹配到 T 前面是字母的位置
const hyphenateRE = /\B([A-Z])/g;
export const hyphenate = (str: string) => str.replace(hyphenateRE, '-$1').toLowerCase();
