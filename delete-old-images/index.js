const core = require("@actions/core");
const github = require("@actions/github");
const utils = require("./utils");
const actions = require("./actions");

async function run() {
  try {
    const config = utils.getConfig();
    const octokit = github.getOctokit(config.token);

    await actions.deleteOlderThan(
      octokit,
      config.owner,
      config.name,
      config.seconds,
    );
  } catch (error) {
    core.setFailed(error);
  }
}

run();
