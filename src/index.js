
import CryptoRandom from './pairing/Rnd'
import {Point2} from './pairing/Points'
import Parameters from './pairing/Parameters'
import {Curve, Curve2} from './pairing/Curves'
import Pairing from './pairing/Pairing'
import bigInt from 'big-integer'

/** Secret Key */
class BLSSecretKey {
  constructor(s) {
    this.rng = new CryptoRandom()
    if (!s) {
      let s = new Array(2)
      this.rng.nextBytes(s)
      this.s = bigInt(s[0])
    } else {
      this.s = bigInt(s, 16)
    }
  }

  getPublicKey() {
    let pk = new BLSPublicKey()
    pk.init(this.s)
    return pk
  }

  sign(H) {
    let sig = new BLSSignature()

    sig.sH = H.multiply(this.s)
    if (this.id) {
      sig.id = this.id
    }
    return sig
  }

  getMasterSecretKey(k) {
    if (k <= 1) {
      throw Error('bad k ' + k)
    }
    let msk = new Array(k)
    msk[0] = this
    for (let i = 1; i < k; i++) {
      msk[i] = new BLSSecretKey()
    }
    return msk
  }

  share(n, k) {
    let msk = this.getMasterSecretKey(k)
    let secVec = new Array(n)
    let ids = new Array(n)
    for (let i = 0; i < n; i++) {
      let id = i + 1
      ids[i] = id
      secVec[i] = new BLSSecretKey()
      secVec[i].s = BLSPolynomial.eval(msk, id)
      secVec[i].id = id
    }
    return secVec
  }

  recover(vec) {
    let s = BLSPolynomial.lagrange(vec)
    this.s = s
    this.id = 0
  }
}

/** Class representing authentic signature */
class BLSSignature {
  recover(signVec, Et) {
    this.sH = BLSPolynomial.lagrange(signVec, Et)
    return this
  }
}
/** Class representing public key */
class BLSPublicKey {
  constructor(s, Q) {
    this.sQ = Q.multiply(s.s)
  }
}

/** Class representing math polynomial */
class BLSPolynomial {
  static init(s, k) {
    if (k < 2) {
      throw Error('bad k ' + k)
    }
    this.c = new Array(k)
    this.c[0] = s
    for (let i = 1; i < this.c.length; i++) {
      let s = new Array(2)
      rng.nextBytes(s)
      this.c[i] = bigInt(s[0])
    }
  }
  static eval(msk, x) {
    let s = bigInt.zero
    for (let i = 0; i < msk.length; i++) {
      s = s.add(msk[i].s.multiply(x ** i))
    }
    return s
  }
  static calcDelta(S) {
    let k = S.length
    if (k < 2) throw Error('bad size' + k)
    let delta = new Array(k)
    let a = bigInt(S[0])
    for (let i = 1; i < k; i++) {
      a = a.multiply(bigInt(S[i]))
    }
    for (let i = 0; i < k; i++) {
      let b = bigInt(S[i])
      for (let j = 0; j < k; j++) {
        if (j != i) {
          let v = bigInt(S[j]).subtract(S[i])
          if (v == 0) throw Error('S has same id' + i + ' ' + j)
          b = b.multiply(v)
        }
      }
      delta[i] = a.divide(b)
    }
    return delta
  }

  static lagrange(vec, Et) {
    let S = new Array(vec.length)
    for (let i = 0; i < vec.length; i++) {
      S[i] = vec[i].id
    }
    let delta = BLSPolynomial.calcDelta(S)
    let r
    if (vec[0].s) {
      r = bigInt.zero
    } else {
      r = new Point2(Et)
    }
    for (let i = 0; i < delta.length; i++) {
      if (vec[i].s) {
        r = r.add(vec[i].s.multiply(delta[i]))
      } else {
        r = r.add(vec[i].sH.multiply(delta[i]))
      }
    }
    return r
  }
}
/** BLS signature signer */
class BLSSigner {

  constructor(bitLength) {
    this.rng = new CryptoRandom()
    this.bn = new Parameters(bitLength)
    this.E = new Curve(this.bn)
    this.Et = new Curve2(this.E)
    this.pair = new Pairing(this.Et)
  }

  getRandomPointOnE() {
    return this.E.pointFactory(this.rng)
  }

  getRandomPointOnEt() {
    return this.Et.pointFactory(this.rng)
  }

  getCurve() {
    return this.E
  }

  getE() {
    return this.E
  }

  getEt() {
    return this.Et
  }

  getCurve2() {
    return this.Et
  }

  getPairing() {
    return this.pair
  }

  getParameters() {
    return this.bn
  }

  sign(H, s) {
    return H.multiply(s)
  }

  verify(Q, H, sQ, sH) {
    const a = this.pair.ate(sQ.sQ, H)
    const b = this.pair.ate(Q, sH.sH)
    return (a.eq(b))
  }
}

export {BLSSigner, BLSSecretKey, BLSSignature, BLSPublicKey, BLSPolynomial}
