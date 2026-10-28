import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'
import { apiError } from '@werewolf/shared'

/** Validates request bodies/params with a shared Zod schema from @werewolf/shared. */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(
        apiError('VALIDATION_FAILED', 'Validation failed.', result.error.flatten()),
      )
    }
    return result.data
  }
}
