// src/auth/decorators/is-true.decorator.ts

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// The decorator function
export function IsTrue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTrue',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsTrueConstraint,
    });
  };
}

// The constraint class that implements the validation logic
@ValidatorConstraint({ name: 'isTrue' })
export class IsTrueConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    // The validation logic: check if the value is strictly true
    return value === true;
  }

  defaultMessage() {
    // The default error message if validation fails
    return '$property must be true';
  }
}