# Discord Bot Deployment Guide for Render.com

This guide will help you deploy your Discord bot on Render.com to keep it running 24/7.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Your Discord bot token, Client ID, and Guild ID
3. A PostgreSQL database (either using Render.com's managed database or an external one like Neon)

## Deployment Steps

### Step 1: Create a PostgreSQL Database

If you don't already have one:
1. Log in to Render.com
2. Go to Dashboard > New > PostgreSQL
3. Fill in the required fields:
   - Name: `discord-bot-db` (or any name you prefer)
   - Database: `discord_bot`
   - User: Choose a username
   - Region: Choose a region close to your users
4. Click "Create Database"
5. Once created, take note of the "Internal Database URL" or "External Database URL"

### Step 2: Deploy Your Web Service

1. From the Render dashboard, click "New" > "Web Service"
2. Connect your GitHub repository
3. Configure the following settings:
   - Name: `discord-bot` (or any name you prefer)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: Choose a plan that fits your needs (Starter is suitable for most bots)

### Step 3: Set Up Environment Variables

Add the following environment variables:
1. `DISCORD_TOKEN`: Your Discord bot token
2. `CLIENT_ID`: Your Discord application client ID
3. `GUILD_ID`: Your Discord server ID
4. `DATABASE_URL`: The database URL from Step 1
5. `NODE_VERSION`: 18.18.0

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your bot
3. Once deployed, your bot should be online and connected to Discord

## Health Check and Monitoring

- The bot includes a health check endpoint at `/health` that Render.com uses to monitor the service
- You can view application logs in the Render dashboard to troubleshoot any issues
- The status endpoint at `/status` provides information about the bot's current state

## Updating Your Bot

When you push changes to your GitHub repository, Render.com will automatically rebuild and redeploy your bot.

## Need Help?

If you encounter any issues during deployment, refer to the [Render.com documentation](https://render.com/docs) or reach out to Render support.