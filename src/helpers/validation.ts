import { Request } from '@google-cloud/functions-framework';
import { validate, ValidationError as ClassValidationError } from 'class-validator';
import { ClassConstructor, plainToClass } from 'class-transformer';

export class ValidationError extends Error {
  constructor (public readonly errorMessages: string[]) {
    super(`Validation error: ${JSON.stringify(errorMessages)}`);
  }
}

/**
 * Parses the request body and performs validation.
 *
 * @param dtoType a reference to the DTO constructor used to parse and validate
 * @param req the request object used to read the raw request data
 * @returns the parsed, transformed and validated object
 * @throws ValidationError if the validation fails
 */
export async function parseAndValidateRequestData<T extends object> (dtoType: ClassConstructor<T>, req: Request): Promise<T | null> {
  const requestObject: T = plainToClass(dtoType, req.body);
  const validationErrs = await validate(requestObject);
  if (validationErrs.length > 0) {
    const msgs = validationErrs.map((ve) => getValidationConstraints(ve)).flat();
    throw new ValidationError(msgs);
  }
  return requestObject;
}

function getValidationConstraints (validationError: ClassValidationError) : string[] {
  const messages = Object.values(validationError.constraints || {});
  if (validationError.children) {
    messages.push(...validationError.children.map((ve) => getValidationConstraints(ve)).flat());
  }
  return messages;

}
