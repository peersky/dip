"use client";

import React from 'react';
import {
  MDXEditor,
  type MDXEditorMethods,
  toolbarPlugin,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  // imagePlugin, // Removed for now
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  sandpackPlugin,
  codeMirrorPlugin,
  // Toolbar components - we can add specific ones if needed
  // DiffSourceToggleWrapper,
  // UndoRedo,
  // BoldItalicUnderlineToggles,
  // CreateLink,
  // InsertTable,
  // ListsToggle,
  // BlockTypeSelect,
  // InsertThematicBreak,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

interface MarkdownEditorProps {
  content: string; // This will now be raw Markdown
  onChange: (markdown: string) => void;
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
      )
    }),
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    tablePlugin(),
    // imagePlugin removed
    codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
    // sandpackPlugin removed due to TypeScript configuration issues
    codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', css: 'CSS', txt: 'text', tsx: 'TypeScript' } }),
  ];

  return (
    <MDXEditor
      ref={editorRef}
      markdown={content}
      onChange={onChange}
      readOnly={!editable}
      plugins={allPlugins}
      className="dark-theme" // For MDXEditor's own dark theme UI
      // Increased padding (e.g., p-4), ensured line-height with prose, full width, and no outline.
      contentEditableClassName="prose dark:prose-invert md:prose-lg lg:prose-xl max-w-none w-full focus:outline-none p-4 leading-relaxed"
    />
  );
}

// No specific global styles needed here for the dark theme if "dark-theme" class works as documented.
// The `prose dark:prose-invert` should handle the content area styling via Tailwind.