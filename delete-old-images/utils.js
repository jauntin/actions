const core = require("@actions/core");

/**
 * Parse input from env.
 * @returns Config
 */
const getConfig = function () {
  const config = {
    token: core.getInput("token", { required: true }),
    owner: core.getInput("owner", { required: true }),
    name: core.getInput("name", { required: true }),
    seconds: parseInt(core.getInput("seconds", { required: true }), 10),
  };

  if (Number.isNaN(config.seconds)) {
    throw new Error("Seconds should be a number");
  }
  return config;
};

const olderThanSeconds = function (updatedAt, seconds) {
  const date = Date.parse(updatedAt);
  return Date.now() - seconds * 1000 > date;
};

const deletePackageVersion = async (octokit, owner, name, versionId) => {
  await octokit.rest.packages.deletePackageVersionForOrg({
    package_type: "container",
    package_name: name,
    org: owner,
    package_version_id: versionId,
  });
};

const getAllPackageVersions = async function (octokit, owner, name) {
  const packageVersions = [];
  for await (const response of octokit.paginate.iterator(
    octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg,
    {
      package_type: "container",
      package_name: name,
      org: owner,
      state: "active",
      per_page: 100,
    },
  )) {
    for (const packageVersion of response.data) {
      packageVersions.push(packageVersion);
    }
  }
  return packageVersions;
};

module.exports = {
  getConfig,
  olderThanSeconds,
  deletePackageVersion,
  getAllPackageVersions,
};
