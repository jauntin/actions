import core from "@actions/core";
import GitHubProject from "github-project";

const run = async () => {
  try {
    const owner = core.getInput("owner");
    const number = Number(core.getInput("number"));
    const token = core.getInput("token");
    const iterationField = core.getInput("iterationField");
    const status = core.getInput("status");

    const options = {
      owner,
      number,
      token,
      fields: { iteration: { name: iterationField, optional: true } },
    };
    const project = await GitHubProject.getInstance(options);
    const projectData = await project.getProperties();
    const currentIteration = Object.keys(
      projectData.fields.iteration.optionsByValue
    )[0];

    const items = await project.items.list();
    const filteredItems = items.filter(
      (item) =>
        item.fields.status === status &&
        item.fields.iteration === null &&
        item.isArchived === false
    );

    await Promise.all(
      filteredItems.map((item) =>
        project.items.update(item.id, { iteration: currentIteration })
      )
    );
    core.info(`${filteredItems.length} items updated`);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
