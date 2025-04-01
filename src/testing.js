const { Client, IntentsBitField, ActivityType, Collection, MessageFlags, WebhookClient } = require('discord.js');
const client = require('./globals/Client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
require('./autoresponses');

console.log(process.env.DISCORD_TOKEN);