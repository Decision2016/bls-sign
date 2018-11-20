'use strict';

import CryptoRandom from './Rnd'
import bigInt from 'big-integer'
import ExNumber from './ExNumber'


const _1 = bigInt('1')
const _2 = bigInt('2')
const _0 = bigInt('0')
const _7 = bigInt('7')

class Field2 {
  constructor (p, re, im, reduce) {
    if(arguments.length === 1) {
      this.p = p
      this.re = _0
      this.im = _0
    }
    if(arguments.length === 2) {
      if (bigInt.isInstance(re)) {
        this.p = p;
        this.re = re; //no  reduction!!!//
        this.im = _0;
      } else if (re instanceof CryptoRandom) {
        this.p = p;
        let rand = re;
        do {
            this.re =  ExNumber.construct(this.p.bitLength(), rand);
        } while (this.re.compareTo(this.p) >= 0);
        do {
            this.im =  ExNumber.construct(this.p.bitLength(), rand);
        } while (this.im.compareTo(this.p) >= 0);
      }
    }
    if(arguments.length === 4) {
      this.p = p;
      if (reduce) {
        this.re = ExNumber.mod(re, this.p);
        this.im = ExNumber.mod(im, this.p);
      } else {
        this.re = re;
        this.im = im;
      }
    }
  }

  zero() {
    return ExNumber.signum(this.re) === 0 && ExNumber.signum(this.im) === 0;
  }

  one() {
    return this.re.compareTo(_1) === 0 && ExNumber.signum(this.im) === 0;
  }

  eq(u) {
    if (!(u instanceof Field2)) {
        return false;
    }
    return this.re.compareTo(u.re) === 0 &&
        this.im.compareTo(u.im) === 0;
  }

  neg() {
      return new Field2(this.p, (ExNumber.signum(this.re) !== 0) ? this.p.subtract(this.re) : this.re, (ExNumber.signum(this.im) !== 0) ? this.p.subtract(this.im) : this.im, false);
  }

  conj() {
      return new Field2(this.p, this.re, (ExNumber.signum(this.im) !== 0) ? this.p.subtract(this.im) : this.im, false);
  }

  add (v) {
      if (v instanceof Field2) {
  
        if (!this.p.eq( v.p )) {
            throw new Error("Operands are in different finite fields");
        }
        let r = this.re.add(v.re);
        
        if (r.compareTo(this.p) >= 0) {
            r = r.subtract(this.p);
        }
        let i = this.im.add(v.im);
        
        if (i.compareTo(this.p) >= 0) {
            i = i.subtract(this.p);
        }
        return new Field2(this.p, r, i, false);
      } else if (bigInt.isInstance(v)) {
        let s = this.re.add(v);
        
        if (s.compareTo(this.p) >= 0) {
            s = s.subtract(this.p);
        }
        return new Field2(this.p, s, this.im, false);
      }
  }

  subtract(v) {
    if (v instanceof Field2) {
      if (this.p !== v.p) {
          throw new Error("Operands are in different finite fields");
      }
      let r = this.re.subtract(v.re);
      
      if (ExNumber.signum(r) < 0) {
          r = r.add(this.p);
      }
      let i = this.im.subtract(v.im);
      
      if (ExNumber.signum(i) < 0) {
          i = i.add(this.p);
      }
      return new Field2(this.p, r, i, false);
    } else if (bigInt.isInstance(v)) {
        
      let r = this.re.subtract(v);
      if (r.signum() < 0) {
          r = r.add(this.p);
      }
      return new Field2(this.p, r, this.im, false);
    }
  }

  twice  (k) {
    let r = this.re;
    let i = this.im;
    while (k-- > 0) {
        r = r.shiftLeft(1);
        if (r.compareTo(this.p) >= 0) {
            r = r.subtract(this.p);
        }
        i = i.shiftLeft(1);
        if (i.compareTo(this.p) >= 0) {
            i = i.subtract(this.p);
        }
    }
    return new Field2(this.p, r, i, false);
  }

