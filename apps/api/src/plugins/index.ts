import { discordPlugin } from "./discord";
import { genericWebhookPlugin } from "./generic-webhook";
import { googleCalendarPlugin } from "./google-calendar";
import { giteaPlugin } from "./gitea";
import { githubPlugin, initializeGitHubPlugin } from "./github";
import { gitlabPlugin } from "./gitlab";
import { mattermostPlugin } from "./mattermost";
import { initializeEventSubscriptions, registerPlugin } from "./registry";
import { slackPlugin } from "./slack";
import { telegramPlugin } from "./telegram";

export function initializePlugins() {
  console.log("Initializing plugins...");

  registerPlugin(githubPlugin);
  registerPlugin(giteaPlugin);
  registerPlugin(gitlabPlugin);
  registerPlugin(slackPlugin);
  registerPlugin(mattermostPlugin);
  registerPlugin(discordPlugin);
  registerPlugin(genericWebhookPlugin);
  registerPlugin(telegramPlugin);
  registerPlugin(googleCalendarPlugin);
  initializeGitHubPlugin();
  initializeEventSubscriptions();

  console.log("✅ Plugins initialized");
}

export * from "./registry";
export * from "./types";
