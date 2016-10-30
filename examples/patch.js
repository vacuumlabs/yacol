import {run} from 'yacol'

run(function*() {
  run(function*() {
    // Hey, how can I yield string FETCH_WEATHER? Run won't know how to execute this!
    const weather = yield run('FETCH_WEATHER', 'Bratislava')
    console.log(weather)
  })
}).patch(['FETCH_WEATHER', fakeWeather]) // Ah I see, here is the implementation! Nice!

function* fakeWeather(city) {
  return `It's always sunny in ${city}`
}