  halve () {
    return new Field2(this.p,
        (ExNumber.testBit(this.re, 0) ? this.re.add(this.p) : this.re).shiftRight(1),
        (ExNumber.testBit(this.im, 0) ? this.im.add(this.p) : this.im).shiftRight(1),
        false);
  }

  divide(v) {
    if (v instanceof Field2) {
      return this.multiply(v.inverse());
    }
    return null;
  }

  multiply (v) {


    if (v instanceof Field2) {
      if (this === v) {
          return this.square();
      }
      if (this.bn !== v.bn) {
          throw new Error("Operands are in different finite fields");
      }
      if (this.one() || v.zero()) {
          return v;
      }
      if (this.zero() || v.one()) {
          return this;
      }

      let re2 = this.re.multiply(v.re);
      let im2 = this.im.multiply(v.im);
      let mix = this.re.add(this.im).multiply(v.re.add(v.im));

      return new Field2(this.p,
          re2.subtract(im2),
          mix.subtract(re2).subtract(im2),
          true);
    }

    else if (bigInt.isInstance(v) ) {
      return new Field2(this.p, this.re.multiply(v), this.im.multiply(v), true);
    }
    else if (v instanceof Number) {
      let newre = this.re.multiply(bigInt(v.toString()));
      while ( ExNumber.signum(newre) < 0) {
          newre = newre.add(this.p);
      }
      while (newre.compareTo(this.p) >= 0) {
          newre = newre.subtract(this.p);
      }
      let newim = this.im.multiply(bigInt(v.toString()));
      while (ExNumber.signum(newim) < 0) {
          newim = newim.add(this.p);
      }
      while (newim.compareTo(this.p) >= 0) {
          newim = newim.subtract(this.p);
      }
      return new Field2(this.p, newre, newim, false);
    } else {
      throw new Error("Incorrect type argument");
    }
  }

  square () {
    if (this.zero() || this.one()) {
        return this;
    }
    if (ExNumber.signum(this.im) === 0) {
        return new Field2(this.p,
            this.re.multiply(this.re), _0, true);
    }
    if ( ExNumber.signum(this.re) === 0) {
        return new Field2(this.p,
            this.im.multiply(this.im).negate(), _0, true);
    }

    return new Field2(this.p,
        this.re.add(this.im).multiply(this.re.subtract(this.im)),
        this.re.multiply(this.im).shiftLeft(1),
        true);
  }

  cube () {
    let re2 = this.re.multiply(this.re);
    let im2 = this.im.multiply(this.im);
    return new Field2(this.p,
        this.re.multiply(re2.subtract(im2.add(im2).add(im2))),
        this.im.multiply(re2.add(re2).add(re2).subtract(im2)),
        true);
  }

  inverse () {
    let d = this.re.multiply(this.re).add(this.im.multiply(this.im)).modInv(this.p);
    return new Field2(this.p, this.re.multiply(d), this.p.subtract(this.im).multiply(d), true);
  }

  mulI () {
    return new Field2(this.p, (ExNumber.signum(this.im) !== 0) ? this.p.subtract(this.im) : this.im, this.re, false);
  }

  divideI () {
    return new Field2(this.p, this.im, (ExNumber.signum(this.re) !== 0) ? this.p.subtract(this.re) : this.re, false);
  }

  mulV () {
    let r = this.re.subtract(this.im);
    if (ExNumber.signum(r) < 0) {
        r = r.add(this.p);
    }
    let i = this.re.add(this.im);
    if (i.compareTo(this.p) >= 0) {
        i = i.subtract(this.p);
    }
    return new Field2(this.p, r, i, false);
  }

  divV () {
    let qre = this.re.add(this.im);
    if (qre.compareTo(this.p) >= 0) {
        qre = qre.subtract(this.p);
    }
    let qim = this.im.subtract(this.re);
    if (ExNumber.signum(qim) < 0) {
        qim = qim.add(this.p);
    }
    return new Field2(this.p, (ExNumber.testBit(qre, 0) ? qre.add(this.p) : qre).shiftRight(1),
        (ExNumber.testBit(qim, 0) ? qim.add(this.p) : qim).shiftRight(1), false);
  }

