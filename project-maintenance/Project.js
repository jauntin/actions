export class Project {
  // Constructor properties given in config
  #owner;
  #number;
  #iterationFieldName;
  #statusFieldName;
  #doneStatusName;
  #daysToKeepOnDone;
  #octokit;

  // Calculated properties
  #projectDetails;
  #projectItems;
  #statusField;
  #iterationField;
  #doneStatus;
  #currentIteration;

  constructor(config) {
    this.#owner = config.owner;
    this.#number = config.number;
    this.#iterationFieldName = config.iterationFieldName;
    this.#statusFieldName = config.statusFieldName;
    this.#doneStatusName = config.doneStatusName;
    this.#daysToKeepOnDone = config.daysToKeepOnDone;
    this.#octokit = config.octokit;
  }

  async retrieveProjectData() {
    this.#projectDetails = await this.#getProjectDetails();
    this.#projectItems = await this.#getProjectItems();

    this.#statusField = this.#projectDetails.fields.nodes.find(
      (n) => n.name === this.#statusFieldName
    );
    this.#iterationField = this.#projectDetails.fields.nodes.find(
      (n) => n.name === this.#iterationFieldName
    );
    this.#doneStatus = this.#statusField.options.find(
      (n) => n.name === this.#doneStatusName
    );
    this.#currentIteration = this.#iterationField.configuration.iterations[0];
  }

  async setItemsToCurrentIteration() {
    await Promise.all(
      this.#toSetToCurrentIterationFilter().map((item) =>
        this.#setItemToCurrentIteration(item)
      )
    );
  }

  async archiveItems() {
    await Promise.all(
      this.#toArchiveFilter().map((item) => this.#archiveItem(item))
    );
  }

  #toSetToCurrentIterationFilter() {
    return this.#projectItems.filter(
      (item) =>
        item.fieldValues.nodes.find(
          (field) =>
            field.field?.id === this.#statusField.id &&
            field.optionId === this.#doneStatus.id
        ) &&
        !item.fieldValues.nodes.find(
          (field) => field.field?.id === this.#iterationField.id
        )
    );
  }
  #toArchiveFilter() {
    const archiveLimit = new Date();
    archiveLimit.setDate(archiveLimit.getDate() - this.#daysToKeepOnDone);
    return this.#projectItems.filter(
      (item) =>
        item.fieldValues.nodes.find(
          (field) =>
            field.field?.id === this.#statusField.id &&
            field.optionId === this.#doneStatus.id
        ) && new Date(item.updatedAt) < archiveLimit
    );
  }

  async #setItemToCurrentIteration(item) {
    return this.#octokit.graphql(
      `mutation updateItemFieldValue($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
        updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { iterationId: $value } }) {
          clientMutationId
        }
      }
      `,
      {
        projectId: this.#projectDetails.id,
        itemId: item.id,
        fieldId: this.#iterationField.id,
        value: this.#currentIteration.id,
      }
    );
  }
  async #archiveItem(item) {
    return this.#octokit.graphql(
      `mutation archiveItem($projectId: ID!, $itemId: ID!) {
      archiveProjectV2Item(input:{projectId: $projectId, itemId: $itemId }) {
        clientMutationId
      }
    }
    `,
      { projectId: this.#projectDetails.id, itemId: item.id }
    );
  }

  async #getProjectDetails() {
    return (
      await this.#octokit.graphql(
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
        { owner: this.#owner, number: this.#number }
      )
    ).userOrOrganization.projectV2;
  }

  async #getProjectItems() {
    const items = [];
    let endCursor = undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const result = (
        await this.#octokit.graphql(
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
            owner: this.#owner,
            number: this.#number,
            first: 100,
            after: endCursor,
          }
        )
      ).userOrOrganization.projectV2.items;
      ({ endCursor, hasNextPage } = result.pageInfo);
      items.push(...result.nodes);
    }
    return items;
  }
}
