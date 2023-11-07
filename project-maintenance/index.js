import core from "@actions/core";
import { Octokit } from "@octokit/core";
import {
  getProjectDetails,
  getProjectItems,
  toSetToCurrentIterationFilter,
  toArchiveFilter,
  setItemToCurrentIteration,
  archiveItem,
} from "./functions.js";

const run = async () => {
  try {
    const owner = core.getInput("owner");
    const number = Number(core.getInput("number"));
    const token = core.getInput("token");

    const octokit = new Octokit({ auth: token });

    const projectDetails = await getProjectDetails({ octokit, owner, number });
    const items = await getProjectItems({ octokit, owner, number });

    await Promise.all(
      toSetToCurrentIterationFilter(projectDetails, items).map((item) =>
        setItemToCurrentIteration({ octokit, owner, projectDetails, item })
      )
    );
    await Promise.all(
      toArchiveFilter(projectDetails, items).map((item) =>
        archiveItem({
          octokit,
          owner,
          projectId: projectDetails.id,
          itemId: item.id,
        })
      )
    );
  } catch (error) {
    core.setFailed(error);
  }
};

run();