  exp (k) {
    let P = this;
    if (ExNumber.signum(k) < 0) {
        k = k.neg();
        P = P.inverse();
    }
    let e = ExNumber.toByteArray(k);

    var mP = new Array(16);
    mP[0] = new Field2(this.p, bigInt('1'));
    mP[1] = P;
    for (var m = 1; m <= 7; m++) {
        
        mP[2*m] = mP[m].square();
        mP[2*m + 1] = mP[2*m].multiply(P);
    }
    var A = mP[0];
    for (var i = 0; i < e.length; i++) {
        var u = e[i] & 0xff;
        A = A.square().square().square().square().multiply(mP[u >>> 4]).square().square().square().square().multiply(mP[u & 0xf]);
    }
    return A;
  }

  sqrt () {
    if (this.zero()) {
        return this;
    }
    //sqrtExponent
    console.log('1');
    let r = this.exp( this.p.multiply(this.p).add(_7).divide(16) );
    let r2 = r.square();
    if (r2.subtract(this).zero()) {
        console.log('222');
        return r;
    }
    if (r2.add(this).zero()) {
      console.log('33');
        return r.mulI();
    }
    r2 = r2.mulI();

    console.log('2');
    //sqrtI

    const invSqrtMinus2 = this.p.subtract(_2).modPow(this.p.subtract(_1).subtract(this.p.add(_1).divide(4)), this.p); // 1/sqrt(-2) = (-2)^{-(p+1)/4}
    const sqrtI = new Field2(this.p, invSqrtMinus2, this.p.subtract(invSqrtMinus2), false); // sqrt(i) = (1 - i)/sqrt(-2)


 // const invSqrtMinus2 = this.p.subtract(_2).modPow(this.p.subtract(_1).subtract(this.p.add(_1).shiftRight(2)), this.p);
   
    r = r.multiply(sqrtI);
    if (r2.subtract(this).zero()) {
      console.log('3');
        return r;
    }
    if (r2.add(this).zero()) {
      console.log('4');
        return r.mulI();
        
    }

    return null;
  }

  cbrt () {
    if (this.zero()) {
        return this;
    }
    let r = this.exp(bn.cbrtExponent2);
    return r.cube().subtract(this).zero() ? r : null;
  }

  toString() {
    return '['+this.re.toString()+','+this.im.toString()+']';
  }
}

class Field12 {

  constructor (bn, k) {
      if (arguments.length === 1) {
          let f = bn;
          this.bn = f.bn;
          this.v = new Array(6);
          for (let i = 0; i < 6; i++) {
              this.v[i] = f.v[i];
          }
      }
      if (arguments.length === 2) {
          if (bigInt.isInstance(k)) {
              this.bn = bn;
              this.v = new Array(6);
              this.v[0] = new Field2(bn.p, k);
              for (let i = 1; i < 6; i++) {
                  this.v[i] = new Field2(bn.p);
              }
          } else if (k instanceof Array) {
              this.bn = bn;
              this.v = k;
          } else {
              let rand = k;
              this.bn = bn;
              this.v = new Array(6);
              for (let i = 0; i < 6; i++) {
                  this.v[i] = new Field2(bn.p, rand);
              }
          }
      }
  }

  zero () {
      return this.v[0].zero() && this.v[1].zero() && this.v[2].zero() &&
              this.v[3].zero() && this.v[4].zero() && this.v[5].zero();
  }

  one () {
      return this.v[0].one() && this.v[1].zero() && this.v[2].zero() &&
              this.v[3].zero() && this.v[4].zero() && this.v[5].zero();
  }

  eq(o) {
    if (!(o instanceof Field12)) {
        return false;
    }

    return this.v[0].eq(o.v[0]) &&
        this.v[1].eq(o.v[1]) &&
        this.v[2].eq(o.v[2]) &&
        this.v[3].eq(o.v[3]) &&
        this.v[4].eq(o.v[4]) &&
        this.v[5].eq(o.v[5]);
  }

  neg () {
      let w = new Array(6);
      for (let i = 0; i < 6; i++) {
          w[i] = this.v[i].neg();
      }
      return new Field12(this.bn, w);
  }

