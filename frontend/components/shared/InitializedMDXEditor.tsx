"use client";
// InitializedMDXEditor.tsx
import type { ForwardedRef } from "react";
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
  MDXEditorProps,
  MDXEditor,
  sandpackPlugin,
} from "@mdxeditor/editor";

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      plugins={[
        toolbarPlugin(),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        // imagePlugin removed
        codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
        sandpackPlugin(),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: "JavaScript",
            css: "CSS",
            txt: "text",
            tsx: "TypeScript",
            python: "Python",
            solidity: "Solidity",
          },
        }),
      ]}
      {...props}
      ref={editorRef}
    />
  );
}
