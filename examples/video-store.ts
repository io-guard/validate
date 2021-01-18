import { ValidationTree, ValidatorMap, IterableValidator, and, isString, numberBetween, isValidNumber, or, isValueOf, test, isNumber, isIterable,  } from "../src/index";

interface VHS {
  id: `video:${string}`;
  type: "VHS";
  title: string;
  year: number;
}

interface DVD {
  id: `video:${string}`;
  type: "DVD";
  title: string;
  year: number;
}

type Video = VHS | DVD;

interface Address {
  city: string;
  street: string;
  code: string;
}

interface PrimaryContactDetails {
  label: "HOME" | "MOBILE";
  phone: string;
  address: Address;
}

interface SecondaryContactDetails {
  label: "MOBILE" | "BUSINESS";
  phone: string;
}

type ContactDetails = PrimaryContactDetails | SecondaryContactDetails;

interface Transaction {
  id: `transaction:${string}`;
  time: string;
  dueDate: string;
  customer: Customer;
  items: Video[];
}

interface Customer {
  id: `customer:${string}`;
  name: { given: string; family: string; };
  contactOptions: [PrimaryContactDetails, ...SecondaryContactDetails[]];
}

interface RentalReport {
  date: string;

}




const isIDType = <T extends string>(type: T) => and<T>(isString, id => id.startsWith(type));
const isNonEmptyString = and<string>(isString, x => x.length >= 1);
const isParseableDate = and<string>(isString, time => isValidNumber(new Date(time).getTime()));


const isAddress = ValidatorMap({
  city: isNonEmptyString,
  street: isNonEmptyString,
  code: isNonEmptyString,
});

const isPrimaryContact = ValidationTree<PrimaryContactDetails>({
  label: test(label => ["HOME", "MOBILE"].includes(label)),
  phone: isNonEmptyString,
  address: isAddress,
});

const isSecondaryContact = ValidationTree<SecondaryContactDetails>({
  label: test(label => ["MOBILE", "BUSINESS"].includes(label)),
  phone: isNonEmptyString,
});

const isTransaction = ValidationTree<Transaction>({
  id: isIDType("transaction:"),
  time: isParseableDate,
  dueDate: isParseableDate,
  customer: {
    id: isIDType("customer:"),
    name: { given: isNonEmptyString, family: isNonEmptyString },
    contactOptions: and<Customer["contactOptions"]>(
      isIterable,
      test(items => isPrimaryContact((items as Customer["contactOptions"])[0])),
      IterableValidator<ContactDetails>(test((item) => isPrimaryContact(item) || isSecondaryContact(item)))),
  },
  items: IterableValidator<Video>(isVideo)
});

const isVHS = ValidatorMap<VHS>({
  id: isIDType("video:"),
  type: isValueOf("VHS"),
  year: and(isNumber, numberBetween(1989, 2003)),
  title: isNonEmptyString,
});

const isDVD = ValidatorMap<DVD>({
  id: isIDType("video:"),
  type: isValueOf("DVD"),
  year: and(isNumber, numberBetween(1998, 2008)),
  title: isNonEmptyString,
});

const isVideo = or(isVHS, isDVD);

const Validate = {
  Video: or<Video>(isVHS, isDVD)
};
