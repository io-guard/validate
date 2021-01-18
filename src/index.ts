type LogicalType = string | boolean | number | Iterable<any> | ArrayBufferLike;

type ValidationType<T> = T extends LogicalType
  ? ValidationFunction<T>
  : Validation<T>;

type ValidationMap<T> = {
  [Key in keyof T]: ValidationType<T[Key]>;
};

type ValidationFunction<T> = (item: unknown) => item is T;

type Validation<T> = ValidationFunction<T> & ValidationMap<T>;

export const ValidatorMap = <T>(validators: ValidationMap<T>): Validation<T> => {
  const keys = Object.keys(validators) as (keyof ValidationMap<T>)[];
  const validate: ValidationFunction<T> = (item: unknown): item is T => {
    if (isMissing(item))
      return false;

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const validate = validators[key];
      const value = (item as T)[key];
      if (!validate(value)) return false;
    }
    return true;
  };

  /*
    The proxy is used to allow for the chaining of functions.
    Presume Validators.Person = Validator<Person>({ ... ValidationMap<Person> })

    All of the below usages are valid:

      - Validators.Person(personData)
      - Validators.Person.Addresses(personalAddressMapData)
      - Validators.Person.Addresses.Home(personalHomeAddressData)
      - Validators.Person.Addresses.Home.City(personalHomeCity)

    Functions have read-only properties which might collide with common data properties
      (name and length are the most likely collisions).
    The Proxy is used to redirect to the ValidationMap, rather than coping with property collisions.
  */
  const validator = new Proxy(validate, {
    get: (_, key) => 
      (key in validators)
        ? validators[key as keyof T]
        : undefined,
  
  }) as Validation<T>;

  return validator;
};


export const IterableValidator = <T>(check: Validation<T>): Validation<Iterable<T>> & ValidationMap<T> => {
  const validate: Validation<Iterable<T>> = (items: unknown): items is Iterable<T> => {
    if (!isIterable<T>(items))
      return false;

    for (let item of items)
      if (!check(item as T))
        return false;

    return true;
  };

  const proxy = new Proxy(validate, {
    get: (_, key) =>
      (key in (check as ValidationMap<T>))
        ? check[key as keyof T]
        : undefined
  });

  return proxy as Validation<Iterable<T>> & ValidationMap<T>;
};


type ValidationTreeDescriptor<T> = {
  [Key in keyof T]: T[Key] extends LogicalType
  ? ValidationFunction<T[Key]>
  : ValidationTreeDescriptor<T[Key]>;
};

const isLogicalValidator = <T>(item: any): item is ValidationType<T> => typeof item === "function";
const buildValidationMap = <T>(tree: ValidationTreeDescriptor<T>): ValidationMap<T> => {
  let map: Partial<ValidationMap<T>> = {};
  for (let key in tree) {
    if (isLogicalValidator<T[typeof key]>(tree[key])) {
      const test = tree[key] as ValidationType<T[typeof key]>;
      map[key] = test;
    } else {
      const submap = buildValidationMap<T[typeof key]>(tree[key] as ValidationTreeDescriptor<T[typeof key]>);
      const test = ValidatorMap(submap) as ValidationType<T[typeof key]>;
      map[key] = test;
    }
  }
  return map as ValidationMap<T>;
};

export const ValidationTree = <T>(tree: ValidationTreeDescriptor<T>): Validation<T> => {
  const map: ValidationMap<T> = buildValidationMap<T>(tree);
  return ValidatorMap<T>(map);
};

const isNull = (item: unknown) => item === null;
const isUndefined = (item: unknown) => item === undefined;
const isMissing = (item: unknown) => item == null;

export const test = <T>(check: (item: T) => any) => (item: unknown): item is T =>
  isMissing(item) ? false : check(item as T);

export const unsafeTest = <T>(check: (item: T) => any) => (item: any): item is T => check(item as T);


export const isValueOf = <V>(value: V): ValidationFunction<V> => (item): item is V => item === value;
export const isTypeof = <T>(type: string): ValidationFunction<T> => (item): item is T => typeof item === type;

export const isString = isTypeof<string>("string");
export const isBoolean = isTypeof<boolean>("boolean");
export const isNumber = isTypeof<number>("number");
export const isValidNumber: ValidationFunction<number> = (item: unknown): item is number =>
  isNumber(item) && !Number.isNaN(item);


export const isArray = (item: unknown): item is Array<any> => Array.isArray(item);
export const isIterable = <T = any>(item: unknown): item is Iterable<T> => {
  const iterate = (<Iterable<T>>item)?.[Symbol.iterator];
  return typeof iterate === "function" && !isString(item);
};

export const optional = <T>(check: ValidationFunction<T>): ValidationFunction<T> => (item): item is T =>
  isNull(item) ? false : isUndefined(item) ? true : check(item);

export const nullable = <T>(check: ValidationFunction<T>): ValidationFunction<T> => (item): item is T =>
  isUndefined(item) ? false : isNull(item) ? true : check(item);

export const erratic = <T>(check: ValidationFunction<T>): ValidationFunction<T> => (item): item is T =>
  isMissing(item) ? true : check(item);

const compose = <T>(...checks: ((x: T) => any)[]): ValidationFunction<T> => (item): item is T =>
  isMissing(item) ? false : checks.every(check => check(item as T));

export const or = <T>(...checks: ((x: T) => any)[]): ValidationFunction<T> => (item): item is T =>
  isMissing(item) ? false : checks.some(check => check(item as T));

export const and = compose;

export const numberBetween = (min: number, max: number) => (item: number) => min <= item && item < max;
