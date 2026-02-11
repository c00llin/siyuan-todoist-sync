/**
 * Check if a kramdown string represents a task block (checkbox item).
 * SiYuan task kramdown formats:
 *   * [ ] text                       — basic
 *   - [ ] text                       — dash variant
 *   * {: id="..." } [ ] text         — IAL between marker and checkbox
 *   * {: id="..." type="NodeListItem"} [ ] text — IAL with extra attrs
 *   [ ] text                         — no list marker (rare)
 */
export function isTaskBlock(kramdown: string): boolean {
  return (
    /^[*-]\s+(\{:.*?\}\s*)?\[[ x]\]/.test(kramdown) ||
    /^\[[ x]\]\s/.test(kramdown)
  );
}

/**
 * Convert a regular paragraph block to a task block by prepending `* [ ] `.
 * If already a task block, returns unchanged.
 */
export function convertToTaskBlock(kramdown: string): string {
  if (isTaskBlock(kramdown)) {
    return kramdown;
  }
  return `* [ ] ${kramdown}`;
}

/**
 * Split kramdown into first line and rest.
 */
function splitFirstLine(kramdown: string): { firstLine: string; rest: string } {
  const newlineIndex = kramdown.indexOf("\n");
  if (newlineIndex === -1) {
    return { firstLine: kramdown, rest: "" };
  }
  return {
    firstLine: kramdown.substring(0, newlineIndex),
    rest: kramdown.substring(newlineIndex + 1),
  };
}

/**
 * Rejoin first line and rest into a full kramdown string.
 */
function joinLines(firstLine: string, rest: string): string {
  return rest ? `${firstLine}\n${rest}` : firstLine;
}

/**
 * Check if the kramdown already contains a specific tag like #task#.
 */
export function hasTag(kramdown: string, tag: string): boolean {
  return kramdown.includes(tag);
}

/**
 * Check if the kramdown already contains a Todoist link [»link«](...).
 */
export function hasTodoistLink(kramdown: string): boolean {
  return kramdown.includes("[»link«]");
}

/**
 * Add a tag (e.g. #task#) at the end of the first line of content.
 * Handles IAL attributes {: ...} that may be at the end of the line by inserting before them.
 */
export function addTagToFirstLine(kramdown: string, tag: string): string {
  if (hasTag(kramdown, tag)) {
    return kramdown;
  }

  const { firstLine, rest } = splitFirstLine(kramdown);

  // Check if the first line ends with an IAL block {: ... }
  const ialMatch = firstLine.match(/(\{:.*\})\s*$/);
  let newFirstLine: string;

  if (ialMatch) {
    const beforeIal = firstLine
      .substring(0, firstLine.length - ialMatch[0].length)
      .trimEnd();
    newFirstLine = `${beforeIal} ${tag} ${ialMatch[0]}`;
  } else {
    newFirstLine = `${firstLine} ${tag}`;
  }

  return joinLines(newFirstLine, rest);
}

/**
 * Add a Todoist link [»link«](url) after the #task# tag on the first line.
 * Inserts " [»link«](url)" right after "#task#".
 */
export function addTodoistLink(kramdown: string, todoistUrl: string): string {
  if (hasTodoistLink(kramdown)) {
    return kramdown;
  }

  const link = `[»link«](${todoistUrl})`;
  const tagIndex = kramdown.indexOf("#task#");

  if (tagIndex === -1) {
    // Tag not found; append link at end of first line before IAL
    const { firstLine, rest } = splitFirstLine(kramdown);
    const ialMatch = firstLine.match(/(\{:.*\})\s*$/);
    let newFirstLine: string;
    if (ialMatch) {
      const beforeIal = firstLine
        .substring(0, firstLine.length - ialMatch[0].length)
        .trimEnd();
      newFirstLine = `${beforeIal} ${link} ${ialMatch[0]}`;
    } else {
      newFirstLine = `${firstLine} ${link}`;
    }
    return joinLines(newFirstLine, rest);
  }

  const insertPos = tagIndex + "#task#".length;
  return (
    kramdown.substring(0, insertPos) +
    " " +
    link +
    kramdown.substring(insertPos)
  );
}

/**
 * Mark a task block as completed by changing [ ] to [x],
 * and append ✔︎ after the Todoist link.
 */
export function markTaskComplete(kramdown: string): string {
  let result = kramdown.replace(/\[ \]/, "[x]");

  // Find the Todoist link and append ✔︎ after it
  const linkPattern = /\[»link«\]\([^)]+\)/;
  const linkMatch = result.match(linkPattern);
  if (linkMatch && linkMatch.index !== undefined) {
    const afterLink = linkMatch.index + linkMatch[0].length;
    // Only add if not already present
    if (!result.substring(afterLink).startsWith(" ✔︎")) {
      result =
        result.substring(0, afterLink) + " ✔︎" + result.substring(afterLink);
    }
  }

  return result;
}

/**
 * Remove slash command trigger text from kramdown.
 * The user may have only partially typed the keyword (e.g. "/tod" instead of "/todoist")
 * before selecting from the menu, so we match any prefix of the configured keywords.
 * We find the last occurrence of "/" followed by characters that are a prefix of any keyword.
 */
export function removeSlashTrigger(
  kramdown: string,
  keywords: string[],
): string {
  const { firstLine, rest } = splitFirstLine(kramdown);

  // Match the last "/" followed by word characters on the line — this is the slash trigger.
  // We verify it's a prefix of at least one configured keyword.
  const slashMatch = firstLine.match(/\/(\w*)$/);
  if (!slashMatch) {
    // Fallback: maybe the cursor was mid-line; try matching /word anywhere
    const anySlash = firstLine.match(/\/(\w+)/);
    if (anySlash) {
      const typed = anySlash[1].toLowerCase();
      const isPrefix = keywords.some((kw) =>
        kw.toLowerCase().startsWith(typed),
      );
      if (isPrefix) {
        const newFirstLine = firstLine
          .replace(anySlash[0], "")
          .replace(/\s{2,}/g, " ")
          .trim();
        return joinLines(newFirstLine, rest);
      }
    }
    return joinLines(firstLine, rest);
  }

  const typed = slashMatch[1].toLowerCase();
  const isPrefix =
    typed.length === 0 ||
    keywords.some((kw) => kw.toLowerCase().startsWith(typed));
  if (isPrefix) {
    const newFirstLine = firstLine
      .replace(slashMatch[0], "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return joinLines(newFirstLine, rest);
  }

  return joinLines(firstLine, rest);
}

/**
 * Extract plain text content from a task kramdown line for use as Todoist task title.
 * Strips everything up to and including the checkbox in one pass, then removes
 * remaining IAL, tags, and markdown links.
 */
export function extractTaskContent(kramdown: string): string {
  const { firstLine } = splitFirstLine(kramdown);
  let content = firstLine;

  // Strip everything up to and including the checkbox [ ] or [x]
  // Handles: "* {: id="..."} [ ] text", "- [ ] text", "[ ] text"
  const checkboxMatch = content.match(
    /^(?:[*-]\s+)?(?:\{:.*?\}\s*)?\[[ x]\]\s*/,
  );
  if (checkboxMatch) {
    content = content.substring(checkboxMatch[0].length);
  } else {
    // No checkbox found, just strip list marker if present
    content = content.replace(/^[*-]\s+/, "");
  }

  // Remove any remaining inline IAL {: ...}
  content = content.replace(/\{:.*?\}/g, "");

  // Remove #tag# patterns
  content = content.replace(/#\w+#/g, "");

  // Remove markdown links [text](url)
  content = content.replace(/\[.*?\]\(.*?\)/g, "");

  return content.trim();
}
