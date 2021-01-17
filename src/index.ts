type Simple = string | boolean | number | Array<any>;

type ValidationMap<T> = {
  [Key in keyof T]: T[Key] extends Simple ? ValidationFunction<T[Key]> : Validation<T[Key]>;
};

type ValidationFunction<T> = (item: unknown) => item is T;

type Validation<T> = ValidationFunction<T> & ValidationMap<T>;


const Validator = <T>(validators: ValidationMap<T>): Validation<T> => {
  const validate: ValidationFunction<T> = (item: unknown): item is T => {
    if (isMissing(item))
      return false;

    const keys = Object.keys(validators) as (keyof ValidationMap<T>)[];
    return keys.every(key => {
      const validate = validators[key];
      const value = (item as T)[key];

      return validate(value);
    });
  };
  const validator: Validation<T> = Object.assign(validate, validators);
  return validator;
};


const isNull = (item: unknown) => item === null;
const isUndefined = (item: unknown) => item === undefined;
const isMissing = (item: unknown) => item == null;

const test = <T>(check: (item: T) => any) => (item: unknown): item is T =>
  isMissing(item) ? false : check(item as T); 

const unsafeTest = <T>(check: (item: T) => any) => (item: any): item is T => check(item as T);


const isTypeof = <T>(type: string): ValidationFunction<T> => (item): item is T => typeof item === type;

const isString = isTypeof<string>("string");
const isBoolean = isTypeof<boolean>("boolean");
const isNumber = isTypeof<number>("number");
const isValidNumber: ValidationFunction<number> = (item: unknown): item is number => isNumber(item) && !Number.isNaN(item);
const isArray = (item: unknown): item is Array<any> => Array.isArray(item);

const optional = <T>(check: ValidationFunction<T>): ValidationFunction<T> => (item): item is T =>
  isNull(item) ? false : isUndefined(item) ? true : check(item);

const nullable = <T>(check: ValidationFunction<T>): ValidationFunction<T> => (item): item is T =>
  isUndefined(item) ? false : isNull(item) ? true : check(item);

const erratic = <T>(check: ValidationFunction<T>): ValidationFunction<T> => (item): item is T =>
  isMissing(item) ? true : check(item);



interface Person {
  name: {
    given: string;
    family: string;
  };
  age: number;
}

const PersonName = Validator<Person["name"]>({
  given: isString,
  family: isString,
});



const Person = Validator<Person>({
  name: PersonName,
  age: isValidNumber,
});

Person.name.given("Bob");

const IterableValidator = <T>(validator: Validation<T>) => () => {};
