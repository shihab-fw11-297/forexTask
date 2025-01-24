import { EMA, RSI, BollingerBands, MACD, ATR } from 'technicalindicators';
import { config } from '../config/index.js';

export class TechnicalIndicators {
  calculateVWAP(candles) {
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    return candles.map(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const TPV = typicalPrice * candle.volume;
      
      cumulativeTPV += TPV;
      cumulativeVolume += candle.volume;
      
      return cumulativeTPV / cumulativeVolume;
    });
  }

  calculateEMA(prices) {
    const shortEMA = EMA.calculate({
      period: config.indicators.ema.short,
      values: prices
    });

    const longEMA = EMA.calculate({
      period: config.indicators.ema.long,
      values: prices
    });

    return { shortEMA, longEMA };
  }

  calculateRSI(prices) {
    return RSI.calculate({
      period: config.indicators.rsi.period,
      values: prices
    });
  }

  calculateBollingerBands(prices) {
    return BollingerBands.calculate({
      period: config.indicators.bollinger.period,
      values: prices,
      stdDev: config.indicators.bollinger.stdDev
    });
  }

  calculateMACD(prices) {
    return MACD.calculate({
      fastPeriod: config.indicators.macd.fastPeriod,
      slowPeriod: config.indicators.macd.slowPeriod,
      signalPeriod: config.indicators.macd.signalPeriod,
      values: prices
    });
  }

  calculateATR(candles) {
    return ATR.calculate({
      period: config.indicators.atr.period,
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close)
    });
  }

  calculateKeltnerChannels(candles) {
    const { period, atrMultiplier } = config.indicators.keltner;
    const prices = candles.map(c => c.close);
    const atr = this.calculateATR(candles);
    const ema = EMA.calculate({ period, values: prices });

    return ema.map((middle, i) => ({
      upper: middle + (atr[i] * atrMultiplier),
      middle,
      lower: middle - (atr[i] * atrMultiplier)
    }));
  }

  calculateSupertrend(candles) {
    const { period, multiplier } = config.indicators.supertrend;
    const atr = this.calculateATR(candles);
    
    // Initialize arrays for trend calculation
    const trend = new Array(period).fill(null); // Fill initial period with null values
    
    // Start calculation from period onwards
    for (let i = period; i < candles.length; i++) {
      const currentCandle = candles[i];
      const currentATR = atr[i] || atr[atr.length - 1]; // Use last ATR if current is undefined
      
      // Calculate basic bands
      const basicUpperBand = (currentCandle.high + currentCandle.low) / 2 + multiplier * currentATR;
      const basicLowerBand = (currentCandle.high + currentCandle.low) / 2 - multiplier * currentATR;
      
      // Initialize first trend value
      if (i === period) {
        trend[i] = {
          upper: basicUpperBand,
          lower: basicLowerBand,
          supertrend: currentCandle.close > basicUpperBand ? basicLowerBand : basicUpperBand,
          direction: currentCandle.close > basicUpperBand ? 1 : -1
        };
        continue;
      }
      
      // Get previous trend values
      const prevTrend = trend[i - 1];
      if (!prevTrend) continue;
      
      // Calculate final bands
      const finalUpperBand = 
        basicUpperBand < prevTrend.upper || candles[i - 1].close > prevTrend.upper
          ? basicUpperBand 
          : prevTrend.upper;
          
      const finalLowerBand = 
        basicLowerBand > prevTrend.lower || candles[i - 1].close < prevTrend.lower
          ? basicLowerBand 
          : prevTrend.lower;
      
      // Calculate Supertrend value
      let supertrend;
      if (prevTrend.supertrend === prevTrend.upper) {
        supertrend = currentCandle.close < finalUpperBand ? finalUpperBand : finalLowerBand;
      } else {
        supertrend = currentCandle.close > finalLowerBand ? finalLowerBand : finalUpperBand;
      }
      
      // Store calculated values
      trend[i] = {
        upper: finalUpperBand,
        lower: finalLowerBand,
        supertrend: supertrend,
        direction: supertrend === finalLowerBand ? 1 : -1
      };
    }
    
    // Remove null values from the beginning
    return trend.filter(t => t !== null);
  }

  calculateIchimoku(candles) {
    const { conversionPeriod, basePeriod, spanPeriod, displacement } = config.indicators.ichimoku;
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    const tenkanSen = [];
    const kijunSen = [];
    const senkouSpanA = [];
    const senkouSpanB = [];
    const chikouSpan = closes.map((_, i) => i + displacement < closes.length ? closes[i] : null);

    for (let i = conversionPeriod - 1; i < highs.length; i++) {
      const conversionHigh = Math.max(...highs.slice(i - conversionPeriod + 1, i + 1));
      const conversionLow = Math.min(...lows.slice(i - conversionPeriod + 1, i + 1));
      tenkanSen.push((conversionHigh + conversionLow) / 2);

      if (i >= basePeriod - 1) {
        const baseHigh = Math.max(...highs.slice(i - basePeriod + 1, i + 1));
        const baseLow = Math.min(...lows.slice(i - basePeriod + 1, i + 1));
        kijunSen.push((baseHigh + baseLow) / 2);

        if (tenkanSen.length >= displacement && kijunSen.length >= displacement) {
          senkouSpanA.push((tenkanSen[tenkanSen.length - displacement] + kijunSen[kijunSen.length - displacement]) / 2);
        }
      }

      if (i >= spanPeriod - 1) {
        const spanHigh = Math.max(...highs.slice(i - spanPeriod + 1, i + 1));
        const spanLow = Math.min(...lows.slice(i - spanPeriod + 1, i + 1));
        senkouSpanB.push((spanHigh + spanLow) / 2);
      }
    }

    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan
    };
  }

  calculateParabolicSAR(candles) {
    const { step, max } = config.indicators.parabolicSar;
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    let acceleration = step;
    let isLong = true;
    let sar = lows[0];
    let extremePoint = highs[0];
    const result = [sar];

    for (let i = 1; i < candles.length; i++) {
      sar = sar + acceleration * (extremePoint - sar);

      if (isLong) {
        if (lows[i] < sar) {
          isLong = false;
          sar = Math.max(...highs.slice(Math.max(0, i-5), i+1));
          extremePoint = lows[i];
          acceleration = step;
        } else {
          if (highs[i] > extremePoint) {
            extremePoint = highs[i];
            acceleration = Math.min(acceleration + step, max);
          }
        }
      } else {
        if (highs[i] > sar) {
          isLong = true;
          sar = Math.min(...lows.slice(Math.max(0, i-5), i+1));
          extremePoint = highs[i];
          acceleration = step;
        } else {
          if (lows[i] < extremePoint) {
            extremePoint = lows[i];
            acceleration = Math.min(acceleration + step, max);
          }
        }
      }

      result.push(sar);
    }

    return result;
  }

  calculateFibonacciLevels(high, low) {
    const diff = high - low;
    return config.indicators.fibonacci.levels.map(level => ({
      level,
      price: high - (diff * level)
    }));
  }

  calculateADX(candles) {
    const { period } = config.indicators.adx;
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    const tr = [0];
    const plusDM = [0];
    const minusDM = [0];
    
    for (let i = 1; i < candles.length; i++) {
      const highDiff = highs[i] - highs[i-1];
      const lowDiff = lows[i-1] - lows[i];
      
      tr.push(Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i-1]),
        Math.abs(lows[i] - closes[i-1])
      ));
      
      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    }
    
    const smoothedTR = this.wilder(tr, period);
    const smoothedPlusDM = this.wilder(plusDM, period);
    const smoothedMinusDM = this.wilder(minusDM, period);
    
    const plusDI = smoothedPlusDM.map((dm, i) => 100 * dm / smoothedTR[i]);
    const minusDI = smoothedMinusDM.map((dm, i) => 100 * dm / smoothedTR[i]);
    
    const dx = plusDI.map((plus, i) => 
      100 * Math.abs(plus - minusDI[i]) / (plus + minusDI[i])
    );
    
    const adx = this.wilder(dx, period);
    
    return {
      adx,
      plusDI,
      minusDI
    };
  }

  calculateStochRSI(prices) {
    const { rsiPeriod, stochPeriod, kPeriod, dPeriod } = config.indicators.stochRsi;
    const rsi = this.calculateRSI(prices);
    const stochRsi = [];
    
    for (let i = stochPeriod - 1; i < rsi.length; i++) {
      const rsiWindow = rsi.slice(i - stochPeriod + 1, i + 1);
      const highRsi = Math.max(...rsiWindow);
      const lowRsi = Math.min(...rsiWindow);
      const k = 100 * (rsi[i] - lowRsi) / (highRsi - lowRsi);
      stochRsi.push(k);
    }
    
    const k = EMA.calculate({ period: kPeriod, values: stochRsi });
    const d = EMA.calculate({ period: dPeriod, values: k });
    
    return { k, d };
  }

  calculateWilliamsR(candles) {
    const { period } = config.indicators.williamsR;
    const result = [];
    
    for (let i = period - 1; i < candles.length; i++) {
      const highestHigh = Math.max(...candles.slice(i - period + 1, i + 1).map(c => c.high));
      const lowestLow = Math.min(...candles.slice(i - period + 1, i + 1).map(c => c.low));
      const r = ((highestHigh - candles[i].close) / (highestHigh - lowestLow)) * -100;
      result.push(r);
    }
    
    return result;
  }

  calculateVSA(candles) {
    const { volumePeriod } = config.indicators.vsa;
    const result = [];
    
    for (let i = volumePeriod - 1; i < candles.length; i++) {
      const volumeMA = candles
        .slice(i - volumePeriod + 1, i + 1)
        .reduce((sum, c) => sum + c.volume, 0) / volumePeriod;
      
      const spread = candles[i].high - candles[i].low;
      const close = candles[i].close;
      const volume = candles[i].volume;
      
      result.push({
        volumeRatio: volume / volumeMA,
        spread,
        close,
        isWidespread: spread > (spread * 1.5),
        isHighVolume: volume > (volumeMA * 1.5)
      });
    }
    
    return result;
  }

  wilder(values, period) {
    const result = [values[0]];
    const multiplier = (period - 1) / period;
    
    for (let i = 1; i < values.length; i++) {
      result.push(values[i] * (1/period) + result[i-1] * multiplier);
    }
    
    return result;
  }
}