  frobenius () {
      let w = new Array(6);
      w[0] = this.v[0].conj();
     
      w[1] = this.v[1].conj().mulV().multiply(this.bn.sigma);
      w[2] = this.v[2].conj().multiply(this.bn.zeta0).mulI().neg();
      w[3] = this.v[3].mulV().conj().multiply(this.bn.zeta0sigma);
      w[4] = this.v[4].conj().multiply(this.bn.zeta1);
      w[5] = this.v[5].conj().mulV().multiply(this.bn.zeta1sigma);

      return new Field12(this.bn, w);
  }

  conj (m) {
      let w ;
      switch (m) {
          case 0:
              return this;
          case 1:
              w = new Array(6);
              w[0] = this.v[0];
              w[1] = this.v[1].multiply(this.bn.zeta0).neg();
              w[2] = this.v[2].multiply(this.bn.zeta1).neg();
              w[3] = this.v[3].neg();
              w[4] = this.v[4].multiply(this.bn.zeta0);
              w[5] = this.v[5].multiply(this.bn.zeta1);
              return new Field12(this.bn, w);
          case 2:
              w = new Array(6);
              w[0] = this.v[0];
              w[1] = this.v[1].multiply(this.bn.zeta1).neg();
              w[2] = this.v[2].multiply(this.bn.zeta0);
              w[3] = this.v[3];
              w[4] = this.v[4].multiply(this.bn.zeta1).neg();
              w[5] = this.v[5].multiply(this.bn.zeta0);
              return new Field12(this.bn, w);
          case 3:
              w = new Array(6);
              w[0] = this.v[0];
              w[1] = this.v[1].neg();
              w[2] = this.v[2];
              w[3] = this.v[3].neg();
              w[4] = this.v[4];
              w[5] = this.v[5].neg();
              return new Field12(this.bn, w);
          case 4:
              w = new Array(6);
              w[0] = this.v[0];
              w[1] = this.v[1].multiply(this.bn.zeta0);
              w[2] = this.v[2].multiply(this.bn.zeta1).neg();
              w[3] = this.v[3];
              w[4] = this.v[4].multiply(this.bn.zeta0);
              w[5] = this.v[5].multiply(this.bn.zeta1).neg();
              return new Field12(this.bn, w);
          case 5:
              w = new Array(6);
              w[0] = this.v[0];
              w[1] = this.v[1].multiply(this.bn.zeta1);
              w[2] = this.v[2].multiply(this.bn.zeta0);
              w[3] = this.v[3].neg();
              w[4] = this.v[4].multiply(this.bn.zeta1).neg();
              w[5] = this.v[5].multiply(this.bn.zeta0).neg();
              return new Field12(this.bn, w);
          default: 
      }
  }

  add (k) {
      if (this.bn.p !== k.bn.p) {
          throw new Error("Operands are in different finite fields");
      }
      let w = new Array(6);
      for (let i = 0; i < 6; i++) {
          w[i] = this.v[i].add(k.v[i]);
      }
      return new Field12(this.bn, w);
  }

  subtract  (k) {
      if (this.bn.p !== k.bn.p) {
          throw new Error("Operands are in different finite fields");
      }
      let w = new Array(6);
      for (let i = 0; i < 6; i++) {
          w[i] = this.v[i].subtract(k.v[i]);
      }
      return new Field12(this.bn, w);
  }
  
  divide(k) {
    return this.multiply(k.inverse());
  }

