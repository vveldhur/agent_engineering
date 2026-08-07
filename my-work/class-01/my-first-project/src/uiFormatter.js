import chalk from 'chalk';

/**
 * Calculates human-readable relative time (e.g. "15m ago", "2h ago").
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Renders header for the CLI app.
 */
export function renderHeader(topicName = 'Top Stories', query = null) {
  console.clear();
  const line = '═'.repeat(60);
  console.log(chalk.cyan.bold(line));
  console.log(
    chalk.bgCyan.black.bold(' 📰 GOOGLE NEWS CLI ') + 
    chalk.bold.white(`  │  ${query ? `Search: "${query}"` : `Category: ${topicName}`}`)
  );
  console.log(chalk.cyan.bold(line));
  console.log(chalk.gray(` Updated: ${new Date().toLocaleString()}\n`));
}

/**
 * Renders news items list.
 */
export function renderNewsList(items) {
  if (!items || items.length === 0) {
    console.log(chalk.yellow('⚠️  No news articles found. Try another search query or topic.'));
    return;
  }

  items.forEach((item) => {
    const timeAgo = chalk.gray(`[${formatRelativeTime(item.pubDate)}]`);
    const sourceTag = chalk.bgBlue.white.bold(` ${item.source} `);
    const numBadge = chalk.bold.cyan(`${item.id}.`);

    console.log(`${numBadge} ${chalk.bold.white(item.title)}`);
    console.log(`   ${sourceTag} ${timeAgo}`);
    console.log(`   ${chalk.underline.dim(item.link)}`);
    console.log('');
  });
}

/**
 * Displays article detailed modal / info.
 */
export function renderArticleDetails(item) {
  console.log('\n' + chalk.yellow('─'.repeat(60)));
  console.log(chalk.bold.green(`📌 ${item.title}`));
  console.log(chalk.gray(`Source: ${item.source}  |  Published: ${item.pubDate.toLocaleString()}`));
  console.log(chalk.cyan(`URL: ${item.link}`));
  console.log(chalk.yellow('─'.repeat(60)) + '\n');
}
