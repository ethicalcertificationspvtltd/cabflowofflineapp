import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

/** Stable client-side UUID generator for idempotent sync payloads. */
export function createClientId(): string {
  return uuidv4();
}