  multiply(k) {
      if (k instanceof Field12) {
          if (k === this) {
              return this.square();
          }
          if (this.bn.p !== k.bn.p) {
              throw new Error("Operands are in different finite fields");
          }
          if (this.one() || k.zero()) {
              return k;
          }
          if (this.zero() || k.one()) {
              return this;
          }
          let w = new Array(6);
          if (k.v[2].zero() && k.v[4].zero() && k.v[5].zero()) {
              if (this.v[2].zero() && this.v[4].zero() && this.v[5].zero()) {
                  let d00 = this.v[0].multiply(k.v[0]);
                  let d11 = this.v[1].multiply(k.v[1]);
                  let d33 = this.v[3].multiply(k.v[3]);
                  let s01 = this.v[0].add(this.v[1]);
                  let t01 = k.v[0].add(k.v[1]);
                  let u01 = d00.add(d11);
                  let z01 = s01.multiply(t01);
                  let d01 = z01.subtract(u01);
                  let d13 = this.v[1].add(this.v[3]).multiply(k.v[1].add(k.v[3])).subtract(d11.add(d33));
                  u01 = u01.add(d01);
                  let d03 = s01.add(this.v[3]).multiply(t01.add(k.v[3])).subtract(u01.add(d33).add(d13));
                  let d05 = z01.subtract(u01);

                  w[0] = d33.divV().add(d00);
                  w[1] = d01;
                  w[2] = d11;
                  w[3] = d03;
                  w[4] = d13;
                  w[5] = d05;
              } else {
                  let d00 = this.v[0].multiply(k.v[0]);
                  let d11 = this.v[1].multiply(k.v[1]);
                  let d33 = this.v[3].multiply(k.v[3]);
                  let s01 = this.v[0].add(this.v[1]);
                  let t01 = k.v[0].add(k.v[1]);
                  let u01 = d00.add(d11);
                  let d01 = s01.multiply(t01).subtract(u01);
                  let d02 = this.v[0].add(this.v[2]).multiply(k.v[0]).subtract(d00);
                  let d04 = this.v[0].add(this.v[4]).multiply(k.v[0]).subtract(d00);
                  let d13 = this.v[1].add(this.v[3]).multiply(k.v[1].add(k.v[3])).subtract(d11.add(d33));
                  let d15 = this.v[1].add(this.v[5]).multiply(k.v[1]).subtract(d11);
                  let s23 = this.v[2].add(this.v[3]);
                  let d23 = s23.multiply(k.v[3]).subtract(d33);
                  let d35 = this.v[3].add(this.v[5]).multiply(k.v[3]).subtract(d33);
                  u01 = u01.add(d01);
                  let u23 = d33.add(d23);
                  let d03 = s01.add(s23).multiply(t01.add(k.v[3])).subtract(u01.add(u23).add(d02).add(d13));
                  let s45 = this.v[4].add(this.v[5]);
                  let d05 = s01.add(s45).multiply(t01).subtract(u01.add(d04).add(d15));
                  let d25 = s23.add(s45).multiply(k.v[3]).subtract(u23.add(d35));
                 
                  w[0] = d15.add(d33).divV().add(d00);
                  w[1] = d25.divV().add(d01);
                  w[2] = d35.divV().add(d02).add(d11);
                  w[3] = d03;
                  w[4] = d04.add(d13);
                  w[5] = d05.add(d23);
              }
          } else if (k.v[1].zero() && k.v[4].zero() && k.v[5].zero()) {
              let d00 = this.v[0].multiply(k.v[0]);
              let d22 = this.v[2].multiply(k.v[2]);
              let d33 = this.v[3].multiply(k.v[3]);
              let s01 = this.v[0].add(this.v[1]);
              let d01 = s01.multiply(k.v[0]).subtract(d00);
              let d02 = this.v[0].add(this.v[2]).multiply(k.v[0].add(k.v[2])).subtract(d00.add(d22));
              let d04 = this.v[0].add(this.v[4]).multiply(k.v[0]).subtract(d00);
              let d13 = this.v[1].add(this.v[3]).multiply(k.v[3]).subtract(d33);
              let s23 = this.v[2].add(this.v[3]);
              let t23 = k.v[2].add(k.v[3]);
              let u23 = d22.add(d33);
              let d23 = s23.multiply(t23).subtract(u23);
              let d24 = this.v[2].add(this.v[4]).multiply(k.v[2]).subtract(d22);
              let d35 = this.v[3].add(this.v[5]).multiply(k.v[3]).subtract(d33);
              let u01 = d00.add(d01);
              let d03 = s01.add(s23).multiply(k.v[0].add(t23)).subtract(u01.add(u23).add(d02).add(d13).add(d23));
              let s45 = this.v[4].add(this.v[5]);
              let d05 = s01.add(s45).multiply(k.v[0]).subtract(u01.add(d04));
              let d25 = s23.add(s45).multiply(t23).subtract(u23.add(d23).add(d24).add(d35));
             
              w[0] = d24.add(d33).divV().add(d00);
              w[1] = d25.divV().add(d01);
              w[2] = d35.divV().add(d02);
          
              w[3] = d03;
              w[4] = d04.add(d13).add(d22);
              w[5] = d05.add(d23);
          } else {
              let d00 = this.v[0].multiply(k.v[0]);
              let d11 = this.v[1].multiply(k.v[1]);
              let d22 = this.v[2].multiply(k.v[2]);
              let d33 = this.v[3].multiply(k.v[3]);
              let d44 = this.v[4].multiply(k.v[4]);
              let d55 = this.v[5].multiply(k.v[5]);
              let s01 = this.v[0].add(this.v[1]);
              let t01 = k.v[0].add(k.v[1]);
              let u01 = d00.add(d11);
              let d01 = s01.multiply(t01).subtract(u01);
              let d02 = this.v[0].add(this.v[2]).multiply(k.v[0].add(k.v[2])).subtract(d00.add(d22));
              let d04 = this.v[0].add(this.v[4]).multiply(k.v[0].add(k.v[4])).subtract(d00.add(d44));
              let d13 = this.v[1].add(this.v[3]).multiply(k.v[1].add(k.v[3])).subtract(d11.add(d33));
              let d15 = this.v[1].add(this.v[5]).multiply(k.v[1].add(k.v[5])).subtract(d11.add(d55));
              let s23 = this.v[2].add(this.v[3]);
              let t23 = k.v[2].add(k.v[3]);
              let u23 = d22.add(d33);
              let d23 = s23.multiply(t23).subtract(u23);
              let d24 = this.v[2].add(this.v[4]).multiply(k.v[2].add(k.v[4])).subtract(d22.add(d44));
              let d35 = this.v[3].add(this.v[5]).multiply(k.v[3].add(k.v[5])).subtract(d33.add(d55));
              let s45 = this.v[4].add(this.v[5]);
              let t45 = k.v[4].add(k.v[5]);
              let u45 = d44.add(d55);
              let d45 = s45.multiply(t45).subtract(u45);
              u01 = u01.add(d01);
              u23 = u23.add(d23);
              u45 = u45.add(d45);
              let d03 = s01.add(s23).multiply(t01.add(t23)).subtract(u01.add(u23).add(d02).add(d13));
              let d05 = s01.add(s45).multiply(t01.add(t45)).subtract(u01.add(u45).add(d04).add(d15));
              let d25 = s23.add(s45).multiply(t23.add(t45)).subtract(u23.add(u45).add(d24).add(d35));
             
              w[0] = d15.add(d24).add(d33).divV().add(d00);
              w[1] = d25.divV().add(d01);
              w[2] = d35.add(d44).divV().add(d02).add(d11);
              w[3] = d45.divV().add(d03);
              w[4] = d55.divV().add(d04).add(d13).add(d22);
              w[5] = d05.add(d23);
          }

          return new Field12(this.bn, w);
      } else if (bigInt.isInstance(k) || k instanceof Field2) {
          let w = new Array(6);
          for (let i = 0; i < 6; i++) {
              w[i] = this.v[i].multiply(k);
          }
          return new Field12(this.bn, w);
      }
  }

