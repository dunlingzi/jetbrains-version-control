import * as vscode from "vscode";
import { GIT_BRAINS_SCHEME } from "../views/gitContentProvider";

/**
 * Diff sides are served by our `git-brains:` content provider, so opening a side
 * directly would show a read-only snapshot instead of the file on disk. Map the
 * virtual URI back to the real workspace file.
 */
function toRealFileUri(uri: vscode.Uri): vscode.Uri | undefined {
  if (uri.scheme === "file") return uri;
  if (uri.scheme !== GIT_BRAINS_SCHEME) return undefined;

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return undefined;

  const relative = uri.path.startsWith("/") ? uri.path.slice(1) : uri.path;
  if (!relative) return undefined;
  return vscode.Uri.joinPath(folder.uri, relative);
}

/**
 * Open the file under the cursor in a normal editor, revealing the cursor line.
 *
 * Unlike VS Code's own `workbench.action.compareEditor.openSide` (Ctrl+K
 * Shift+O), which calls `openEditor(editor)` with no selection and therefore
 * loses the cursor position.
 *
 * @returns false when no usable diff/editor was found, so the caller can fall
 *   back to another behaviour.
 */
export async function jumpToSourceFromDiffEditor(): Promise<boolean> {
  const tabInput = vscode.window.tabGroups.activeTabGroup?.activeTab?.input;
  if (!(tabInput instanceof vscode.TabInputTextDiff)) return false;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  const { original, modified } = tabInput;
  // Prefer whichever side has focus; otherwise fall back to the modified side.
  const side =
    editor.document.uri.toString() === original.toString()
      ? original
      : modified;

  const target = toRealFileUri(side);
  if (!target) return false;

  const line = editor.selection.active.line;
  await vscode.commands.executeCommand("vscode.open", target, {
    selection: new vscode.Range(line, 0, line, 0),
    preview: false,
  });
  return true;
}
