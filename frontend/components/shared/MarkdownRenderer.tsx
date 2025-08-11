// dip/frontend/components/shared/MarkdownRenderer.tsx
"use client";

import React from "react";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";

// Import a Prism theme for syntax highlighting.
// You will need to add this CSS file to the same directory.
// A good default theme can be found here:
// https://raw.githubusercontent.com/PrismJS/prism-themes/master/themes/prism-one-dark.css
import "./prism-theme.css";

// Import the CSS module for GitHub-style markdown rendering.
// You will need to add this CSS file to the same directory.
import styles from "./MarkdownRenderer.module.css";

interface MarkdownRendererProps {
  content: string;
}

/**
 * A sophisticated markdown renderer that provides a GitHub-like viewing experience.
 * It leverages plugins for GitHub Flavored Markdown (tables, task lists, etc.)
 * and for beautiful, language-aware syntax highlighting of code blocks.
 *
 * This component centralizes markdown rendering, ensuring a consistent
 * look and feel across the entire application.
 */
// A simple regex to find and remove a YAML frontmatter block if it exists.
const stripFrontmatter = (markdown: string): string => {
  const frontmatterRegex = /^---[\s\S]*?---\s*/;
  return markdown.replace(frontmatterRegex, "");
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
}) => {
  // Strip the frontmatter on the client-side before rendering.
  const cleanContent = stripFrontmatter(content);

  return (
    <div className={styles.markdownBody}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrism]}
        components={{
          // Optional: Override the default rendering for certain elements.
          // For example, to make all links open in a new tab for security and UX.
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
