export type WeatherForecastDay = {
  date: string;
  temperatureC: number;
  description: string;
  iconUrl: string;
};

export type WeatherSnapshot = {
  city: string;
  country: string;
  current: {
    temperatureC: number;
    description: string;
    humidity: number;
    windSpeed: number;
    iconUrl: string;
  };
  forecast: WeatherForecastDay[];
};

export type FavoriteCity = {
  id: number;
  city: string;
  createdAt: string;
};
