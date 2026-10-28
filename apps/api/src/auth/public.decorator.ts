import { SetMetadata } from '@nestjs/common'
import { IS_PUBLIC_KEY } from './auth.constants'

/** Marks an endpoint as reachable without the password gate. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
