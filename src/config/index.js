export const config = {
  finageApiKey: 'API_KEYb71526ULN20U45Z1KHNU3VRCNJ1YUU0N',
  pair: 'XAUUSD',
  timeframes: ['1', '2','5', '10','15'],
  riskPerTrade: 0.01,
  maxPositions: 3,
  indicators: {
    ema: {
      short: 5,
      long: 20
    },
    rsi: {
      period: 14,
      overbought: 70,
      oversold: 30
    },
    bollinger: {
      period: 20,
      stdDev: 2
    },
    macd: {
      fastPeriod: 3,
      slowPeriod: 8,
      signalPeriod: 5
    },
    atr: {
      period: 5
    },
    keltner: {
      period: 20,
      atrMultiplier: 2
    },
    supertrend: {
      period: 10,
      multiplier: 3
    },
    ichimoku: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26
    },
    parabolicSar: {
      step: 0.02,
      max: 0.2
    },
    fibonacci: {
      levels: [0.236, 0.382, 0.618]
    },
    adx: {
      period: 14
    },
    stochRsi: {
      rsiPeriod: 14,
      stochPeriod: 14,
      kPeriod: 3,
      dPeriod: 3
    },
    williamsR: {
      period: 14,
      overbought: -20,
      oversold: -80
    },
    vsa: {
      volumePeriod: 20
    }
  }
};
