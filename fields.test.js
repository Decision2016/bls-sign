
import CryptoRandom from './src/pairing/Rnd'
import {Point2} from './src/pairing/Points'
import Parameters from './src/pairing/Parameters'
import {Field2, Field12} from './src/pairing/Fields'
import {Curve, Curve2} from './src/pairing/Curves'
import Pairing from './src/pairing/Pairing'
import bigInt from 'big-integer'
describe('Fields', () => {
  test('Field without extensions test', () => {

    //const bn = new Parameters(256);

    const bn = new Parameters(192);

    const _2 = new Field2( bn.p, bigInt('2') )
    const _3 = new Field2( bn.p, bigInt('3') );
    const _4 = new Field2( bn.p, bigInt('4') );
    const _7 = new Field2( bn.p, bigInt('7') );
    const _9 = new Field2( bn.p, bigInt('9') );
    const _11 = new Field2( bn.p, bigInt('11'));

    const sqrt11 = _11.sqrt();

    console.log('sqrt11', sqrt11);

    expect (_11.eq(sqrt11.multiply(sqrt11))).toBeTruthy();
    // 2 * 2 == 4
    expect( _2.multiply(_2).eq(_4) ).toBeTruthy();
    // 2/7+9/7 == 11/7
    expect( _2.divide(_7).add(_9.divide(_7)).eq( _11.divide(_7) )  ).toBeTruthy();
    // 2*7+9*7 == 11*7
    expect( _2.multiply(_7).add(_9.multiply(_7)).eq( _11.multiply(_7) )).toBeTruthy();
    expect( _9.exp(bn.p).eq(_9) ).toBeTruthy();
    
  });

  test('Field extension 2 test', () => {
    const bn = new Parameters(256);
    const _0 = bigInt('0')
    const _1 = bigInt('1')
    const _2 = bigInt('2')
    const x = new Field2(bn.p, _1, _0, false);
    const f = new Field2(bn.p, _1, _2, false);
    const fpx = new Field2(bn.p, _2, _2, false);
    const one = new Field2(bn.p, _1, bigInt.zero, false);
    expect(x.add(f).eq(fpx)).toBeTruthy();
    expect( f.divide( f ).eq( one ) ).toBeTruthy();
    // one / f + x / f == (one + x) / f
    console.log('p', bn.p.toString())

    expect(one.divide(f).add(x.divide(f)).eq(one.add(x).divide(f))).toBeTruthy();
    // one * f + x * f == (one + x) * f
    expect(one.multiply(f).add(x.multiply(f)).eq( one.add(x).multiply(f) )  ).toBeTruthy();
    // x ** (field_modulus ** 2 - 1) == one
    expect(x.exp(bn.p.pow(_2).subtract(_1) ).eq(one) ).toBeTruthy();
  })

  test('Field extension 12 test', () => {

    const bn = new Parameters(256);

    const _0 = bigInt('0')
    const _1 = bigInt('1')
    const _2 = bigInt('2')
   
    const x = new Field12(bn, [
      new Field2(bn.p, _1, _0, false),
      new Field2(bn.p, _0, _0, false),
      new Field2(bn.p, _0, _0, false),
      new Field2(bn.p, _0, _0, false),
      new Field2(bn.p, _0, _0, false),
      new Field2(bn.p, _0, _0, false),
    ]);

    const f = new Field12(bn, [
      new Field2(bn.p, _1, _2, false),
      new Field2(bn.p, bigInt('3'), bigInt('4'), false),
      new Field2(bn.p, bigInt('5'), bigInt('6'), false),
      new Field2(bn.p, bigInt('7'), bigInt('8'), false),
      new Field2(bn.p, bigInt('9'), bigInt('10'), false),
      new Field2(bn.p, bigInt('11'), bigInt('12'), false),
    ]);

    const fpx = new Field12(bn, [
      new Field2(bn.p, _2, _2, false),
      new Field2(bn.p, bigInt('3'), bigInt('4'), false),
      new Field2(bn.p, bigInt('5'), bigInt('6'), false),
      new Field2(bn.p, bigInt('7'), bigInt('8'), false),
      new Field2(bn.p, bigInt('9'), bigInt('10'), false),
      new Field2(bn.p, bigInt('11'), bigInt('12'), false),
    ]);

    const one = new Field12(bn, _1);

    expect(x.one()).toBeTruthy();

    expect(x.add(f).eq(fpx)).toBeTruthy();
    expect( f.divide( f ).eq( one ) ).toBeTruthy();
    // one / f + x / f == (one + x) / f

    console.log('f.inv()', f.inverse().toString())
    console.log('f.inv().inv()', f.inverse().inverse().toString())

    expect(one.divide(f).add(x.divide(f)).eq(one.add(x).divide(f))).toBeTruthy();
    // one * f + x * f == (one + x) * f
    expect(one.multiply(f).add(x.multiply(f)).eq( one.add(x).multiply(f) )  ).toBeTruthy();
    // x ** (field_modulus ** 2 - 1) == one
    expect(x.exp(bn.p.pow(_2).subtract(_1) ).eq(one) ).toBeTruthy();

  })

});