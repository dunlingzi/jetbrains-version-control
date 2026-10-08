import type * as vscode from "vscode";
import {
  ErrorCode,
  type EventMessage,
  type EventType,
  type RequestMessage,
  type ResponseMessage,
} from "./protocol";

export type CommandHandler = (
  params: Record<string, unknown>,
) => Promise<unknown>;

export type BroadcastListener = (event: EventType, data: unknown) => void;

export class MessageRouter {
  private webviews = new Set<vscode.Webview>();
  private handlers = new Map<string, CommandHandler>();
  private broadcastListeners = new Set<BroadcastListener>();

  /** Register a command handler */
  handle(command: string, handler: CommandHandler): void {
    this.handlers.set(command, handler);
  }

  /** Register a webview to receive events and handle requests */
  registerWebview(webview: vscode.Webview): vscode.Disposable {
    this.webviews.add(webview);

    const messageDisposable = webview.onDidReceiveMessage(
      (msg: RequestMessage) => this.handleRequest(webview, msg),
    );

    return {
      dispose: () => {
        this.webviews.delete(webview);
        messageDisposable.dispose();
      },
    };
  }

  /** Observe broadcasts on the extension-host side, not just in webviews */
  onBroadcast(listener: BroadcastListener): vscode.Disposable {
    this.broadcastListeners.add(listener);
    return {
      dispose: () => {
        this.broadcastListeners.delete(listener);
      },
    };
  }

  /** Broadcast an event to all registered webviews */
  broadcastEvent(event: EventType, data: unknown): void {
    const msg: EventMessage = { type: "event", event, data };
    for (const webview of this.webviews) {
      webview.postMessage(msg);
    }
    for (const listener of this.broadcastListeners) {
      listener(event, data);
    }
  }

  private async handleRequest(
    webview: vscode.Webview,
    msg: RequestMessage,
  ): Promise<void> {
    if (msg.type !== "request") {
      return;
    }

    const handler = this.handlers.get(msg.command);
    if (!handler) {
      this.sendResponse(webview, msg.id, false, undefined, {
        code: ErrorCode.UNKNOWN,
        message: `Unknown command: ${msg.command}`,
      });
      return;
    }

    try {
      const data = await handler(msg.params);
      this.sendResponse(webview, msg.id, true, data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendResponse(webview, msg.id, false, undefined, {
        code: ErrorCode.UNKNOWN,
        message,
      });
    }
  }

  private sendResponse(
    webview: vscode.Webview,
    id: string,
    success: boolean,
    data?: unknown,
    error?: { code: ErrorCode; message: string },
  ): void {
    const response: ResponseMessage = {
      type: "response",
      id,
      success,
      data,
      error,
    };
    webview.postMessage(response);
  }
}
