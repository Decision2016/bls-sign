const {BLSSigner, BLSSecretKey, BLSSignature, BLSPublicKey} =  require( './src/index' )

const signer = new BLSSigner(256)

const Q = signer.getRandomPointOnE()
const H = signer.getRandomPointOnEt()

// next tests with desctiption as follow
console.log('-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-')
console.log(' BLS Signature over EC pairings')
console.log('  Q - fixed global ')
console.log('  s - secret key ')
console.log('  sQ - public key ')
console.log('  H - message hash on G1 ')
console.log('  sH - signature ')
console.log('  e: G1 x G2 -> Fp12')
console.log('  sign(H, s) -> sH')
console.log('  verify(H, sQ, sH) -> e(sQ, H(m)) = e(Q, s H(m)<br><br>')
console.log('-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-')

console.time('sign')
const s = new BLSSecretKey()

console.log('s', s)
const sQ = new BLSPublicKey(s, Q)
console.log('sQ', sQ)
const sH = s.sign(H)
console.log('sH', sH)
const sH2 = new BLSSecretKey().sign(H)
console.log('sH2', sH2)
console.log('\x1b[37m', ' Q  = (' + (Q.x) + ', ' + (Q.y) + ', ' + (Q.z) + ')')
console.log('\x1b[37m', ' sQ = (' + (sQ.sQ.x) + ', ' + (sQ.sQ.y) + ', ' + (sQ.sQ.z) + ')')
console.log('\x1b[37m', ' H  = (' + (H.x.re) + ', ' + (H.y.re) + ', ' + (H.z.re) + ')')
console.log('\x1b[37m', ' sH = (' + (sH.sH.x.re) + ', ' + (sH.sH.y.re) + ', ' + (sH.sH.z.re) + ')')
console.log('\x1b[33m', ' Verify(Q,sQ,H,sH) = ' + signer.verify(Q, H, sQ, sH) + '')
console.log('\x1b[31m', ' Verify(Q,sQ,H,s2H) = ' + signer.verify(Q, H, sQ, sH2) + '')

console.timeEnd('sign')

console.log('\x1b[32m', '-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+**+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-+*+-')

/*
 * Start testing threshold signature (k, n) - (3, 5)
 */

const n = 5
const k = 3

let prv0 = new BLSSecretKey()
let sig0 = new BLSSignature()

sig0 = prv0.sign(H)

let pub0 =  new BLSPublicKey(prv0, Q)

let vec = prv0.share(n, k)

let signVec = new Array(n)

for (let i = 0; i < n; i++) {
  let H = signer.getRandomPointOnEt()
  signVec[i] = vec[i].sign(H)

  let pub = new BLSPublicKey(vec[i], Q)
  if (pub == pub0) {
    throw new Error('error pub key')
  }
  if (!signer.verify(Q, H, pub, signVec[i])) {
    throw Error('verify error')
  } else {
    console.log('true in index')
  }
}

// 3-n
let prvVec = new Array(3)
prvVec[0] = vec[0]
prvVec[1] = vec[1]
prvVec[2] = vec[2]

let prv = new BLSSecretKey()
prv.recover(prvVec)
if (!prv.s.equals(prv0.s)) {
  throw Error('Error wrong shares')
}

// n-n
prv = new BLSSecretKey()
prv.recover(vec)
if (!prv.s.equals(prv0.s)) {
  throw Error('Error: wrong shares')
}

// 2-n (n = 5)
prvVec = new Array(2)
prvVec[0] = vec[0]
prvVec[1] = vec[1]
prv = new BLSSecretKey()
prv.recover(prvVec)
if (prv.s.equals(prv0.s)) {
  throw Error('Error: shares 2-5 equal original key!')
}

let signArray = new Array(3)
signArray[0] = signVec[0]
signArray[1] = signVec[1]
signArray[2] = signVec[2]

let sig = new BLSSignature()
sig.recover(signArray, signer.getCurve2())

if (!sig.sH.eq(sig0.sH)) {
  throw Error('Error: can\'t recover signature!')
}

// 2-5 recover doesn't work
signArray = new Array(2)
signArray[0] = signVec[0]
signArray[1] = signVec[1]

sig.recover(signArray, signer.getCurve2())

if (sig.sH.eq(sig0.sH)) {
  throw Error('Error: unlikely we can recover 2-n signature!');
}