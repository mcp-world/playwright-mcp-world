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

import { defineTool } from './tool.js';
import * as javascript from '../javascript.js';
import { generateLocator } from './utils.js';

const snapshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_snapshot',
    title: 'Page snapshot',
    description: 'Capture accessibility snapshot of the current page, this is better than screenshot',
    inputSchema: z.object({}),
    type: 'readOnly',
  },

  handle: async context => {
    await context.ensureTab();

    return {
      code: [`// <internal code to capture accessibility snapshot>`],
      captureSnapshot: true,
      waitForNetwork: false,
    };
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

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const isMultipleLocators = params.locators && params.locators.length > 0;
    const isSingleLocator = params.locator;

    let code: string[] = [];
    let action: () => Promise<{ content: { type: 'text'; text: string }[] }> = async () => ({
      content: [{ type: 'text', text: 'No action defined' }]
    });

    if (isMultipleLocators) {
      code = [
        `// Capture accessibility snapshots of multiple elements: ${params.locators!.join(', ')}`,
        ...params.locators!.map(loc => `const snapshot_${params.locators!.indexOf(loc)} = await page.locator('${loc}').textContent();`)
      ];

      action = async () => {
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
        return {
          content: [{
            type: 'text' as 'text',
            text: snapshots.join('\n\n')
          }]
        };
      };
    } else if (isSingleLocator) {
      code = [
        `// Capture accessibility snapshot of element(s) by locator: ${params.locator}`,
        `const elements = await page.locator('${params.locator}').all();`,
        `const snapshots = await Promise.all(elements.map(async el => ({ text: await el.textContent(), tag: await el.evaluate(e => e.tagName.toLowerCase()), attrs: await el.evaluate(e => Array.from(e.attributes).reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {})) })));`
      ];

      action = async () => {
        try {
          const locator = tab.page.locator(params.locator!);
          const elements = await locator.all();

          if (elements.length === 0) {
            return {
              content: [{
                type: 'text' as 'text',
                text: `### Element Snapshot (${params.locator}):\nNo elements found with this locator`
              }]
            };
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

          return {
            content: [{
              type: 'text' as 'text',
              text: snapshots.join('\n\n')
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as 'text',
              text: `### Element Snapshot (${params.locator}):\nError: ${(error as Error).message}`
            }]
          };
        }
      };
    }

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  }
});

const elementSchema = z.object({
  element: z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
  ref: z.string().describe('Exact target element reference from the page snapshot'),
});

const click = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_click',
    title: 'Click',
    description: 'Perform click on a web page',
    inputSchema: elementSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const locator = tab.snapshotOrDie().refLocator(params);

    const code = [
      `// Click ${params.element}`,
      `await page.${await generateLocator(locator)}.click();`
    ];

    return {
      code,
      action: () => locator.click(),
      captureSnapshot: true,
      waitForNetwork: true,
    };
  },
});

const drag = defineTool({
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

  handle: async (context, params) => {
    const snapshot = context.currentTabOrDie().snapshotOrDie();
    const startLocator = snapshot.refLocator({ ref: params.startRef, element: params.startElement });
    const endLocator = snapshot.refLocator({ ref: params.endRef, element: params.endElement });

    const code = [
      `// Drag ${params.startElement} to ${params.endElement}`,
      `await page.${await generateLocator(startLocator)}.dragTo(page.${await generateLocator(endLocator)});`
    ];

    return {
      code,
      action: () => startLocator.dragTo(endLocator),
      captureSnapshot: true,
      waitForNetwork: true,
    };
  },
});

const hover = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_hover',
    title: 'Hover mouse',
    description: 'Hover over element on page',
    inputSchema: elementSchema,
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const snapshot = context.currentTabOrDie().snapshotOrDie();
    const locator = snapshot.refLocator(params);

    const code = [
      `// Hover over ${params.element}`,
      `await page.${await generateLocator(locator)}.hover();`
    ];

    return {
      code,
      action: () => locator.hover(),
      captureSnapshot: true,
      waitForNetwork: true,
    };
  },
});

const typeSchema = elementSchema.extend({
  text: z.string().describe('Text to type into the element'),
  submit: z.boolean().optional().describe('Whether to submit entered text (press Enter after)'),
  slowly: z.boolean().optional().describe('Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.'),
});

const type = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_type',
    title: 'Type text',
    description: 'Type text into editable element',
    inputSchema: typeSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const snapshot = context.currentTabOrDie().snapshotOrDie();
    const locator = snapshot.refLocator(params);

    const code: string[] = [];
    const steps: (() => Promise<void>)[] = [];

    if (params.slowly) {
      code.push(`// Press "${params.text}" sequentially into "${params.element}"`);
      code.push(`await page.${await generateLocator(locator)}.pressSequentially(${javascript.quote(params.text)});`);
      steps.push(() => locator.pressSequentially(params.text));
    } else {
      code.push(`// Fill "${params.text}" into "${params.element}"`);
      code.push(`await page.${await generateLocator(locator)}.fill(${javascript.quote(params.text)});`);
      steps.push(() => locator.fill(params.text));
    }

    if (params.submit) {
      code.push(`// Submit text`);
      code.push(`await page.${await generateLocator(locator)}.press('Enter');`);
      steps.push(() => locator.press('Enter'));
    }

    return {
      code,
      action: () => steps.reduce((acc, step) => acc.then(step), Promise.resolve()),
      captureSnapshot: true,
      waitForNetwork: true,
    };
  },
});

const selectOptionSchema = elementSchema.extend({
  values: z.array(z.string()).describe('Array of values to select in the dropdown. This can be a single value or multiple values.'),
});

const selectOption = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_select_option',
    title: 'Select option',
    description: 'Select an option in a dropdown',
    inputSchema: selectOptionSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const snapshot = context.currentTabOrDie().snapshotOrDie();
    const locator = snapshot.refLocator(params);

    const code = [
      `// Select options [${params.values.join(', ')}] in ${params.element}`,
      `await page.${await generateLocator(locator)}.selectOption(${javascript.formatObject(params.values)});`
    ];

    return {
      code,
      action: () => locator.selectOption(params.values).then(() => {}),
      captureSnapshot: true,
      waitForNetwork: true,
    };
  },
});

export default [
  snapshot,
  elementSnapshot,
  click,
  drag,
  hover,
  type,
  selectOption,
];
