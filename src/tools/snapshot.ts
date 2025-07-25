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

import { z } from 'zod';

import { defineTabTool, defineTool } from './tool.js';
import * as javascript from '../javascript.js';
import { generateLocator } from './utils.js';

const snapshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_snapshot',
    title: 'Page snapshot',
    description: 'Capture accessibility snapshot of the current page, this is better than screenshot',
    inputSchema: z.object({
      truncateSnapshot: z.boolean().optional().describe('Whether to truncate large snapshots at 20000 tokens. Defaults to true.'),
      page: z.number().min(1).optional().describe('Page number to retrieve when snapshot is truncated. Defaults to 1.'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params, response) => {
    await context.ensureTab();
    
    const maxTokens = context.config.truncateSnapshot;
    const truncate = params.truncateSnapshot !== false && maxTokens > 0;
    const pageNum = params.page || 1;
    
    if (!truncate) {
      response.setIncludeSnapshot();
      return;
    }
    
    // Implement truncation logic based on pageSnapshot.ts
    const tab = context.currentTabOrDie();
    const fullSnapshot = await tab.captureSnapshot();
    
    // Extract just the YAML content from the full snapshot
    const yamlMatch = fullSnapshot.match(/```yaml\n([\s\S]*?)\n```/);
    const rawSnapshot = yamlMatch ? yamlMatch[1] : '';
    
    // Using the approximation of 0.75 words per token (or 4/3 tokens per word)
    const wordsPerToken = 0.75;
    const maxWordsPerPage = Math.floor(maxTokens * wordsPerToken);
    
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
    const actualPage = Math.min(Math.max(1, pageNum), totalPages);
    const pageInfo = pages[actualPage - 1];
    
    if (!pageInfo) {
      // Empty snapshot
      const emptySnapshot = [
        `### Page state`,
        `- Page URL: ${tab.page.url()}`,
        `- Page Title: ${await tab.page.title()}`,
        `- Page Snapshot (Page 1 of 1):`,
        '```yaml',
        '',
        '```'
      ].join('\n');
      response.setCustomSnapshot(emptySnapshot);
      return;
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
    
    // Build custom snapshot content
    const fullLines: string[] = [];
    
    // Add page state header
    fullLines.push(`### Page state`);
    fullLines.push(`- Page URL: ${tab.page.url()}`);
    fullLines.push(`- Page Title: ${await tab.page.title()}`);
    fullLines.push(`- Page Snapshot (Page ${actualPage} of ${totalPages}):`);
    fullLines.push('```yaml');
    
    if (contextPrefix) {
      fullLines.push(contextPrefix.trim());
    }
    
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
    
    // Use the new setCustomSnapshot method
    response.setCustomSnapshot(fullLines.join('\n'));
  },
});

const elementSnapshotSchema = z.object({
  locator: z.string().optional().describe('Playwright locator string to capture accessibility snapshot of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.'),
  locators: z.array(z.string()).optional().describe('Array of Playwright locator strings to capture accessibility snapshots of multiple elements. Cannot be combined with locator parameter.'),
}).refine(data => {
  const paramCount = [data.locator, data.locators].filter(Boolean).length;
  return paramCount >= 1;
}, {
  message: 'Either locator or locators must be specified.',
  path: ['locator', 'locators']
});

const elementSnapshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_element_snapshot',
    title: 'Element snapshot',
    description: 'Capture accessibility snapshot of specific elements by locator(s). Better than screenshot for specific elements.',
    inputSchema: elementSnapshotSchema,
    type: 'readOnly',
    advanced: {
      isNew: true,
      enhancementNote: 'Capture structured accessibility data for specific elements using locators'
    },
  },

  handle: async (context, params, response) => {
    const tab = context.currentTabOrDie();
    const isMultipleLocators = params.locators && params.locators.length > 0;
    const isSingleLocator = params.locator;

    if (isMultipleLocators) {
      response.addCode(`// Capture accessibility snapshots of multiple elements: ${params.locators!.join(', ')}`);
      params.locators!.forEach((loc, index) => {
        response.addCode(`const snapshot_${index} = await page.locator('${loc}').textContent();`);
      });

      await tab.waitForCompletion(async () => {
        const snapshots = await Promise.all(
          params.locators!.map(async (loc, index) => {
            try {
              const locator = tab.page.locator(loc);
              const isVisible = await locator.isVisible();
              if (!isVisible)
                return `### Element ${index + 1} (${loc}):\nElement not visible or not found`;

              const text = await locator.textContent();
              const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
              const attributes = await locator.evaluate(el => {
                const attrs: Record<string, string> = {};
                for (const attr of el.attributes)
                  attrs[attr.name] = attr.value;
                return attrs;
              });

              const result = [`### Element ${index + 1} (${loc}):`];
              result.push('```yaml');
              result.push(`- ${tagName}${attributes.id ? ` #${attributes.id}` : ''}${attributes.class ? ` .${attributes.class.split(' ').join('.')}` : ''}: ${text || 'No text content'}`);
              if (Object.keys(attributes).length > 0) {
                result.push(`  attributes:`);
                for (const [key, value] of Object.entries(attributes))
                  result.push(`    ${key}: "${value}"`);
              }
              result.push('```');
              return result.join('\n');
            } catch (error) {
              return `### Element ${index + 1} (${loc}):\nError: ${(error as Error).message}`;
            }
          })
        );
        response.addResult(snapshots.join('\n\n'));
      });
    } else if (isSingleLocator) {
      response.addCode(`// Capture accessibility snapshot of element(s) by locator: ${params.locator}`);
      response.addCode(`const elements = await page.locator('${params.locator}').all();`);
      response.addCode(`const snapshots = await Promise.all(elements.map(async el => ({ text: await el.textContent(), tag: await el.evaluate(e => e.tagName.toLowerCase()), attrs: await el.evaluate(e => Array.from(e.attributes).reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {})) })));`);

      await tab.waitForCompletion(async () => {
        try {
          const locator = tab.page.locator(params.locator!);
          const elements = await locator.all();

          if (elements.length === 0) {
            response.addResult(`### Element Snapshot (${params.locator}):\nNo elements found with this locator`);
            return;
          }

          const snapshots = await Promise.all(
            elements.map(async (element, index) => {
              try {
                const isVisible = await element.isVisible();
                if (!isVisible)
                  return `### Element ${index + 1} (${params.locator}):\nElement not visible`;

                const text = await element.textContent();
                const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                const attributes = await element.evaluate(el => {
                  const attrs: Record<string, string> = {};
                  for (const attr of el.attributes)
                    attrs[attr.name] = attr.value;
                  return attrs;
                });

                const result = [`### Element ${index + 1} (${params.locator}):`];
                result.push('```yaml');
                result.push(`- ${tagName}${attributes.id ? ` #${attributes.id}` : ''}${attributes.class ? ` .${attributes.class.split(' ').join('.')}` : ''}: ${text || 'No text content'}`);
                if (Object.keys(attributes).length > 0) {
                  result.push(`  attributes:`);
                  for (const [key, value] of Object.entries(attributes))
                    result.push(`    ${key}: "${value}"`);
                }
                result.push('```');
                return result.join('\n');
              } catch (error) {
                return `### Element ${index + 1} (${params.locator}):\nError: ${(error as Error).message}`;
              }
            })
          );
          response.addResult(snapshots.join('\n\n'));
        } catch (error) {
          response.addResult(`### Element Snapshot (${params.locator}):\nError: ${(error as Error).message}`);
        }
      });
    }
  }
});

