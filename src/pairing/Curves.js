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
      this.bn = bn;
      this.b = (bn.b === 3) ? bn._3 : bn._2; 
      this.infinity = new Point(this);
      this.G = (bn.b === 3) ? new Point(this, bn._1, bn._2) : new Point(this, bn._1.negate(), bn._1);

      this.pp16G = new Array(bn.n.bitLength().add(3).divide(4)).fill(new Array(16));
      this.pp16Gi = this.pp16G[0];
      this.pp16Gi[0] = this.infinity;
      this.pp16Gi[1] = this.G;
      for (let i = 1, j = 2; i <= 7; i++, j += 2) {
        this.pp16Gi[j  ] = this.pp16Gi[i].twice(1);
        this.pp16Gi[j+1] = this.pp16Gi[j].add(this.G);
      }
      for (let i = 1; i < this.pp16G.length; i++) {
        let pp16Gh = this.pp16Gi;
        this.pp16Gi = this.pp16G[i];
        this.pp16Gi[0] = pp16Gh[0];
        for (let j = 1; j < 16; j++) {
          this.pp16Gi[j] = pp16Gh[j].twice(4);
        }
      }
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
    let x, y, z = bigInt();

    let x2, z2, z4, br = new bigInt();
    x  = P.x,
    y  = P.y,
    z  = P.z;

    x2 = new ExNumber(x.multiply(x)).mod(this.bn.p),
    z2 = new ExNumber(z.multiply(z)).mod(this.bn.p),
    z4 = new ExNumber(z2.multiply(z2)).mod(this.bn.p),
    br = new ExNumber(this.b.multiply(z2)).mod(this.bn.p);
    return new ExNumber( 
        x.multiply(x2).add(br.multiply(z4)).subtract(y.multiply(y)).mod(this.bn.p)   ).signum() === 0;
  }

  kG( k) {
    k =  ExNumber.mod(k, this.bn.n);
    let A = this.infinity;
    for (let i = 0, w = 0; i < this.pp16G.length; i++, w >>>= 4) {
        if ((i & 7) == 0) {
            w = k;
            k = k.shiftRight(32);
        }
        A = A.add(this.pp16G[i][w.and( 0xf )]);
    }
    return A;
  }
}

class Curve2 {
  constructor(E) {
    if (E instanceof Curve) {
      this.E = E;
      this.Fp2_0 = E.bn.Fp2_0;
      this.Fp2_1 = E.bn.Fp2_1;
      this.Fp2_i = E.bn.Fp2_i;
      this.infinity = new Point2(this);
      //b2 = FQ2([3, 0]) / FQ2([9, 1])

      //this.bt = new Field2(E.bn.p, bigInt('3')).divide(new Field2(E.bn.p, bigInt('9'), bigInt('1'), false));
      this.bt = new Field2(E.bn.p, bigInt('3')).mulV();

      this.xt = new Field2(E.bn.p, bigInt('1'), bigInt.zero, false);
      this.yt = this.xt.cube().add(this.bt).sqrt();
      /*if (E.bn.m == 192) {
        this.yt = new Field2(E.bn.p, 
          bigInt('464234817898553698934248835714285957919113756413497973093'),
        bigInt('3076058936254399553170054352418567043893384998761804393444'), false);
      } else if (E.bn.m == 128) {
        this.yt = new Field2(E.bn.p, 
          bigInt('188171377329717814604978879580061544903'),
        bigInt('77524232476859237612883652495923276497'), false);
      } else if (E.bn.m == 56) {
        this.yt = new Field2(E.bn.p, 
          bigInt('21754382168697137'),
        bigInt('13729974729342851'), false);
      } else if (E.bn.m == 256) {
        this.xt = new Field2(E.bn.p, 
          bigInt('10857046999023057135944570762232829481370756359578518086990519993285655852781'),
        bigInt('11559732032986387107991004021392285783925812861821192530917403151452391805634'), false);
        this.yt = new Field2(E.bn.p, 
          bigInt('8495653923123431417604973247489272438418190587263600148770280649306958101930'),
        bigInt('4082367875863433681332203403145435568316851327593401208105741076214120093531'), false);
      }*/
      console.log('this.yt',   this.yt.toString())
      this.Gt = new Point2(this, this.xt, this.yt);
      this.Gt = this.Gt.multiply(E.bn.ht).norm();
    }
  }

  pointFactory(rand) {
    let k;
    do {
        k = ExNumber.mod( ExNumber.construct(this.E.bn.n.bitLength(), rand), this.E.bn.n);
    } while (ExNumber.signum(k) === 0);
    return this.Gt.multiply(k);
  }

  contains(P) {
    if (P.E !== this) {
      return false;
    }
    
    let x  = P.x;
    let y  = P.y;
    let z  = P.z;

    // y^2 = x^3+bz^5
    return y.square().eq(x.cube().add(this.bt.multiply( z.square().cube() )));
  }

  kG(k) {

    return this.Gt.multiply(k);
  }
}

export { Curve, Curve2 }