const LIST_OF_HEALTHCHECKS_FUNC: Array<() => Promise<any>> = [
  // currently empty because we don't have external services
];

export default async function() {
  await Promise.all(LIST_OF_HEALTHCHECKS_FUNC.map(func => func()));
}