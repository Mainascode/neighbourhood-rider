const DELIVERY_TABLE = {
  sunny: {
    morning: 100,
    daytime: 50,
    evening: 100,
    overnight: 100,
  },
  rainy: {
    morning: 120,
    daytime: 70,
    evening: 120,
    overnight: 120,
  },
};

export function getEatHour(date = new Date()) {
  const formatted = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    hour12: false,
  }).format(date);

  return Number(formatted);
}

export function getDeliveryWindow(date = new Date()) {
  const hour = getEatHour(date);

  if (hour >= 6 && hour < 9) {
    return "morning";
  }

  if (hour >= 9 && hour < 18) {
    return "daytime";
  }

  if (hour >= 18 && hour <= 22) {
    return "evening";
  }

  return "overnight";
}

export function calculateDeliveryFee({ weather = "sunny", date = new Date(), freeDelivery = false } = {}) {
  if (freeDelivery) {
    return {
      weather,
      timeWindow: getDeliveryWindow(date),
      fee: 0,
      isFreeDelivery: true,
    };
  }

  const normalizedWeather = weather === "rainy" ? "rainy" : "sunny";
  const timeWindow = getDeliveryWindow(date);

  return {
    weather: normalizedWeather,
    timeWindow,
    fee: DELIVERY_TABLE[normalizedWeather][timeWindow],
    isFreeDelivery: false,
  };
}
