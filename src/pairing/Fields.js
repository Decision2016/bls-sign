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
    this.poly_coeffs = [1, 0];
    this.degree = this.poly_coeffs.length;
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
    //console.log('this.re', this.re)
    return this.re.isZero() && this.im.isZero();
  }

  one() {
    return this.re.compareTo(_1) === 0 && this.im.isZero();
  }

  eq(u) {
    if (!(u instanceof Field2)) {
        return false;
    }
    return this.re.equals(u.re) && this.im.equals(u.im) ;
  }

  neg() {
      return new Field2(this.p, (ExNumber.signum(this.re) !== 0) ? this.p.subtract(this.re) : this.re, (ExNumber.signum(this.im) !== 0) ? this.p.subtract(this.im) : this.im, false);
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
    } else if (bigInt.isInstance(v)) {
      //v = v.mod(this.p);

      let nr = this.re.multiply( v.modInv(this.p) );
      let ni = this.im.multiply( v.modInv(this.p) );
      return new Field2(this.p, nr, ni, true);
    }
    return null;
  }

  inverse() {
    const d = this.re.multiply(this.re).add(this.im.multiply(this.im)).modInv(this.p);
    return new Field2(this.p, this.re.multiply(d), this.p.subtract(this.im).multiply(d), true);
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

  square() {
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

    let r = this.exp( this.p.multiply(this.p).add(_7).divide(16) );
    let r2 = r.square();
    if (r2.subtract(this).zero()) {
        return r;
    }
    if (r2.add(this).zero()) {
        return r.mulI();
    }
    r2 = r2.mulI();

    const invSqrtMinus2 = this.p.subtract(_2).modPow(this.p.subtract(_1).subtract(this.p.add(_1).divide(4)), this.p); // 1/sqrt(-2) = (-2)^{-(p+1)/4}
    const sqrtI = new Field2(this.p, invSqrtMinus2, this.p.subtract(invSqrtMinus2), false); // sqrt(i) = (1 - i)/sqrt(-2)

    r = r.multiply(sqrtI);
    if (r2.subtract(this).zero()) {
        return r;
    }
    if (r2.add(this).zero()) {
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
      
      this.poly_coeffs = [bigInt(82), bigInt.zero, bigInt.zero, bigInt.zero, bigInt.zero, 
        bigInt.zero, bigInt(-18), bigInt.zero, bigInt.zero, bigInt.zero, bigInt.zero, bigInt.zero];
      this.degree = this.poly_coeffs.length;

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

  zero() {
      return this.v[0].zero() && this.v[1].zero() && this.v[2].zero() &&
              this.v[3].zero() && this.v[4].zero() && this.v[5].zero();
  }

  one() {
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

  add(k) {
      if (this.bn.p !== k.bn.p) {
          throw new Error("Operands are in different finite fields");
      }
      let w = new Array(6);
      for (let i = 0; i < 6; i++) {
          w[i] = this.v[i].add(k.v[i]);
      }
      return new Field12(this.bn, w);
  }

  subtract(k) {
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
    if (bigInt.isInstance(k) || k instanceof Field2) {
      let w = new Array(6);
      for (let i = 0; i < 6; i++) {
          w[i] = this.v[i].divide(k);
      }
      return new Field12(this.bn, w);
    } else if (k instanceof Field12) {
      return this.multiply(k.inverse());
    }
  }

  split() {
    this.s = [
      new Field2(this.bn.p, this.v[0].re),
      new Field2(this.bn.p, this.v[0].im),
      new Field2(this.bn.p, this.v[1].re),
      new Field2(this.bn.p, this.v[1].im),
      new Field2(this.bn.p, this.v[2].re),
      new Field2(this.bn.p, this.v[2].im),
      new Field2(this.bn.p, this.v[3].re),
      new Field2(this.bn.p, this.v[3].im),
      new Field2(this.bn.p, this.v[4].re),
      new Field2(this.bn.p, this.v[4].im),
      new Field2(this.bn.p, this.v[5].re),
      new Field2(this.bn.p, this.v[5].im),
    ]
  }

  join(s) {

    let ar = new Array(6);

    for (let i=0; i<ar.length; i++) {
      ar[i] = new Field2(this.bn.p, s[i*2].re, s[i*2+1].re, false);
    }

    return new Field12(this.bn, ar);
  }


  multiply(k) {
    if (bigInt.isInstance(k) || k instanceof Field2) {
      let w = new Array(6);
      for (let i = 0; i < 6; i++) {
          w[i] = this.v[i].multiply(k);
      }
      return new Field12(this.bn, w);
    } else if (k instanceof Field12) {

        if (!this.bn.p.equals(k.bn.p)) {
            throw new Error("Operands are in different finite fields");
        }
        if (this.one() || k.zero()) {
            return k;
        }
        if (this.zero() || k.one()) {
            return this;
        }
      
        let b = new Array(this.degree * 2 -1 ).fill(new Field2(this.bn.p, _0));

        this.split();
        k.split();

        for (let i = 0; i < this.degree; i++) {
          for (let j = 0; j < this.degree; j++) {
            b[i + j] = b[i + j].add(this.s[i].multiply(k.s[j]));
          }
        }

        let exp; let top;
        while (b.length > this.degree) {
          exp = b.length - this.degree - 1;
          top = b.pop();
          for (let i = 0; i < this.degree; i++) {
            b[exp + i] = b[exp + i].subtract(top.multiply( this.poly_coeffs[i]) );
          }
        }

        return this.join(b);
      } 
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

  inverse() {
    const deg = (p) => {
      let d = p.length - 1
      while (p[d].eq(new Field2(this.bn.p, _0)) && d > 0) 
          d -= 1
      return d;
    }

    const poly_div = (a, b) => {
      let dega = deg(a)
      let degb = deg(b)
      let temp = a.slice();
      let o = new Array(a.length).fill(new Field2(this.bn.p,_0));
      for (let i = dega - degb; i > -1; i--) {
        o[i] = o[i].add( temp[degb + i].divide( b[degb] ) )
        for (let c =0; c < degb + 1; c++) {
            temp[c + i] = temp[c + i].subtract( o[c] );
        }
      }
      return o.slice(0, deg(o) + 1);
    }

    let lm = new Array(this.degree + 1).fill(new Field2(this.bn.p, _0));
    lm[0] = new Field2(this.bn.p, _1);
    let hm = new Array(this.degree + 1).fill(new Field2(this.bn.p, _0));
    this.split();
    let low = this.s.slice();
    low.push(new Field2(this.bn.p, _0));
    let high = this.poly_coeffs.map((e) => new Field2(this.bn.p, e) ).slice();
    high.push(new Field2(this.bn.p, _1));

    let r;
    let nm; 
    let neww;

    while (deg(low)) {
      r = poly_div(high, low);
      r = r.concat(new Array(this.degree + 1 - r.length).fill(new Field2(this.bn.p, _0)));
      
      nm = hm.slice();
      neww = high.slice();

      for (let i = 0; i < this.degree + 1; i++) {
        for (let j = 0; j < this.degree + 1 - i; j++) {
          nm[i + j] = nm[i + j].subtract(lm[i].multiply(r[j]));
          neww[i + j] = neww[i + j].subtract(low[i].multiply(r[j]));
        }
      }
      
      let t1 = nm.slice();
      let t2 = neww.slice();
      let t3 = lm.slice();
      let t4 = low.slice();

      lm = t1;
      low = t2;
      hm = t3;
      high = t4;
    }

    return this.join(lm.slice(0, this.degree)).divide(low[0].re);
  }

  exp(k) {
    let w = this;
    for (let i = k.bitLength()-2; i >= 0; i--) {
        w = w.multiply(w);
        if (ExNumber.testBit(k, i)) {
            w = w.multiply(this);
        }
    }
    return w;
  }

  finExp() {
    return this.exp((this.bn.p.pow(12).subtract(_1)).divide(this.bn.n));
  }

  toString() {
    return '['+this.v[0].re.toString()+', '+this.v[0].im.toString()+', '+
    this.v[1].re.toString()+', '+this.v[1].im.toString()+', '+
    this.v[2].re.toString()+', '+this.v[2].im.toString()+', ' +
    this.v[3].re.toString()+', '+this.v[3].im.toString()+', '+
    this.v[4].re.toString()+', '+this.v[4].im.toString()+', '+
    this.v[5].re.toString()+', '+this.v[5].im.toString()+']';
  }
}

export { Field2, Field12 }