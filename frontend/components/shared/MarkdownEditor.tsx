"use client";

import React, { useEffect, useState } from "react";
import {
  type MDXEditorMethods,
  toolbarPlugin,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { ForwardRefEditor } from "./ForwardRefEditor";

interface MarkdownEditorProps {
  content: string; // This will now be raw Markdown
  onChange?: (markdown: string) => void;
  editable?: boolean;
  editorRef?: React.MutableRefObject<MDXEditorMethods | null>;
}

// mockImageUploadHandler removed as imagePlugin is disabled for now

export default function MarkdownEditor({
  content,
  onChange,
  editable = true,
  editorRef,
}: MarkdownEditorProps) {
  // Configure plugins - imagePlugin removed
  const allPlugins = [
    toolbarPlugin({
      toolbarContents: () => (
        <>
          {/* Default toolbar items will be used.
              If specific items are needed, they can be added here explicitly.
              Example: <UndoRedo /> <BoldItalicUnderlineToggles /> ...
          */}
          </>
        ),
      }),
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      tablePlugin(),
      // imagePlugin removed
      codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
      // sandpackPlugin removed due to TypeScript configuration issues
      codeMirrorPlugin({
        codeBlockLanguages: {
          js: "JavaScript",
          css: "CSS",
          txt: "text",
          tsx: "TypeScript",
          sol: "Solidity",
        },
      }),
    ];

  useEffect(() => {
    if (!editorRef?.current) return;
    console.log("MarkdownEditor content:", content);
    editorRef.current.setMarkdown(content.toString());
  }, [content, editorRef]);

  // Configure plugins - imagePlugin removed
  const allPlugins = [
    toolbarPlugin({
      toolbarContents: () => (
        <>
          {/* Default toolbar items will be used.
              If specific items are needed, they can be added here explicitly.
              Example: <UndoRedo /> <BoldItalicUnderlineToggles /> ...
          */}
        </>
      ),
    }),
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    tablePlugin(),
    // imagePlugin removed
    codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
    // sandpackPlugin removed due to TypeScript configuration issues
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: "JavaScript",
        css: "CSS",
        txt: "text",
        tsx: "TypeScript",
      },
    }),
  ];
  const [content1, setContent] = useState(content);

  return (
    <ForwardRefEditor
      ref={editorRef}
      markdown={content}
      onChange={(e) => {
        console.log("trigger");
        return onChange(e);
      }}
      // readOnly={false}
      // plugins={allPlugins}
      // className="dark-theme" // For MDXEditor's own dark theme UI
      // Increased padding (e.g., p-4), ensured line-height with prose, full width, and no outline.
      // contentEditableClassName="prose dark:prose-invert md:prose-lg lg:prose-xl max-w-none w-full focus:outline-none p-4 leading-relaxed"
      markdown={content}
      onChange={onChange}
      readOnly={!editable}
      className="dark-theme" // For MDXEditor's own dark theme UI
      // Increased padding (e.g., p-4), ensured line-height with prose, full width, and no outline.
      contentEditableClassName="prose dark:prose-invert md:prose-lg lg:prose-xl max-w-none w-full focus:outline-none p-4 leading-relaxed"
    />
  );
}

// No specific global styles needed here for the dark theme if "dark-theme" class works as documented.
// The `prose dark:prose-invert` should handle the content area styling via Tailwind.