  decompress (h) {
      
      if (!h.v[1].zero()) {
          h.v[3] = h.v[5].square().divV().add(h.v[2].square().multiply(new Number(3))).subtract(h.v[4].twice(1)).multiply(h.v[1].twice(2).inverse());
          h.v[0] = h.v[3].square().twice(1).add(h.v[1].multiply(h.v[5])).subtract(h.v[4].multiply(h.v[2]).multiply(new Number(3))).divV().add(bigInt.one);
      } else {
          h.v[3] = h.v[2].multiply(h.v[5]).twice(1).multiply(h.v[4].inverse());
          h.v[0] = h.v[3].square().twice(1).subtract(h.v[4].multiply(h.v[2]).multiply(new Number(3))).mulV().add(bigInt.one);
      }
  }

  square() {
    let d00 = this.v[0].square();
    let d11 = this.v[1].square();
    let d22 = this.v[2].square();
    let d33 = this.v[3].square();
    let d44 = this.v[4].square();
    let d55 = this.v[5].square();
    let s01 = this.v[0].add(this.v[1]);
    let t01 = d00.add(d11);
    let d01 = s01.square().subtract(t01);
    let d02 = this.v[0].add(this.v[2]).square().subtract(d00.add(d22));
    let d04 = this.v[0].add(this.v[4]).square().subtract(d00.add(d44));
    let d13 = this.v[1].add(this.v[3]).square().subtract(d11.add(d33));
    let d15 = this.v[1].add(this.v[5]).square().subtract(d11.add(d55));
    let s23 = this.v[2].add(this.v[3]);
    let t23 = d22.add(d33);
    let d23 = s23.square().subtract(t23);
    let d24 = this.v[2].add(this.v[4]).square().subtract(d22.add(d44));
    let d35 = this.v[3].add(this.v[5]).square().subtract(d33.add(d55));
    let s45 = this.v[4].add(this.v[5]);
    let t45 = d44.add(d55);
    let d45 = s45.square().subtract(t45);
    t01 = t01.add(d01)
    t23 = t23.add(d23);
    t45 = t45.add(d45);
        
    let d03 = s01.add(s23).square().subtract(t01.add(t23).add(d02).add(d13));
    let d05 = s01.add(s45).square().subtract(t01.add(t45).add(d04).add(d15));
    let d25 = s23.add(s45).square().subtract(t23.add(t45).add(d24).add(d35));
    let w = new Array(6);
    w[0] = d15.add(d24).add(d33).divV().add(d00);
    w[1] = d25.divV().add(d01);
    w[2] = d35.add(d44).divV().add(d02).add(d11);
    w[3] = d45.divV().add(d03);
    w[4] = d55.divV().add(d04).add(d13).add(d22);
    w[5] = d05.add(d23);
    return new Field12(this.bn, w);

  }

