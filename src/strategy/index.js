import { config } from '../config/index.js';

export class TradingStrategy {
  constructor(indicators) {
    this.indicators = indicators;
    this.WEIGHTS = {
      SUPERTREND: 3,
      VWAP: 3,
      EMA: 3,
      ATR: 2,
      BOLLINGER: 2,
      KELTNER: 2,
      RSI: 2,
      MACD: 2,
      STOCH_RSI: 2
    };
  }

  async analyzeMarket(candles) {
    const prices = candles.map(c => c.close);
    const lastCandle = candles[candles.length - 1];
    const lastPrice = lastCandle.close;

    // Focus on core indicators
    const vwap = this.indicators.calculateVWAP(candles);
    const { shortEMA, longEMA } = this.indicators.calculateEMA(prices);
    const rsi = this.indicators.calculateRSI(prices);
    const bb = this.indicators.calculateBollingerBands(prices);
    const macd = this.indicators.calculateMACD(prices);
    const atr = this.indicators.calculateATR(candles);
    const keltner = this.indicators.calculateKeltnerChannels(candles);
    const supertrend = this.indicators.calculateSupertrend(candles);
    const stochRsi = this.indicators.calculateStochRSI(prices);

    // Get latest values
    const lastVWAP = vwap[vwap.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const lastBB = bb[bb.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastATR = atr[atr.length - 1];
    const lastKeltner = keltner[keltner.length - 1];
    const lastSupertrend = supertrend[supertrend.length - 1];
    const lastStochRSI = {
      k: stochRsi.k[stochRsi.k.length - 1],
      d: stochRsi.d[stochRsi.d.length - 1]
    };

    // Weighted Signal Generation
    const signals = {
      bullish: this.calculateWeightedSignals(
        lastPrice, lastVWAP, shortEMA, longEMA, lastRSI, 
        lastBB, lastMACD, lastATR, lastKeltner, 
        lastSupertrend, lastStochRSI, true
      ),
      bearish: this.calculateWeightedSignals(
        lastPrice, lastVWAP, shortEMA, longEMA, lastRSI, 
        lastBB, lastMACD, lastATR, lastKeltner, 
        lastSupertrend, lastStochRSI, false
      )
    };

    // Calculate stop loss and take profit based on ATR
    const stopLoss = lastPrice - (2 * lastATR);
    const takeProfit = lastPrice + (3 * lastATR);

    return {
      timestamp: lastCandle.timestamp,
      signals: signals,
      currentPrice: lastPrice,
      stopLoss,
      takeProfit,
      metrics: {
        vwap: lastVWAP,
        rsi: lastRSI,
        bb: lastBB,
        macd: lastMACD,
        atr: lastATR,
        keltner: lastKeltner,
        supertrend: lastSupertrend,
        stochRsi: lastStochRSI
      }
    };
  }

  calculateWeightedSignals(
    lastPrice, lastVWAP, shortEMA, longEMA, lastRSI, 
    lastBB, lastMACD, lastATR, lastKeltner, 
    lastSupertrend, lastStochRSI, isBullish
  ) {
    let weightedSignals = 0;

    // Supertrend
    if (isBullish && lastSupertrend.direction === 1 && lastPrice > lastVWAP)
      weightedSignals += this.WEIGHTS.SUPERTREND;
    else if (!isBullish && lastSupertrend.direction === -1 && lastPrice < lastVWAP)
      weightedSignals += this.WEIGHTS.SUPERTREND;

    // VWAP
    if (isBullish && lastPrice > lastVWAP && lastRSI > 50)
      weightedSignals += this.WEIGHTS.VWAP;
    else if (!isBullish && lastPrice < lastVWAP && lastRSI < 50)
      weightedSignals += this.WEIGHTS.VWAP;

    // EMA Crossover
    if (isBullish && shortEMA[shortEMA.length - 1] > longEMA[longEMA.length - 1])
      weightedSignals += this.WEIGHTS.EMA;
    else if (!isBullish && shortEMA[shortEMA.length - 1] < longEMA[longEMA.length - 1])
      weightedSignals += this.WEIGHTS.EMA;

    // Volatility Triggers
    if (isBullish && lastPrice <= lastBB.lower && lastRSI < 30)
      weightedSignals += this.WEIGHTS.BOLLINGER + this.WEIGHTS.ATR;
    else if (!isBullish && lastPrice >= lastBB.upper && lastRSI > 70)
      weightedSignals += this.WEIGHTS.BOLLINGER + this.WEIGHTS.ATR;

    // Keltner Channels
    if (isBullish && lastPrice <= lastKeltner.lower && lastRSI < 30)
      weightedSignals += this.WEIGHTS.KELTNER;
    else if (!isBullish && lastPrice >= lastKeltner.upper && lastRSI > 70)
      weightedSignals += this.WEIGHTS.KELTNER;

    // Momentum Indicators
    if (isBullish && lastRSI < 30)
      weightedSignals += this.WEIGHTS.RSI;
    else if (!isBullish && lastRSI > 70)
      weightedSignals += this.WEIGHTS.RSI;

    if (isBullish && lastMACD.MACD > lastMACD.signal)
      weightedSignals += this.WEIGHTS.MACD;
    else if (!isBullish && lastMACD.MACD < lastMACD.signal)
      weightedSignals += this.WEIGHTS.MACD;

    if (isBullish && lastStochRSI.k < 20 && lastStochRSI.k > lastStochRSI.d)
      weightedSignals += this.WEIGHTS.STOCH_RSI;
    else if (!isBullish && lastStochRSI.k > 80 && lastStochRSI.k < lastStochRSI.d)
      weightedSignals += this.WEIGHTS.STOCH_RSI;

    return weightedSignals;
  }

  generateSignal(analysis) {
    const { bullish, bearish } = analysis.signals;
    const totalWeight = Object.values(this.WEIGHTS).reduce((a, b) => a + b, 0);
    const minWeight = totalWeight * 0.6; // 60% of total possible weight

    if (bullish >= minWeight && bullish > bearish) {
      return {
        type: 'BUY',
        entry: analysis.currentPrice,
        stopLoss: analysis.stopLoss,
        takeProfit: analysis.takeProfit,
        confidence: bullish / totalWeight,
        timestamp: analysis.timestamp
      };
    }
    
    if (bearish >= minWeight && bearish > bullish) {
      return {
        type: 'SELL',
        entry: analysis.currentPrice,
        stopLoss: analysis.stopLoss,
        takeProfit: analysis.takeProfit,
        confidence: bearish / totalWeight,
        timestamp: analysis.timestamp
      };
    }
    
    return null;
  }
}