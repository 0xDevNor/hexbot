require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const schedule = require('node-schedule');

// Replace with your Telegram bot token
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Configuration for the cryptocurrency and investment
const COIN_ID = 'hex'; // CoinGecko ID for HEX
const INITIAL_INVESTMENT = 50000; // Initial investment amount in USD
const INVESTMENT_DATE = '2024-02-29'; // YYYY-MM-DD format

let chatIdForUpdates; // Variable to store the chat ID for updates

bot.onText(/\/start/, (msg) => {
    chatIdForUpdates = msg.chat.id;
    bot.sendMessage(chatIdForUpdates, "Welcome! I will keep you updated about your crypto investment.");
    console.log("Chat ID for updates set to:", chatIdForUpdates);
});

bot.onText(/\/update/, async (msg) => {
    await sendInvestmentUpdate(msg.chat.id);
});

schedule.scheduleJob('0 0 * * *', async () => {
    if (chatIdForUpdates) {
        await sendInvestmentUpdate(chatIdForUpdates);
    }
});

async function sendInvestmentUpdate(chatId) {
    try {
        const investmentInfo = await getInvestmentInfo();
        const message = `💰 Investment Update 💰\n` +
            `Initial Investment: $${investmentInfo.initialInvestment}\n` +
            `Initial Price: $${investmentInfo.initialPrice.toFixed(4)}\n` +
            `Current Price: $${investmentInfo.currentPrice.toFixed(4)}\n` +
            `Current Value: $${investmentInfo.currentValue.toFixed(4)}\n` +
            `Profit: $${investmentInfo.profit.toFixed(4)}\n` +
            `ROI: ${investmentInfo.roiPercentage.toFixed(4)}%`;
        bot.sendMessage(chatId, message);
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "An error occurred while fetching investment data.");
    }
}

async function getInvestmentInfo() {
    try {
        const historicalPrice = await fetchHistoricalPrice(COIN_ID, INVESTMENT_DATE);
        const currentPrice = await fetchCurrentPrice(COIN_ID);

        if (historicalPrice && currentPrice) {
            const currentValue = (currentPrice / historicalPrice) * INITIAL_INVESTMENT;
            const profit = currentValue - INITIAL_INVESTMENT;
            const roiPercentage = (profit / INITIAL_INVESTMENT) * 100;

            return {
                initialInvestment: INITIAL_INVESTMENT,
                initialPrice: historicalPrice,
                currentPrice: currentPrice,
                currentValue: currentValue,
                profit: profit,
                roiPercentage: roiPercentage
            };
        } else {
            throw new Error('Failed to fetch price data');
        }
    } catch (error) {
        console.error('Error in getInvestmentInfo:', error);
        throw error;
    }
}

async function fetchHistoricalPrice(coinId, date) {
    const formatDateString = date.split("-").reverse().join("-"); // Convert to DD-MM-YYYY format
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formatDateString}`;
    try {
        const response = await axios.get(url);
        return response.data.market_data.current_price.usd;
    } catch (error) {
        console.error('Error fetching historical price:', error);
        return null;
    }
}

async function fetchCurrentPrice(coinId) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    try {
        const response = await axios.get(url);
        return response.data[coinId].usd;
    } catch (error) {
        console.error('Error fetching current price:', error);
        return null;
    }
}

// Start the bot
bot.on('message', (msg) => {
    console.log(`Received message from ${msg.from.username}: ${msg.text}`);
});
