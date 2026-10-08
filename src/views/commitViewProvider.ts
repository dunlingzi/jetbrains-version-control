import * as vscode from "vscode";
import type { GitCache } from "../git/cache";
import type { GitService } from "../git/gitService";
import type { MessageRouter } from "../messages/messageRouter";
import { getWebviewHtml } from "./html";

/** Coalesces the many `commitStateChanged`/`gitStateChanged` broadcasts */
const BADGE_REFRESH_DEBOUNCE = 300;

export class CommitViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "git-brains.commitPanel";

  private view: vscode.WebviewView | null = null;
  private badgeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly messageRouter: MessageRouter,
    private readonly caches: GitCache[] = [],
    private readonly gitServices: GitService[] = [],
  ) {
    this.disposables.push(
      this.messageRouter.onBroadcast((event) => {
        if (event === "commitStateChanged" || event === "gitStateChanged") {
          this.scheduleBadgeRefresh();
        }
      }),
    );
  }

  /** Recomputes the badge from the same source VS Code's SCM badge uses. */
  private async refreshBadge(): Promise<void> {
    const view = this.view;
    if (!view) return;

    let count = 0;
    for (const service of this.gitServices) {
      try {
        const files = await service.getWorkingTreeChanges();
        // Match VS Code's own SCM badge, which sums the resource states of every
        // visible repository's groups. It counts one state per distinct path, so
        // a path that is both staged and further modified counts once — not
        // twice, and staged-only paths are counted too.
        count += new Set(files.map((f) => f.path)).size;
      } catch {
        // Folder is not a git repo — skip it.
      }
    }

    if (this.view !== view) return;
    view.badge =
      count > 0
        ? { value: count, tooltip: `${count} pending changes` }
        : undefined;
  }

  private scheduleBadgeRefresh(): void {
    if (this.badgeTimer !== null) {
      clearTimeout(this.badgeTimer);
    }
    this.badgeTimer = setTimeout(() => {
      this.badgeTimer = null;
      void this.refreshBadge();
    }, BADGE_REFRESH_DEBOUNCE);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    const webview = webviewView.webview;
    this.view = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")],
    };

    webview.html = getWebviewHtml(webview, this.extensionUri, "commit");

    const routerDisposable = this.messageRouter.registerWebview(webview);
    webviewView.onDidDispose(() => {
      this.view = null;
      if (this.badgeTimer !== null) {
        clearTimeout(this.badgeTimer);
        this.badgeTimer = null;
      }
      routerDisposable.dispose();
    });

    this.scheduleBadgeRefresh();

    // First time opening: focus git log panel after a delay
    setTimeout(() => {
      if (webviewView.visible) {
        void vscode.commands.executeCommand("git-brains.gitLog.focus");
        for (const cache of this.caches) {
          cache.invalidate();
        }
        this.messageRouter.broadcastEvent("commitStateChanged", {});
        this.messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      }
    }, 200);

    // When commit panel becomes visible, also show the Git Log panel and refresh both
    // When hidden (clicked again to collapse), hide the Git Log panel too
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // Small delay to ensure panels are ready
        setTimeout(() => {
          void vscode.commands.executeCommand("git-brains.gitLog.focus");
          // Invalidate all git caches to ensure fresh data
          for (const cache of this.caches) {
            cache.invalidate();
          }
          this.messageRouter.broadcastEvent("commitStateChanged", {});
          this.messageRouter.broadcastEvent("gitStateChanged", {
            scope: "all",
          });
        }, 100);
      } else {
        void vscode.commands.executeCommand("workbench.action.closePanel");
      }
    });
  }

  dispose(): void {
    if (this.badgeTimer !== null) {
      clearTimeout(this.badgeTimer);
      this.badgeTimer = null;
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }
}
