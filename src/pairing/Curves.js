'use strict';

import Parameters from './Parameters'
import { Point, Point2 } from './Points'
import { Field2 } from './Fields'
import CryptoRandom from './Rnd'
import bigInt from 'big-integer'
import ExNumber from './ExNumber'

class Curve {
  constructor(bn) {
    if (bn instanceof Parameters) {
      const _1 = new Field2(bn.p, bigInt(1));
      const _2 = new Field2(bn.p, bigInt(2));
      const _3 = new Field2(bn.p, bigInt(3));
      this.bn = bn;
      this.b =  _3; 
      this.infinity = new Point(this);
      this.G = new Point(this, _1, _2);
    }
  }

  pointFactory(rand) {
    if (rand instanceof CryptoRandom) {
      let x, y;
      do {
          x = ExNumber.mod(  ExNumber.construct(2*this.bn.p.bitLength(), rand), this.bn.p);
          y = this.bn.sqrt(x.multiply(x).multiply(x).add(this.b));
      } while (y === null);
      return new Point(this, x, y);
    } else {
        throw new Error("Parameter is not a cryptographically strong PRNG");
    }
  }

  contains(P) {
    if (P.E !== this) {
      return false;
    }
    
    let x  = P.x;
    let y  = P.y;
    let z  = P.z;

    return y.square().eq(x.cube().add(this.bt));
  }

  kG(k) {
    return this.Gt.multiply(k);
  }
}

class Curve2 extends Curve {
  constructor(E) {
    super(E.bn);
    if (E instanceof Curve) {
      this.E = E;
      this.bn = E.bn;
      this.Fp2_0 = E.bn.Fp2_0;
      this.Fp2_1 = E.bn.Fp2_1;
      this.Fp2_i = E.bn.Fp2_i;
      this.infinity = new Point2(this);

      this.bt = new Field2(E.bn.p, bigInt('3')).mulV();
      //b2 = FQ2([3, 0]) / FQ2([9, 1])
      if (E.bn.m == 256)
        this.bt = new Field2(E.bn.p, bigInt('3')).divide(new Field2(E.bn.p, bigInt('9'), bigInt('1'), false));
      

      this.xt = new Field2(E.bn.p, bigInt('1'), bigInt.zero, false);
      this.yt = this.xt.cube().add(this.bt).sqrt();

      if (E.bn.m == 256) {
        this.xt = new Field2(E.bn.p, 
          bigInt('10857046999023057135944570762232829481370756359578518086990519993285655852781'),
          bigInt('11559732032986387107991004021392285783925812861821192530917403151452391805634'), false);
        this.yt = new Field2(E.bn.p, 
          bigInt('8495653923123431417604973247489272438418190587263600148770280649306958101930'),
          bigInt('4082367875863433681332203403145435568316851327593401208105741076214120093531'), false);
      }

      this.Gt = new Point2(this, this.xt, this.yt);
    }
  }

  pointFactory(rand) {
    let k;
    do {
        k = ExNumber.mod( ExNumber.construct(this.E.bn.n.bitLength(), rand), this.E.bn.n);
    } while (ExNumber.signum(k) === 0);
    return this.kG(k);
  }
}

export { Curve, Curve2 }