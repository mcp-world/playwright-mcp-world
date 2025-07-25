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

  truncatedText(maxTokens: number = 20000, pageNumber: number = 1): { text: string; isTruncated: boolean; currentPage: number; totalPages: number } {
    // Using the approximation of 0.75 words per token (or 4/3 tokens per word)
    const wordsPerToken = 0.75;
    const maxWordsPerPage = Math.floor(maxTokens * wordsPerToken);
    
    // Split the raw snapshot into lines
    const lines = this._rawSnapshot.split('\n');
    
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
    let currentWordCount = 0;
    let currentElementIndex = 0;
    
    for (let i = 0; i < elementBoundaries.length; i += 2) {
      const elementStart = elementBoundaries[i];
      const elementEnd = elementBoundaries[i + 1];
      
      // Calculate words in this element
      let elementWordCount = 0;
      for (let j = elementStart; j < elementEnd; j++) {
        elementWordCount += lines[j].split(/\s+/).filter(w => w.length > 0).length;
      }
      
      // If adding this element would exceed page limit and we have content
      if (currentWordCount + elementWordCount > maxWordsPerPage && currentWordCount > 0) {
        // End current page
        pages.push({
          startLine: currentPageStart,
          endLine: elementStart,
          startElement: Math.floor(currentElementIndex / 2),
          endElement: Math.floor(i / 2)
        });
        
        // Start new page
        currentPageStart = elementStart;
        currentWordCount = elementWordCount;
        currentElementIndex = i;
      } else {
        currentWordCount += elementWordCount;
      }
    }
    
    // Add final page
    if (currentWordCount > 0) {
      pages.push({
        startLine: currentPageStart,
        endLine: lines.length,
        startElement: Math.floor(currentElementIndex / 2),
        endElement: Math.floor(elementBoundaries.length / 2)
      });
    }
    
    // Get the requested page
    const totalPages = pages.length || 1;
    const actualPage = Math.min(Math.max(1, pageNumber), totalPages);
    const pageInfo = pages[actualPage - 1];
    
    if (!pageInfo) {
      // Empty snapshot
      return {
        text: [
          `- Page Snapshot (Page 1 of 1)`,
          '```yaml',
          '',
          '```'
        ].join('\n'),
        isTruncated: false,
        currentPage: 1,
        totalPages: 1
      };
    }
    
    // Extract lines for current page
    const pageLines = lines.slice(pageInfo.startLine, pageInfo.endLine);
    
    // Preserve indentation context if not starting from beginning
    let contextPrefix = '';
    if (pageInfo.startLine > 0) {
      // Find the parent context by looking backwards
      let parentIndent = -1;
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
    
    // Build the final text
    const finalText = [
      `- Page Snapshot (Page ${actualPage} of ${totalPages})`,
      '```yaml',
    ];
    
    if (contextPrefix) {
      finalText.push(contextPrefix);
    }
    
    finalText.push(pageLines.join('\n'));
    
    if (actualPage < totalPages) {
      finalText.push('');
      finalText.push('# MORE CONTENT AVAILABLE');
      finalText.push(`# This is page ${actualPage} of ${totalPages}`);
      finalText.push(`# ${pageInfo.endElement - pageInfo.startElement} elements shown on this page`);
      finalText.push(`# ${(Math.floor(elementBoundaries.length / 2)) - pageInfo.endElement} more elements on remaining pages`);
      finalText.push(`# To load the next page, use browser_snapshot with page: ${actualPage + 1}`);
    }
    
    finalText.push('```');
    
    return {
      text: finalText.join('\n'),
      isTruncated: actualPage < totalPages,
      currentPage: actualPage,
      totalPages
    };
  }

  private async _build() {
    this._rawSnapshot = await callOnPageNoTrace(this._page, page => (page as PageEx)._snapshotForAI());
    this._text = [
      `- Page Snapshot:`,
      '```yaml',
      this._rawSnapshot,
      '```',
    ].join('\n');
  }

  refLocator(params: { element: string, ref: string }): playwright.Locator {
    return this._page.locator(`aria-ref=${params.ref}`).describe(params.element);
  }
}