  compressedSquare () {
      
    let h = new Field12(this.bn.Fp12_0);
    
    let A23 = this.v[1].add(this.v[4]).multiply(this.v[1].add(this.v[4].divV()));
    let A45 = this.v[2].add(this.v[5]).multiply(this.v[2].add(this.v[5].divV()));
    let B45 = this.v[2].multiply(this.v[5]);
    let B23 = this.v[1].multiply(this.v[4]);
    h.v[1] = this.v[1].add(B45.divV().multiply(new Number(3))).twice(1);
    h.v[4] = A45.subtract(B45.add(B45.divV())).multiply(new Number(3)).subtract(this.v[4].twice(1));
    h.v[2] = A23.subtract(B23.add(B23.divV())).multiply(new Number(3)).subtract(this.v[2].twice(1));
    h.v[5] = this.v[5].add(B23.multiply(new Number(3))).twice(1);
  
    
    return h;
  }

  uniSquare () {
    let a0sqr = this.v[0].square();
    let a1sqr = this.v[3].square();
    let b0sqr = this.v[1].square();
    let b1sqr = this.v[4].square();
    let c0sqr = this.v[2].square();
    let c1sqr = this.v[5].square();
    let a0, a1, b0, b1, c0, c1;
    a0 = a1sqr.divV().add(a0sqr).multiply(new Number(3)).subtract(this.v[0].twice(1));
    a1 = this.v[0].add(this.v[3]).square().subtract(a0sqr).subtract(a1sqr).multiply(new Number(3)).add(this.v[3].twice(1));
    b0 = this.v[2].add(this.v[5]).square().subtract(c0sqr).subtract(c1sqr).multiply(new Number(3)).divV().add(this.v[1].twice(1));
    b1 = c0sqr.add(c1sqr.divV()).multiply(new Number(3)).subtract(this.v[4].twice(1));
    c0 = b1sqr.divV().add(b0sqr).multiply(new Number(3)).subtract(this.v[2].twice(1));
    c1 = this.v[1].add(this.v[4]).square().subtract(b0sqr).subtract(b1sqr).multiply(new Number(3)).add(this.v[5].twice(1));
    
    let m = new Array(6);
    m[0] = a0;
    m[1] = b0;
    m[2] = c0;
    m[3] = a1;
    m[4] = b1;
    m[5] = c1;
    return new Field12(this.bn, m);
  }

