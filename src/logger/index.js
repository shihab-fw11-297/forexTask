import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/trades.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export class TradeLogger {
  static logSignal(signal) {
    logger.info('Trade Signal Generated', {
      timeframe: signal.timeframe,
      type: signal.type,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      confidence: signal.confidence,
      timestamp: signal.timestamp
    });
  }

  static logError(error) {
    logger.error('Error occurred', { error: error.message, stack: error.stack });
  }

  static logMarketAnalysis(analysis) {
    logger.info('Market Analysis', {
      timeframe: analysis.timeframe,
      timestamp: analysis.timestamp,
      price: analysis.currentPrice,
      metrics: analysis.metrics,
      signals: analysis.signals
    });
  }
}