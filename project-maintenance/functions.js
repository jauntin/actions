export const statusFieldName = "Status";
export const iterationFieldName = "Iteration";
export const doneStatusName = "✅ Done";
export const archiveLimitNumberOfDays = 100;

export const getStatusField = (projectDetails) =>
  projectDetails.fields.nodes.find((n) => n.name === statusFieldName);
export const getIterationField = (projectDetails) =>
  projectDetails.fields.nodes.find((n) => n.name === iterationFieldName);
export const getDoneStatus = (field) =>
  field.options.find((n) => n.name === doneStatusName);
export const getCurrentIteration = (field) => field.configuration.iterations[0];

export const toSetToCurrentIterationFilter = (projectDetails, items) => {
  const statusField = getStatusField(projectDetails);
  const iterationField = getIterationField(projectDetails);
  const doneStatus = getDoneStatus(statusField);
  return items.filter(
    (item) =>
      item.fieldValues.nodes.find(
        (field) =>
          field.field?.id === statusField.id && field.optionId === doneStatus.id
      ) &&
      !item.fieldValues.nodes.find(
        (field) => field.field?.id === iterationField.id
      )
  );
};

export const toArchiveFilter = (projectDetails, items) => {
  const statusField = getStatusField(projectDetails);
  const doneStatus = getDoneStatus(statusField);
  const archiveLimit = new Date();
  archiveLimit.setDate(archiveLimit.getDate() - archiveLimitNumberOfDays);
  return items.filter(
    (item) =>
      item.fieldValues.nodes.find(
        (field) =>
          field.field?.id === statusField.id && field.optionId === doneStatus.id
      ) && new Date(item.updatedAt) < archiveLimit
  );
};

export const getProjectDetails = async ({ octokit, owner, number }) =>
  (
    await octokit.graphql(
      `
    query getProjectCoreData($owner: String!, $number: Int!) {
    userOrOrganization: repositoryOwner(login: $owner) {
      ... on ProjectV2Owner {
        projectV2(number: $number) {
            id
            title
            url
            databaseId
            fields(first: 50) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  dataType
                  name
                }
                ... on ProjectV2SingleSelectField {
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2IterationField {
                  configuration {
                    iterations {
                      id
                      title
                      duration
                      startDate
                    }
                    completedIterations {
                      id
                      title
                      duration
                      startDate
                    }
                    duration
                    startDay
                  }
                }
              }
            }
        }
      }
    }
  }
  `,
      { owner, number }
    )
  ).userOrOrganization.projectV2;

export const getProjectItems = async ({ octokit, owner, number }) => {
  const items = [];
  let endCursor = undefined;
  let hasNextPage = true;
  while (hasNextPage) {
    const result = (
      await octokit.graphql(
        `
  query getPaginatedProjectItems($owner: String!, $number: Int!, $first: Int, $after: String) {
    userOrOrganization: repositoryOwner(login: $owner) {
      ... on ProjectV2Owner {
        projectV2(number: $number) {
          items(first: $first, after: $after) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              id
              createdAt
              type
              isArchived
              updatedAt
              content {
                ... on DraftIssue {
                  id
                  title
                  createdAt
                  updatedAt
                  author: creator {
                    login
                  }
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                }
                ... on Issue {
                  id
                  databaseId
                  number
                  title
                  url
                  createdAt
                  author {
                    login
                  }
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  closed
                  closedAt
                  milestone {
                    number
                    title
                    state
                  }
                  repository {
                    name
                  }
                }
                ... on PullRequest {
                  id
                  databaseId
                  number
                  title
                  url
                  createdAt
                  author {
                    login
                  }
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  closed
                  closedAt
                  milestone {
                    number
                    title
                    state
                  }
                  repository {
                    name
                  }
                  merged
                }
              }
              fieldValues(first: 20) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2Field {
                        id
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    iterationId
                    startDate
                    duration
                    field {
                      ... on ProjectV2IterationField {
                        id
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2Field {
                        id
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    optionId
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2Field {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  `,
        {
          owner: owner,
          number: number,
          first: 100,
          after: endCursor,
        }
      )
    ).userOrOrganization.projectV2.items;
    ({ endCursor, hasNextPage } = result.pageInfo);
    items.push(...result.nodes);
  }
  return items;
};

export const setItemToCurrentIteration = async ({
  octokit,
  projectDetails,
  item,
}) => {
  const field = getIterationField(projectDetails);
  const currentIteration = getCurrentIteration(field);
  return octokit.graphql(
    `mutation updateItemFieldValue($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { iterationId: $value } }) {
        clientMutationId
      }
    }
    `,
    {
      projectId: projectDetails.id,
      itemId: item.id,
      fieldId: field.id,
      value: currentIteration.id,
    }
  );
};

export const archiveItem = async ({ octokit, projectId, itemId }) => {
  return octokit.graphql(
    `mutation archiveItem($projectId: ID!, $itemId: ID!) {
    archiveProjectV2Item(input:{projectId: $projectId, itemId: $itemId }) {
      clientMutationId
    }
  }
  `,
    { projectId, itemId }
  );
};
