import schedule from 'node-schedule';
import { FinageAPI } from './services/finageApi.js';
import { TechnicalIndicators } from './indicators/index.js';
import { TradingStrategy } from './strategy/index.js';
import { TradeLogger } from './logger/index.js';

// Initialize components
const finageAPI = new FinageAPI();
const indicators = new TechnicalIndicators();
const strategy = new TradingStrategy(indicators);

async function analyzeTimeframe(timeframeData) {
  try {
    const analysis = await strategy.analyzeMarket(timeframeData.data);
    const signal = strategy.generateSignal(analysis);
    
    console.log(`\n=== ${timeframeData.timeframe}m Timeframe Analysis ===`);
    console.log('Current Price:', analysis.currentPrice);
    console.log('Signals:', analysis.signals);
    console.log('RSI:', analysis.metrics.rsi);
    console.log('MACD:', analysis.metrics.macd);
    
    if (signal) {
      console.log('\nTrade Signal Generated:');
      console.log('Type:', signal.type);
      console.log('Entry:', signal.entry);
      console.log('Stop Loss:', signal.stopLoss);
      console.log('Take Profit:', signal.takeProfit);
      console.log('Confidence:', signal.confidence);
      
      // TradeLogger.logSignal({ ...signal, timeframe: timeframeData.timeframe });
    }
    
    // TradeLogger.logMarketAnalysis({
    //   ...analysis,
    //   timeframe: timeframeData.timeframe
    // });
    
  } catch (error) {
    TradeLogger.logError(error);
  }
}

async function runTradingBot() {
  try {
    const allTimeframesData = await finageAPI.getAllTimeframesData();
    
    for (const timeframeData of allTimeframesData) {
      await analyzeTimeframe(timeframeData);
    }
  } catch (error) {
    TradeLogger.logError(error);
  }
}

// Schedule the bot to run every minute
schedule.scheduleJob('* * * * *', runTradingBot);

// Initial run
runTradingBot();

console.log('Multi-timeframe Forex Trading Bot Started...');
