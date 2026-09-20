// Learn more: https://docs.expo.dev/guides/monorepos/#metro-configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround for a Windows-only issue: `node_modules/.bin/*` here are POSIX
// symlinks (created by an npm install run from Git Bash/WSL) that native
// Windows Node can't `lstat`, which crashes Metro's file watcher with EACCES.
// Excluding that folder from the watcher sidesteps it; nothing under
// `.bin` is ever imported by app code, so this is safe to ignore.
config.resolver.blockList = [/node_modules[/\\]\.bin[/\\].*/];

module.exports = config;
