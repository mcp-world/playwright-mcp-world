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

import * as playwright from 'playwright';
import { callOnPageNoTrace } from './tools/utils.js';

type PageEx = playwright.Page & {
  _snapshotForAI: () => Promise<string>;
};

export class PageSnapshot {
  private _page: playwright.Page;
  private _text!: string;
  private _rawSnapshot!: string;

  constructor(page: playwright.Page) {
    this._page = page;
  }

  static async create(page: playwright.Page): Promise<PageSnapshot> {
    const snapshot = new PageSnapshot(page);
    await snapshot._build();
    return snapshot;
  }

  text(): string {
    return this._text;
  }

  truncatedText(maxTokens: number = 20000): { text: string; isTruncated: boolean; remainingElements: number } {
    // Using the approximation of 0.75 tokens per word
    const wordsPerToken = 1 / 0.75;
    const maxWords = Math.floor(maxTokens * wordsPerToken);
    
    // Split the raw snapshot into lines
    const lines = this._rawSnapshot.split('\n');
    const truncatedLines: string[] = [];
    let currentWordCount = 0;
    let isTruncated = false;
    let lastCompleteElementIndex = -1;
    
    // Track element depth to avoid breaking elements
    let currentIndentLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWords = line.split(/\s+/).filter(w => w.length > 0).length;
      
      // Calculate indent level (2 spaces per level in YAML)
      const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length || 0;
      const indentLevel = Math.floor(leadingSpaces / 2);
      
      // If we're about to exceed the limit
      if (currentWordCount + lineWords > maxWords && truncatedLines.length > 0) {
        // Only break at root level elements (indent level 0)
        if (indentLevel === 0) {
          isTruncated = true;
          lastCompleteElementIndex = i;
          break;
        }
      }
      
      truncatedLines.push(line);
      currentWordCount += lineWords;
      currentIndentLevel = indentLevel;
    }
    
    // Count remaining elements at root level
    let remainingElements = 0;
    if (isTruncated) {
      for (let i = lastCompleteElementIndex; i < lines.length; i++) {
        const line = lines[i];
        const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length || 0;
        const indentLevel = Math.floor(leadingSpaces / 2);
        if (indentLevel === 0 && line.trim().startsWith('-')) {
          remainingElements++;
        }
      }
    }
    
    // Build the final text
    let finalText = [
      `- Page Snapshot`,
      '```yaml',
      truncatedLines.join('\n'),
    ];
    
    if (isTruncated) {
      finalText.push('');
      finalText.push('# SNAPSHOT TRUNCATED');
      finalText.push(`# This snapshot was truncated at ${maxTokens} tokens (~${truncatedLines.length} lines)`);
      finalText.push(`# ${remainingElements} more root elements are available`);
      finalText.push('# To load the next part, use browser_snapshot with truncateSnapshot: false');
    }
    
    finalText.push('```');
    
    return {
      text: finalText.join('\n'),
      isTruncated,
      remainingElements
    };
  }

  private async _build() {
    this._rawSnapshot = await callOnPageNoTrace(this._page, page => (page as PageEx)._snapshotForAI());
    this._text = [
      `- Page Snapshot`,
      '```yaml',
      this._rawSnapshot,
      '```',
    ].join('\n');
  }

  refLocator(params: { element: string, ref: string }): playwright.Locator {
    return this._page.locator(`aria-ref=${params.ref}`).describe(params.element);
  }
}
