var assert = require('assert');
//import { BN } from "@project-serum/anchor"; 
import BN from 'bn.js';
export class u128 extends BN {
    /**
     * Convert to Buffer representation
     */
    toBuffer(): any {
        const a = super.toArray().reverse();
        const b = Buffer.from(a);
        if (b.length === 16) {
            return b;
        }
        assert(b.length < 16, 'u64 too large');

        const zeroPad = Buffer.alloc(16);
        b.copy(zeroPad);
        return zeroPad;
    }

    /**
     * Construct a u64 from Buffer representation
     */
    static fromBuffer(buffer: any): u128 {
        assert(buffer.length === 16, `Invalid buffer length: ${buffer.length}`);
        return new u128(
            //@ts-ignore
            [...buffer]
                .reverse()
                .map(i => `00${i.toString(16)}`.slice(-2))
                .join(''),
            16,
        );
    }
}

