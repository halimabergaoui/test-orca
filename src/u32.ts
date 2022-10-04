var assert = require('assert');
//import { BN } from "@project-serum/anchor"; 
import BN from 'bn.js';
export class u32 extends BN {
    /**
     * Convert to Buffer representation
     */
    toBuffer(): any {
        const a = super.toArray().reverse();
        const b = Buffer.from(a);
        if (b.length === 4) {
            return b;
        }
        assert(b.length < 4, 'u64 too large');

        const zeroPad = Buffer.alloc(4);
        b.copy(zeroPad);
        return zeroPad;
    }

    /**
     * Construct a u64 from Buffer representation
     */
    static fromBuffer(buffer: any): u32 {
        assert(buffer.length === 4, `Invalid buffer length: ${buffer.length}`);
        return new u32(
            //@ts-ignore
            [...buffer]
                .reverse()
                .map(i => `00${i.toString(4)}`.slice(-2))
                .join(''),
            16,
        );
    }
}

