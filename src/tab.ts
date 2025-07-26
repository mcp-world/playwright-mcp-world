/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventEmitter } from 'events';
import * as playwright from 'playwright';
import { callOnPageNoTrace, waitForCompletion } from './tools/utils.js';
import { logUnhandledError } from './log.js';
import { ManualPromise } from './manualPromise.js';
import { ModalState } from './tools/tool.js';
import { outputFile } from './config.js';

import type { Context } from './context.js';

type PageEx = playwright.Page & {
  _snapshotForAI: () => Promise<string>;
};

export const TabEvents = {
  modalState: 'modalState'
};

export type TabEventsInterface = {
  [TabEvents.modalState]: [modalState: ModalState];
};

export class Tab extends EventEmitter<TabEventsInterface> {
  readonly context: Context;
  readonly page: playwright.Page;
  private _consoleMessages: ConsoleMessage[] = [];
  private _recentConsoleMessages: ConsoleMessage[] = [];
  private _requests: Map<playwright.Request, playwright.Response | null> = new Map();
  private _onPageClose: (tab: Tab) => void;
  private _modalStates: ModalState[] = [];
  private _downloads: { download: playwright.Download, finished: boolean, outputFile: string }[] = [];

  constructor(context: Context, page: playwright.Page, onPageClose: (tab: Tab) => void) {
    super();
    this.context = context;
    this.page = page;
    this._onPageClose = onPageClose;
    page.on('console', event => this._handleConsoleMessage(messageToConsoleMessage(event)));
    page.on('pageerror', error => this._handleConsoleMessage(pageErrorToConsoleMessage(error)));
    page.on('request', request => this._requests.set(request, null));
    page.on('response', response => this._requests.set(response.request(), response));
    page.on('close', () => this._onClose());
    page.on('filechooser', chooser => {
      this.setModalState({
        type: 'fileChooser',
        description: 'File chooser',
        fileChooser: chooser,
      });
    });
    page.on('dialog', dialog => this._dialogShown(dialog));
    page.on('download', download => {
      void this._downloadStarted(download);
    });
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(5000);
  }

  modalStates(): ModalState[] {
    return this._modalStates;
  }

  setModalState(modalState: ModalState) {
    this._modalStates.push(modalState);
    this.emit(TabEvents.modalState, modalState);
  }

  clearModalState(modalState: ModalState) {
    this._modalStates = this._modalStates.filter(state => state !== modalState);
  }

  modalStatesMarkdown(): string[] {
    const result: string[] = ['### Modal state'];
    if (this._modalStates.length === 0)
      result.push('- There is no modal state present');
    for (const state of this._modalStates) {
      const tool = this.context.tools.filter(tool => 'clearsModalState' in tool).find(tool => tool.clearsModalState === state.type);
      result.push(`- [${state.description}]: can be handled by the "${tool?.schema.name}" tool`);
    }
    return result;
  }

  private _dialogShown(dialog: playwright.Dialog) {
    this.setModalState({
      type: 'dialog',
      description: `"${dialog.type()}" dialog with message "${dialog.message()}"`,
      dialog,
    });
  }

  private async _downloadStarted(download: playwright.Download) {
    const entry = {
      download,
      finished: false,
      outputFile: await outputFile(this.context.config, download.suggestedFilename())
    };
    this._downloads.push(entry);
    await download.saveAs(entry.outputFile);
    entry.finished = true;
  }

  private _clearCollectedArtifacts() {
    this._consoleMessages.length = 0;
    this._recentConsoleMessages.length = 0;
    this._requests.clear();
  }

  private _handleConsoleMessage(message: ConsoleMessage) {
    this._consoleMessages.push(message);
    this._recentConsoleMessages.push(message);
  }

  private _onClose() {
    this._clearCollectedArtifacts();
    this._onPageClose(this);
  }

  async title(): Promise<string> {
    return await callOnPageNoTrace(this.page, page => page.title());
  }

  async waitForLoadState(state: 'load', options?: { timeout?: number }): Promise<void> {
    await callOnPageNoTrace(this.page, page => page.waitForLoadState(state, options).catch(logUnhandledError));
  }

