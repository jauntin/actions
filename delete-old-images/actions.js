const core = require("@actions/core");
const utils = require("./utils");

const deleteOlderThan = async function (octokit, owner, name, seconds) {
  const packages = await utils.getAllPackageVersions(octokit, owner, name);
  core.info(`${packages.length} packages found`);
  const oldPackages = packages.filter((a) =>
    utils.olderThanSeconds(a.updated_at, seconds),
  );
  oldPackages.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  oldPackages.forEach(async (a, i) => {
    if (i === packages.length - 1) {
      core.info(
        `Will not delete the last remaining version: #${a.id} updated at ${a.updated_at}`,
      );
    } else {
      await utils.deletePackageVersion(octokit, owner, name, a.id);
      core.info(`Version #${a.id} updated_at ${a.updated_at} deleted.`);
    }
  });
};

module.exports = {
  deleteOlderThan,
};
