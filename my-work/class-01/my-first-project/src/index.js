#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import open from 'open';
import { select, input } from '@inquirer/prompts';
import { fetchNews, TOPICS } from './newsService.js';
import { renderHeader, renderNewsList, renderArticleDetails } from './uiFormatter.js';

const program = new Command();

program
  .name('gnews')
  .description('A fast and stylish Command Line Interface for Google News')
  .version('1.0.0')
  .option('-t, --topic <topic>', 'Specify news topic (TOP, WORLD, NATION, BUSINESS, TECHNOLOGY, ENTERTAINMENT, SPORTS, SCIENCE, HEALTH)', 'TOP')
  .option('-s, --search <query>', 'Search news by keyword')
  .option('-l, --limit <number>', 'Number of news articles to show (max 30)', '10')
  .option('-i, --interactive', 'Run in interactive prompt mode')
  .option('-o, --open <number>', 'Directly open article number in default browser')
  .parse(process.argv);

const options = program.opts();

async function runInteractiveMenu(articles) {
  const choices = articles.map(art => ({
    name: `${art.id}. [${art.source}] ${art.title}`,
    value: art.id
  }));

  choices.push({ name: '🔍 New Search Query', value: 'SEARCH' });
  choices.push({ name: '🏷️ Change Topic / Category', value: 'TOPIC' });
  choices.push({ name: '🔄 Refresh News', value: 'REFRESH' });
  choices.push({ name: '❌ Exit', value: 'EXIT' });

  const selection = await select({
    message: 'Select an article to open in browser, or choose an action:',
    choices
  });

  if (selection === 'EXIT') {
    console.log(chalk.green('Goodbye! 👋'));
    process.exit(0);
  }

  if (selection === 'SEARCH') {
    const query = await input({ message: 'Enter search keyword:' });
    if (query.trim()) {
      return loadAndDisplayNews({ search: query, limit: parseInt(options.limit, 10) }, true);
    }
  }

  if (selection === 'TOPIC') {
    const topicChoices = Object.keys(TOPICS).map(key => ({
      name: key,
      value: key
    }));
    const chosenTopic = await select({
      message: 'Choose a news topic:',
      choices: topicChoices
    });
    return loadAndDisplayNews({ topic: chosenTopic, limit: parseInt(options.limit, 10) }, true);
  }

  if (selection === 'REFRESH') {
    return loadAndDisplayNews(options, true);
  }

  const selectedArticle = articles.find(a => a.id === selection);
  if (selectedArticle) {
    renderArticleDetails(selectedArticle);
    const action = await select({
      message: `Action for article #${selectedArticle.id}:`,
      choices: [
        { name: '🌐 Open link in browser', value: 'OPEN' },
        { name: '⬅️ Back to list', value: 'BACK' }
      ]
    });

    if (action === 'OPEN') {
      console.log(chalk.cyan(`Opening: ${selectedArticle.link}`));
      await open(selectedArticle.link);
    }
    return runInteractiveMenu(articles);
  }
}

async function loadAndDisplayNews(opts, forceInteractive = false) {
  const spinner = ora({
    text: 'Fetching latest news from Google News...',
    color: 'cyan'
  }).start();

  try {
    const limit = Math.min(Math.max(parseInt(opts.limit || '10', 10), 1), 30);
    const topic = (opts.topic || 'TOP').toUpperCase();
    const search = opts.search || null;

    const data = await fetchNews({ topic, search, limit });
    spinner.succeed('Google News loaded successfully!\n');

    renderHeader(topic, search);
    renderNewsList(data.items);

    if (opts.open) {
      const artNum = parseInt(opts.open, 10);
      const articleToOpen = data.items.find(a => a.id === artNum);
      if (articleToOpen) {
        console.log(chalk.cyan(`Opening article #${artNum} in browser: ${articleToOpen.link}`));
        await open(articleToOpen.link);
      } else {
        console.log(chalk.yellow(`Article #${artNum} not found.`));
      }
    }

    if (opts.interactive || forceInteractive || (!opts.search && opts.topic === 'TOP' && !opts.open && process.stdout.isTTY)) {
      await runInteractiveMenu(data.items);
    }
  } catch (error) {
    spinner.fail('Error fetching Google News');
    console.error(chalk.red(`Error details: ${error.message}`));
    process.exit(1);
  }
}

// Entry point
loadAndDisplayNews(options);