  async navigate(url: string) {
    this._clearCollectedArtifacts();

    const downloadEvent = callOnPageNoTrace(this.page, page => page.waitForEvent('download').catch(logUnhandledError));
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (_e: unknown) {
      const e = _e as Error;
      const mightBeDownload =
        e.message.includes('net::ERR_ABORTED') // chromium
        || e.message.includes('Download is starting'); // firefox + webkit
      if (!mightBeDownload)
        throw e;
      // on chromium, the download event is fired *after* page.goto rejects, so we wait a lil bit
      const download = await Promise.race([
        downloadEvent,
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
      if (!download)
        throw e;
      // Make sure other "download" listeners are notified first.
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }

    // Cap load event to 5 seconds, the page is operational at this point.
    await this.waitForLoadState('load', { timeout: 5000 });
  }

  consoleMessages(): ConsoleMessage[] {
    return this._consoleMessages;
  }

  requests(): Map<playwright.Request, playwright.Response | null> {
    return this._requests;
  }

  private _takeRecentConsoleMarkdown(): string[] {
    if (!this._recentConsoleMessages.length)
      return [];
    const result = this._recentConsoleMessages.map(message => {
      return `- ${trim(message.toString(), 100)}`;
    });
    return [`### New console messages`, ...result, ''];
  }

  private _listDownloadsMarkdown(): string[] {
    if (!this._downloads.length)
      return [];

    const result: string[] = ['### Downloads'];
    for (const entry of this._downloads) {
      if (entry.finished)
        result.push(`- Downloaded file ${entry.download.suggestedFilename()} to ${entry.outputFile}`);
      else
        result.push(`- Downloading file ${entry.download.suggestedFilename()} ...`);
    }
    result.push('');
    return result;
  }

  async captureSnapshot(truncateParams?: { maxTokens: number; pageNum?: number }): Promise<string> {
    // Use config truncation settings if no params provided
    const maxTokens = truncateParams?.maxTokens ?? this.context.config.truncateSnapshot;
    const pageNum = truncateParams?.pageNum || 1;

    // If truncation is enabled (maxTokens > 0), use the truncated snapshot method
    if (maxTokens > 0)
      return await this.captureTruncatedSnapshot(maxTokens, pageNum);

    // Otherwise return full snapshot
    return await this._captureFullSnapshot();
  }

  private async _captureFullSnapshot(): Promise<string> {
    const result: string[] = [];
    if (this.modalStates().length) {
      result.push(...this.modalStatesMarkdown());
      return result.join('\n');
    }

    result.push(...this._takeRecentConsoleMarkdown());
    result.push(...this._listDownloadsMarkdown());

    await this._raceAgainstModalStates(async () => {
      const snapshot = await (this.page as PageEx)._snapshotForAI();
      result.push(
          `### Page state`,
          `- Page URL: ${this.page.url()}`,
          `- Page Title: ${await this.page.title()}`,
          `- Page Snapshot:`,
          '```yaml',
          snapshot,
          '```',
      );
    });

    return result.join('\n');
  }

  async captureTruncatedSnapshot(maxTokens: number, pageNum: number = 1): Promise<string> {
    const tiktoken = await import('js-tiktoken');
    const encoder = tiktoken.getEncoding('cl100k_base'); // Claude uses cl100k_base encoding
    
    const fullSnapshot = await this._captureFullSnapshot();

    // Extract just the YAML content from the full snapshot
    const yamlMatch = fullSnapshot.match(/```yaml\n([\s\S]*?)\n```/);
    const rawSnapshot = yamlMatch ? yamlMatch[1] : '';

    // Split the raw snapshot into lines
    const lines = rawSnapshot.split('\n');

    // First pass: identify all element boundaries
    const elementBoundaries: number[] = [];
    let inElement = false;
    let elementStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length || 0;
      const trimmedLine = line.trim();

      // Detect element start (any line that starts a new structure)
      if (trimmedLine && !inElement) {
        inElement = true;
        elementStartLine = i;
      }

      // Detect element end (empty line or next element at same/lower indent level)
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        const nextLeadingSpaces = nextLine.match(/^(\s*)/)?.[1]?.length || 0;
        const nextTrimmed = nextLine.trim();

        if (!trimmedLine || (nextTrimmed && nextLeadingSpaces <= leadingSpaces && trimmedLine.startsWith('-'))) {
          if (inElement) {
            elementBoundaries.push(elementStartLine);
            elementBoundaries.push(i + 1);
            inElement = false;
          }
        }
      }
    }

    // Handle last element
    if (inElement) {
      elementBoundaries.push(elementStartLine);
      elementBoundaries.push(lines.length);
    }

    // Second pass: create pages based on element boundaries
    const pages: { startLine: number; endLine: number; startElement: number; endElement: number }[] = [];
    let currentPageStart = 0;
    let currentTokenCount = 0;
    let currentElementIndex = 0;

    for (let i = 0; i < elementBoundaries.length; i += 2) {
      const elementStart = elementBoundaries[i];
      const elementEnd = elementBoundaries[i + 1];

      // Calculate tokens in this element
      const elementText = lines.slice(elementStart, elementEnd).join('\n');
      const elementTokenCount = encoder.encode(elementText).length;

      // If adding this element would exceed page limit and we have content
      if (currentTokenCount + elementTokenCount > maxTokens && currentTokenCount > 0) {
        // End current page
        pages.push({
          startLine: currentPageStart,
          endLine: elementStart,
          startElement: Math.floor(currentElementIndex / 2),
          endElement: Math.floor(i / 2)
        });

        // Start new page
        currentPageStart = elementStart;
        currentTokenCount = elementTokenCount;
        currentElementIndex = i;
      } else {
        currentTokenCount += elementTokenCount;
      }
    }

    // Add final page
    if (currentTokenCount > 0) {
      pages.push({
        startLine: currentPageStart,
        endLine: lines.length,
        startElement: Math.floor(currentElementIndex / 2),
        endElement: Math.floor(elementBoundaries.length / 2)
      });
    }

    // Get the requested page
    const totalPages = pages.length || 1;
    const actualPage = Math.min(Math.max(1, pageNum), totalPages);
    const pageInfo = pages[actualPage - 1];

    if (!pageInfo) {
      // Empty snapshot
      const emptySnapshot = [
        `### Page state`,
        `- Page URL: ${this.page.url()}`,
        `- Page Title: ${await this.page.title()}`,
        `- Page Snapshot:`,
        '```yaml',
        '',
        '```'
      ].join('\n');
      return emptySnapshot;
    }

    // Extract lines for current page
    const pageLines = lines.slice(pageInfo.startLine, pageInfo.endLine);

    // Preserve indentation context if not starting from beginning
    let contextPrefix = '';
    if (pageInfo.startLine > 0) {
      // Find the parent context by looking backwards
      const firstLineIndent = lines[pageInfo.startLine].match(/^(\s*)/)?.[1]?.length || 0;

      for (let i = pageInfo.startLine - 1; i >= 0; i--) {
        const line = lines[i];
        const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
        const trimmed = line.trim();

        if (trimmed && indent < firstLineIndent) {
          contextPrefix = '# Context from previous page:\n# ' + line + '\n# ...\n\n';
          break;
        }
      }
    }

    // Build custom snapshot content
    const fullLines: string[] = [];

    // Add page state header
    fullLines.push(`### Page state`);
    fullLines.push(`- Page URL: ${this.page.url()}`);
    fullLines.push(`- Page Title: ${await this.page.title()}`);
    fullLines.push(totalPages === 1 ? `- Page Snapshot:` : `- Page Snapshot (Page ${actualPage} of ${totalPages}):`);
    fullLines.push('```yaml');

    if (contextPrefix)
      fullLines.push(contextPrefix.trim());


    fullLines.push(pageLines.join('\n'));

    if (actualPage < totalPages) {
      fullLines.push('');
      fullLines.push('# MORE CONTENT AVAILABLE');
      fullLines.push(`# This is page ${actualPage} of ${totalPages}`);
      fullLines.push(`# ${pageInfo.endElement - pageInfo.startElement} elements shown on this page`);
      fullLines.push(`# ${Math.floor(elementBoundaries.length / 2) - pageInfo.endElement} more elements on remaining pages`);
      fullLines.push(`# To load the next page, use browser_snapshot with page: ${actualPage + 1}`);
    }

    fullLines.push('```');

    const result = fullLines.join('\n');
    return result;
  }