  mulV () {
      
    let m = new Array(6);
    m[0] = this.v[4].mulV();
    m[1] = this.v[5].mulV();
    m[2] = this.v[0];
    m[3] = this.v[1];
    m[4] = this.v[2];
    m[5] = this.v[3];
    return new Field12(this.bn, m);
  }

  divV () {
    let m = new Array(6);
    m[0] = this.v[4].divV();
    m[1] = this.v[5].divV();
    m[2] = this.v[0];
    m[3] = this.v[1];
    m[4] = this.v[2];
    m[5] = this.v[3];
    return new Field12(this.bn, m);
  }

  inverse () {

    let c = this.conj(1);
    for (let i = 2; i < 6; i++) {
      c = c.multiply(this.conj(i));
    }

    let n = c.multiply(this);

    c = c.multiply(n.v[0].inverse());

    return c;
  }

  plainExp (k) {
    let w = this;
    for (let i = k.bitLength()-2; i >= 0; i--) {
        w = w.square();
        if (ExNumber.testBit(k, i)) {
            w = w.multiply(this);
        }
    }
    return w;
  }

  uniExp (k) {
    let w = new Field12(this);
    for (let i = k.bitLength()-2; i >= 0; i--) {
        w = w.compressedSquare()
        if (ExNumber.testBit(k, i)) {
            this.decompress(w);
            w = w.multiply(this);
        }
    }

    return w;
  }

  finExp () {
    let f = this;
    
    f = f.conj(3).multiply(f.inverse());
    f = f.conj(1).multiply(f);
    let fconj = f.conj(3);
    let fu; let fu2; let fu3;
    if (ExNumber.signum(this.bn.u) >= 0) {
        fu  = fconj.uniExp(this.bn.u);           
        fu2 = fu.conj(3).uniExp(this.bn.u); 
        fu3 = fu2.conj(3).uniExp(this.bn.u);
    } else {
        fu = f.uniExp(this.bn.u.negate());       
        fu2 = fu.uniExp(this.bn.u.negate());     
        fu3 = fu2.uniExp(this.bn.u.negate());    
    }

    let fp = f.frobenius();
    let fp2 = fp.frobenius();
    let fp3 = fp2.frobenius();

    let fup = fu.frobenius();
    let fu2p = fu2.frobenius();
    let fu3p = fu3.frobenius();
    let fu2p2 = fu2.conj(1);

    let y0 = fp.multiply(fp2).multiply(fp3);
    let y1 = fconj;
    let y2 = fu2p2;
    let y3 = fup;
    let y4 = fu.multiply(fu2p.conj(3));
    let y5 = fu2.conj(3);
    let y6 = fu3.multiply(fu3p);

    let T0 = y6.uniSquare().multiply(y4).multiply(y5);
    let T1 = y3.multiply(y5).multiply(T0).uniSquare();
    T0 = T0.multiply(y2);
    T1 = T1.multiply(T0).uniSquare();
    T0 = T1.multiply(y1).uniSquare();
    T1 = T1.multiply(y0);
    T0 = T0.multiply(T1);
    f = T0;

    return f;
  }
  exp (k) {
    return this.plainExp(k);
  }

  toString() {
    return '['+this.v[0].re.toString()+','+this.v[0].im.toString()+', '+
    this.v[1].re.toString()+','+this.v[1].im.toString()+', '+
    this.v[2].re.toString()+','+this.v[2].im.toString()+', ' +
    this.v[3].re.toString()+','+this.v[3].im.toString()+', '+
    this.v[4].re.toString()+','+this.v[4].im.toString()+', '+
    this.v[5].re.toString()+','+this.v[5].im.toString()+']';
  }
}

export {Field2, Field12}