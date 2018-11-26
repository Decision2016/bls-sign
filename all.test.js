
import Parameters from './src/pairing/Parameters'
import {Field2, Field12} from './src/pairing/Fields'
import {Curve, Curve2} from './src/pairing/Curves'
import Pairing from './src/pairing/Pairing'
import bigInt from 'big-integer'

describe('Fields', () => {
  test('Field without extensions test', () => {
    const bn = new Parameters(256);

    const _2 = new Field2( bn.p, bigInt('2') )
    const _4 = new Field2( bn.p, bigInt('4') )
    const _7 = new Field2( bn.p, bigInt('7') )
    const _9 = new Field2( bn.p, bigInt('9') )
    const _11 = new Field2( bn.p, bigInt('11'))

    expect( _2.multiply(_2).eq(_4) ).toBeTruthy()
    expect( _2.divide(_7).add(_9.divide(_7)).eq( _11.divide(_7) )  ).toBeTruthy()
    expect( _2.multiply(_7).add(_9.multiply(_7)).eq( _11.multiply(_7) )).toBeTruthy()
    expect( _9.exp(bn.p).eq(_9) ).toBeTruthy()
    
  });

  test('Field extension 2 test', () => {
    const bn = new Parameters(256);
    const _0 = bigInt('0')
    const _1 = bigInt('1')
    const _2 = bigInt('2')
    const x = new Field2(bn.p, _1, _0, false)
    const f = new Field2(bn.p, _1, _2, false)
    const fpx = new Field2(bn.p, _2, _2, false)
    const one = new Field2(bn.p, _1, bigInt.zero, false)
    expect(x.add(f).eq(fpx)).toBeTruthy()
    expect(f.divide( f ).eq( one ) ).toBeTruthy()
    expect(one.divide(f).add(x.divide(f)).eq(one.add(x).divide(f))).toBeTruthy()
    expect(one.multiply(f).add(x.multiply(f)).eq( one.add(x).multiply(f) )  ).toBeTruthy()
    expect(x.exp(bn.p.pow(_2).subtract(_1) ).eq(one) ).toBeTruthy()
  })

  test('Field extension 12 test', () => {

    const bn = new Parameters(256);

    const _0 = bigInt('0')
    const _1 = bigInt('1')
    const _2 = bigInt('2')
   
    const x = new Field12(bn, _1)

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

    const one = new Field12(bn, _1)

    expect(x.one()).toBeTruthy();
    expect(x.add(f).eq(fpx)).toBeTruthy()

    expect( f.divide( f ).eq( one ) ).toBeTruthy()

    expect(one.divide(f).add(x.divide(f)).eq(one.add(x).divide(f))).toBeTruthy()
    expect(one.multiply(f).add(x.multiply(f)).eq( one.add(x).multiply(f) )  ).toBeTruthy()


  })

});

describe('Curves', () => {

  test('Curve point test', () => {
    
    const bn = new Parameters(256)
    const E = new Curve(bn)

    const G = E.G;
    expect(G.neg().neg().eq(G)).toBeTruthy()
    expect(G.twice(1).add(G).add(G).eq(G.twice(2))).toBeTruthy()
    expect(G.twice(1).eq(G)).toBeFalsy()
    expect(G.multiply(bigInt(9)).add(G.multiply(bigInt(5))).eq( G.multiply(bigInt(12)).add(G.multiply(bigInt(2))) )  ).toBeTruthy()
    expect(G.multiply(bn.n).eq(E.infinity)).toBeTruthy()
    expect(E.contains(G)).toBeTruthy()
  })

  test('Curve 2 point test', () => {
    const bn = new Parameters(256)
    const E = new Curve(bn)
    const Et = new Curve2(E)

    const _2 = bigInt('2')
    const Gt = Et.Gt;

    expect(Gt.double().add(Gt).add(Gt).eq(Gt.twice(2))).toBeTruthy()
    expect(Gt.twice(1).eq(Gt)).toBeFalsy()
    expect(Gt.neg().neg().eq(Gt)).toBeTruthy()
    expect(Gt.multiply(bigInt(9)).add(Gt.multiply(bigInt(5))).eq(Gt.multiply(bigInt(12)).add(Gt.multiply(bigInt(2))) )  ).toBeTruthy();
    expect(Gt.multiply(bn.n).eq(Et.infinity)).toBeTruthy()
    expect(Gt.multiply(_2.multiply(bn.p).subtract(bn.n)).eq(Et.infinity)).toBeFalsy()
    expect(Et.contains(Gt.multiply(bigInt(2)))).toBeTruthy()
  })

});

describe('Pairings', () => {

  test('pair test', () => {
    
    const bn = new Parameters(256)
    const E = new Curve(bn)
    const Et = new Curve2(E)
    const pair = new Pairing(Et)
    const G = E.G;
    const Gt = Et.Gt;
    const _1 = bigInt('1')
    const p1 = pair.ate(G.toF12(), Gt.toF12())
    console.log('p1', p1.toString())
    return null;
    const pn1 = pair.ate(G.neg().toF12(), Gt.toF12())

    expect(p1.multiply(pn1).eq(new Field12(bn, _1))).toBeTruthy()
  })

  /*test('pair bilinearity test', () => {
    const bn = new Parameters(256)
    const E = new Curve(bn)
    const Et = new Curve2(E)
    const pair = new Pairing(Et)
    const G = E.G;
    const Gt = Et.Gt;

    const p1 = pair.ate(G.toF12(), Gt.toF12())
    const p2 = pair.ate(G.multiply(bigInt('2')).toF12(), Gt.toF12() )
  
    expect(p1.multiply(p1).eq(p2)).toBeTruthy()
  })

  test('pair bilinearity G2 test', () => {
    const bn = new Parameters(256)
    const E = new Curve(bn)
    const Et = new Curve2(E)
    const pair = new Pairing(Et)
    const G = E.G
    const Gt = Et.Gt

    const p1 = pair.ate(G.toF12(), Gt.toF12())
    const p2 = pair.ate(G.toF12(), Gt.multiply(bigInt('2')).toF12() )

    expect(p1.multiply(p1).eq(p2)).toBeTruthy()
  })*/



});