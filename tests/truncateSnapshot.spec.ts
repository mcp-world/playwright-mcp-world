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

import { expect, test } from './fixtures.js';

test.describe('truncateSnapshot', () => {
  // Helper function to generate predictable word content
  const generateWords = (count: number): string => {
    const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const result: string[] = [];
    for (let i = 0; i < count; i++)
      result.push(words[i % words.length]);

    return result.join(' ');
  };

  test('should truncate snapshot by default', async ({ client, server }) => {
    // Set up the test page content with enough words to trigger truncation
    // 20000 tokens * 0.75 words per token = 15,000 words per page
    // To guarantee multiple pages, we'll generate 30,000 words
    const wordsPerParagraph = 100;
    const paragraphsPerSection = 10;
    const sections = 30; // 30 sections * 10 paragraphs * 100 words = 30,000 words

    server.setContent('/snapshot-truncation.html', `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Snapshot Truncation Test</title>
      </head>
      <body>
        <h1>Snapshot Truncation Test Page</h1>
        <p>This page contains a large amount of content to test snapshot truncation.</p>
        
        <div id="content">
          ${Array.from({ length: sections }, (_, section) => `
            <div class="section" id="section-${section + 1}">
              <h2>Section ${section + 1}</h2>
              ${Array.from({ length: paragraphsPerSection }, (_, p) => `
                <p class="content-paragraph">Paragraph ${p + 1} in section ${section + 1}: ${generateWords(wordsPerParagraph)}</p>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `, 'text/html');

    // Navigate to the page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: `${server.PREFIX}snapshot-truncation.html` },
    });

    // Take snapshot without parameters (should truncate by default)
    const result = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // Check that result contains truncation indicators
    const textContent = result.content.map((c: any) => c.text).join('\n');
    expect(textContent).toContain('Page 1 of');
    expect(textContent).toContain('MORE CONTENT AVAILABLE');
    expect(textContent).toContain('To load the next page, use browser_snapshot with page: 2');
  });

  test('should not truncate when truncateSnapshot is 0', async ({ startClient, server }) => {
    // Set up the test page content with 30,000 words
    // With truncateSnapshot: 0, we should get all content
    const { client } = await startClient({
      config: { truncateSnapshot: 0 }
    });
    const wordsPerParagraph = 100;
    const paragraphsPerSection = 10;
    const sections = 30; // 30,000 words total

    server.setContent('/snapshot-truncation-2.html', `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Snapshot Truncation Test 2</title>
      </head>
      <body>
        <h1>Test Page</h1>
        ${Array.from({ length: sections }, (_, i) => `
          <div id="section-${i + 1}">
            <h2>Section ${i + 1}</h2>
            ${Array.from({ length: paragraphsPerSection }, (_, j) => `
              <p>Paragraph ${j + 1} section ${i + 1}: ${generateWords(wordsPerParagraph)}</p>
            `).join('')}
          </div>
        `).join('')}
      </body>
      </html>
    `, 'text/html');

    // Navigate to the page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: `${server.PREFIX}snapshot-truncation-2.html` },
    });

    // Take snapshot (truncation disabled via config)
    const result = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // Check that result does not contain truncation indicators
    const textContent = result.content.map((c: any) => c.text).join('\n');
    expect(textContent).not.toContain('MORE CONTENT AVAILABLE');
    expect(textContent).not.toContain('Page 1 of');
    expect(textContent).toContain('Page Snapshot');
  });

  test('should support pagination', async ({ client, server }) => {
    // Set up the test page content with enough words for at least 3 pages
    // Each page should have ~15,000 words, so we need 45,000+ words
    const wordsPerParagraph = 100;
    const paragraphsPerSection = 10;
    const sections = 50; // 50,000 words total (should give us 3+ pages)

    server.setContent('/snapshot-truncation-3.html', `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Snapshot Truncation Test 3</title>
      </head>
      <body>
        <h1>Pagination Test</h1>
        ${Array.from({ length: sections }, (_, i) => `
          <div id="section-${i + 1}">
            <h2>Section ${i + 1}</h2>
            ${Array.from({ length: paragraphsPerSection }, (_, j) => `
              <p>Section ${i + 1} paragraph ${j + 1}: ${generateWords(wordsPerParagraph)}</p>
            `).join('')}
          </div>
        `).join('')}
      </body>
      </html>
    `, 'text/html');

    // Navigate to the page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: `${server.PREFIX}snapshot-truncation-3.html` },
    });

    // Take snapshot of page 2
    const result = await client.callTool({
      name: 'browser_snapshot',
      arguments: { page: 2 },
    });

    // Check that result shows page 2
    const textContent = result.content.map((c: any) => c.text).join('\n');
    expect(textContent).toContain('Page 2 of');
    expect(textContent).toContain('Context from previous page:');
  });

  test('should handle page number beyond total pages', async ({ client, server }) => {
    // Set up the test page content with enough words for ~2 pages
    // This ensures we can test requesting page 999 when only 2 pages exist
    const wordsPerParagraph = 100;
    const paragraphsPerSection = 10;
    const sections = 25; // 25,000 words (should give us ~2 pages)

    server.setContent('/snapshot-truncation-4.html', `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Snapshot Truncation Test 4</title>
      </head>
      <body>
        <h1>Page Limit Test</h1>
        ${Array.from({ length: sections }, (_, i) => `
          <div id="section-${i + 1}">
            <h2>Section ${i + 1}</h2>
            ${Array.from({ length: paragraphsPerSection }, (_, j) => `
              <p>Test content section ${i + 1} paragraph ${j + 1}: ${generateWords(wordsPerParagraph)}</p>
            `).join('')}
          </div>
        `).join('')}
      </body>
      </html>
    `, 'text/html');

    // Navigate to the page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: `${server.PREFIX}snapshot-truncation-4.html` },
    });

    // Take snapshot of a very high page number
    const result = await client.callTool({
      name: 'browser_snapshot',
      arguments: { page: 999 },
    });

    // Should show the last available page
    const textContent = result.content.map((c: any) => c.text).join('\n');
    expect(textContent).toContain('Page Snapshot');
    expect(textContent).toMatch(/Page \d+ of \d+/);
  });

  test.skip('browser_navigate with real URL should truncate', async ({ startClient }) => {
    // Start client with default truncation (20000 tokens)
    const { client } = await startClient();
    
    const result = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://theredocs.com/signup/login' }
    });

    const textContent = result.content.map((c: any) => c.text).join('\n');
    console.log('Result length:', textContent.length);
    console.log('Estimated tokens:', textContent.length / 4);
    
    // Should contain page info
    expect(textContent).toContain('Page state');
    expect(textContent).toContain('ログイン | クラウド賃貸管理ソフトのリドックス');
    
    // Check if truncation is working
    const hasPageInfo = textContent.includes('Page Snapshot (Page 1 of');
    console.log('Has page info:', hasPageInfo);
    
    if (hasPageInfo) {
      const pageMatch = textContent.match(/Page Snapshot \(Page 1 of (\d+)\)/);
      console.log('Page match:', pageMatch);
    }
    
    // Log a sample of the snapshot to see what's happening
    const snapshotStart = textContent.indexOf('```yaml');
    const snapshotEnd = textContent.indexOf('```', snapshotStart + 7);
    if (snapshotStart !== -1 && snapshotEnd !== -1) {
      const snapshotContent = textContent.substring(snapshotStart, snapshotEnd + 3);
      console.log('Snapshot preview (first 500 chars):', snapshotContent.substring(0, 500));
    }
  });
});
