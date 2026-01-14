declare module 'macaroons.js' {
  export interface CaveatPacket {
    type: number
    rawValue: Buffer
    getValueAsText(): string
  }

  export class Macaroon {
    identifier: string
    location: string
    signature: string
    caveatPackets: CaveatPacket[]
    
    serialize(): string
    static deserialize(serialized: string): Macaroon
  }

  export class MacaroonsBuilder {
    constructor(location: string, secretKey: string, identifier: string)
    add_first_party_caveat(caveat: string): MacaroonsBuilder
    add_third_party_caveat(location: string, secret: string, identifier: string): MacaroonsBuilder
    getMacaroon(): Macaroon
  }

  export class MacaroonsVerifier {
    constructor(macaroon: Macaroon)
    satisfyExact(caveat: string): MacaroonsVerifier
    satisfyGeneral(verifier: (caveat: string) => boolean): MacaroonsVerifier
    isValid(secret: string): boolean
  }
}
