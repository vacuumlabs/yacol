import {run} from 'yacol'
import {assert} from 'chai'

function* getWeather(city) {
  // do some computation here
  return // some result
}

const cor = run(function*() {
  const weatherBa = yield run(getWeather, 'Bratislava')
  const weatherVi = yield run(getWeather, 'Vienna')
  return `${weatherBa} in Bratislava, ${weatherVi} in Vienna`
}).inspect()

run(function*() {
  let effect
  effect = yield cor.getEffect()
  assert.deepEqual(effect, {runnable: getWeather, args: ['Bratislava']})
  cor.step('sunny')
  effect = yield cor.getEffect()
  assert.deepEqual(effect, {runnable: getWeather, args: ['Vienna']})
  cor.step('rainy')
  effect = yield cor.getEffect()
  assert.deepEqual(effect, {value: 'sunny in Bratislava, rainy in Vienna', done: true})
})