  private _javaScriptBlocked(): boolean {
    return this._modalStates.some(state => state.type === 'dialog');
  }

  private async _raceAgainstModalStates(action: () => Promise<void>): Promise<ModalState | undefined> {
    if (this.modalStates().length)
      return this.modalStates()[0];

    const promise = new ManualPromise<ModalState>();
    const listener = (modalState: ModalState) => promise.resolve(modalState);
    this.once(TabEvents.modalState, listener);

    return await Promise.race([
      action().then(() => {
        this.off(TabEvents.modalState, listener);
        return undefined;
      }),
      promise,
    ]);
  }

  async waitForCompletion(callback: () => Promise<void>) {
    await this._raceAgainstModalStates(() => waitForCompletion(this, callback));
  }

  async refLocator(params: { element: string, ref: string }): Promise<playwright.Locator> {
    return (await this.refLocators([params]))[0];
  }

  async refLocators(params: { element: string, ref: string }[]): Promise<playwright.Locator[]> {
    const snapshot = await (this.page as PageEx)._snapshotForAI();
    return params.map(param => {
      if (!snapshot.includes(`[ref=${param.ref}]`))
        throw new Error(`Ref ${param.ref} not found in the current page snapshot. Try capturing new snapshot.`);
      return this.page.locator(`aria-ref=${param.ref}`).describe(param.element);
    });
  }

  async waitForTimeout(time: number) {
    if (this._javaScriptBlocked()) {
      await new Promise(f => setTimeout(f, time));
      return;
    }

    await callOnPageNoTrace(this.page, page => {
      return page.evaluate(() => new Promise(f => setTimeout(f, 1000)));
    });
  }
}

export type ConsoleMessage = {
  type: ReturnType<playwright.ConsoleMessage['type']> | undefined;
  text: string;
  toString(): string;
};

function messageToConsoleMessage(message: playwright.ConsoleMessage): ConsoleMessage {
  return {
    type: message.type(),
    text: message.text(),
    toString: () => `[${message.type().toUpperCase()}] ${message.text()} @ ${message.location().url}:${message.location().lineNumber}`,
  };
}

function pageErrorToConsoleMessage(errorOrValue: Error | any): ConsoleMessage {
  if (errorOrValue instanceof Error) {
    return {
      type: undefined,
      text: errorOrValue.message,
      toString: () => errorOrValue.stack || errorOrValue.message,
    };
  }
  return {
    type: undefined,
    text: String(errorOrValue),
    toString: () => String(errorOrValue),
  };
}

function trim(text: string, maxLength: number) {
  if (text.length <= maxLength)
    return text;
  return text.slice(0, maxLength) + '...';
}