export const elementSchema = z.object({
  element: z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
  ref: z.string().describe('Exact target element reference from the page snapshot'),
});

const clickSchema = elementSchema.extend({
  doubleClick: z.boolean().optional().describe('Whether to perform a double click instead of a single click'),
  button: z.enum(['left', 'right', 'middle']).optional().describe('Button to click, defaults to left'),
});

const click = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_click',
    title: 'Click',
    description: 'Perform click on a web page',
    inputSchema: clickSchema,
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    const locator = await tab.refLocator(params);
    const button = params.button;
    const buttonAttr = button ? `{ button: '${button}' }` : '';

    if (params.doubleClick) {
      response.addCode(`// Double click ${params.element}`);
      response.addCode(`await page.${await generateLocator(locator)}.dblclick(${buttonAttr});`);
    } else {
      response.addCode(`// Click ${params.element}`);
      response.addCode(`await page.${await generateLocator(locator)}.click(${buttonAttr});`);
    }

    await tab.waitForCompletion(async () => {
      if (params.doubleClick)
        await locator.dblclick({ button });
      else
        await locator.click({ button });
    });
  },
});

const drag = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_drag',
    title: 'Drag mouse',
    description: 'Perform drag and drop between two elements',
    inputSchema: z.object({
      startElement: z.string().describe('Human-readable source element description used to obtain the permission to interact with the element'),
      startRef: z.string().describe('Exact source element reference from the page snapshot'),
      endElement: z.string().describe('Human-readable target element description used to obtain the permission to interact with the element'),
      endRef: z.string().describe('Exact target element reference from the page snapshot'),
    }),
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    const [startLocator, endLocator] = await tab.refLocators([
      { ref: params.startRef, element: params.startElement },
      { ref: params.endRef, element: params.endElement },
    ]);

    await tab.waitForCompletion(async () => {
      await startLocator.dragTo(endLocator);
    });

    response.addCode(`await page.${await generateLocator(startLocator)}.dragTo(page.${await generateLocator(endLocator)});`);
  },
});

const hover = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_hover',
    title: 'Hover mouse',
    description: 'Hover over element on page',
    inputSchema: elementSchema,
    type: 'readOnly',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    const locator = await tab.refLocator(params);
    response.addCode(`await page.${await generateLocator(locator)}.hover();`);

    await tab.waitForCompletion(async () => {
      await locator.hover();
    });
  },
});

const selectOptionSchema = elementSchema.extend({
  values: z.array(z.string()).describe('Array of values to select in the dropdown. This can be a single value or multiple values.'),
});

const selectOption = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_select_option',
    title: 'Select option',
    description: 'Select an option in a dropdown',
    inputSchema: selectOptionSchema,
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    const locator = await tab.refLocator(params);
    response.addCode(`// Select options [${params.values.join(', ')}] in ${params.element}`);
    response.addCode(`await page.${await generateLocator(locator)}.selectOption(${javascript.formatObject(params.values)});`);

    await tab.waitForCompletion(async () => {
      await locator.selectOption(params.values);
    });
  },
});

export default [
  snapshot,
  elementSnapshot,
  click,
  drag,
  hover,
  selectOption,
];
