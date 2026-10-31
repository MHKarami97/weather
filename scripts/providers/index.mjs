import { MetNoProvider } from './met-no.mjs'
import { OpenMeteoProvider } from './open-meteo.mjs'
import { OpenWeatherProvider } from './openweather.mjs'
import { PirateWeatherProvider } from './pirate-weather.mjs'
import { TomorrowIoProvider } from './tomorrow-io.mjs'
import { WeatherApiProvider } from './weatherapi.mjs'

const PROVIDER_CLASSES = [
  OpenMeteoProvider,
  MetNoProvider,
  OpenWeatherProvider,
  WeatherApiProvider,
  PirateWeatherProvider,
  TomorrowIoProvider,
]

export const createProviders = (env = process.env) => PROVIDER_CLASSES.map((Provider) => new Provider(env))
