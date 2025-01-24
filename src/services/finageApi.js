import axios from 'axios';
import moment from 'moment';
import { config } from '../config/index.js';

export class FinageAPI {
  constructor() {
    this.apiKey = config.finageApiKey;
    this.baseUrl = 'https://api.finage.co.uk';
  }

  async getForexDataForTimeframe(timeframe) {
    try {
      const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');
      
      const url = `${this.baseUrl}/agg/forex/${config.pair}/${timeframe}/minute/${yesterday}/${tomorrow}`;
      
      const response = await axios.get(url, {
        params: {
          apikey: this.apiKey,
          limit: 25000
        }
      });

      return {
        timeframe,
        data: this.formatData(response.data.results)
      };
    } catch (error) {
      console.error(`Error fetching forex data for ${timeframe}m:`, error.message);
      throw error;
    }
  }

  async getAllTimeframesData() {
    try {
      const promises = config.timeframes.map(timeframe => 
        this.getForexDataForTimeframe(timeframe)
      );
      
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching all timeframes:', error.message);
      throw error;
    }
  }

  formatData(data) {
    return data.map(candle => ({
      timestamp: new Date(candle.t),
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
      volume: candle.v
    }));
  }
}