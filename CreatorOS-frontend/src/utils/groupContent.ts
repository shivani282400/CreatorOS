export type GroupableContent = {
  id: number;
  parent_id?: number | null;
  topic?: string;
  script?: string;
  created_at: string;
};

export type ContentGroup<T extends GroupableContent> = {
  groupId: string;
  main: T;
  variations: T[];
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toKeywordSet = (value: string) =>
  new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 3)
  );

const getJaccardScore = (left: Set<string>, right: Set<string>) => {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  return intersection / (left.size + right.size - intersection);
};

const areSimilarScripts = <T extends GroupableContent>(left: T, right: T) => {
  const leftTopic = normalizeText(left.topic ?? "");
  const rightTopic = normalizeText(right.topic ?? "");

  if (leftTopic && leftTopic === rightTopic) {
    return true;
  }

  const leftKeywords = toKeywordSet(`${left.topic ?? ""} ${left.script ?? ""}`.slice(0, 240));
  const rightKeywords = toKeywordSet(`${right.topic ?? ""} ${right.script ?? ""}`.slice(0, 240));

  return getJaccardScore(leftKeywords, rightKeywords) >= 0.45;
};

export const groupContentByParent = <T extends GroupableContent>(items: T[]): ContentGroup<T>[] => {
  const grouped = new Map<number, T[]>();

  for (const item of items) {
    const groupKey = item.parent_id ?? item.id;
    const groupItems = grouped.get(groupKey) ?? [];
    groupItems.push(item);
    grouped.set(groupKey, groupItems);
  }

  const initialGroups = [...grouped.entries()]
    .map(([id, groupItems]) => {
      const sortedItems = [...groupItems].sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );

      const main =
        sortedItems.find((item) => item.parent_id == null && item.id === id) ??
        sortedItems[0];

      const variations = sortedItems.filter((item) => item.id !== main.id);

      return {
        groupId: `parent-${id}`,
        main,
        variations
      };
    });

  const linkedGroups = initialGroups.filter((group) => group.variations.length > 0);
  const standaloneGroups = initialGroups.filter((group) => group.variations.length === 0);
  const similarityGroups: ContentGroup<T>[] = [];

  for (const group of standaloneGroups) {
    const item = group.main;
    const existingGroup = similarityGroups.find((candidate) =>
      areSimilarScripts(candidate.main, item)
    );

    if (!existingGroup) {
      similarityGroups.push({
        groupId: `similar-${item.id}`,
        main: item,
        variations: []
      });
      continue;
    }

    const groupedItems = [existingGroup.main, ...existingGroup.variations, item].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );

    existingGroup.main = groupedItems[0];
    existingGroup.variations = groupedItems.slice(1);
  }

  return [...linkedGroups, ...similarityGroups].sort(
    (left, right) =>
      new Date(right.main.created_at).getTime() - new Date(left.main.created_at).getTime()
  );
};
