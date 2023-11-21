import core from "@actions/core";
import { Octokit } from "@octokit/core";
import { Project } from "./Project.js";

const run = async () => {
  try {
    const project = new Project({
      owner: core.getInput("owner"),
      number: Number(core.getInput("number")),
      owner: core.getInput("owner"),
      iterationFieldName: core.getInput("iterationFieldName"),
      statusFieldName: core.getInput("statusFieldName"),
      doneStatusName: core.getInput("doneStatusName"),
      daysToKeepOnDone: Number(core.getInput("daysToKeepOnDone")),
      octokit: new Octokit({ auth: core.getInput("token") })
    });
    await project.retrieveProjectData();
    await project.setItemsToCurrentIteration();
    await project.archiveItems();
  } catch (error) {
    core.setFailed(error);
  }
};

run();
