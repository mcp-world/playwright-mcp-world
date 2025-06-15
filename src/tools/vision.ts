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

const elementSchema = z.object({
  element: z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
});

const screenshotSchema = z.object({
  fullPage: z.boolean().optional().describe('Whether to take a screenshot of the full scrollable page. Cannot be combined with locator/locators parameters.'),
  locator: z.string().optional().describe('Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with fullPage/locators parameters.'),
  locators: z.array(z.string()).optional().describe('Array of Playwright locator strings to screenshot multiple elements. Cannot be combined with fullPage/locator parameters.'),
}).refine(data => {
  const paramCount = [data.fullPage, data.locator, data.locators].filter(Boolean).length;
  return paramCount <= 1;
}, {
  message: 'Only one of fullPage, locator, or locators can be specified.',
  path: ['fullPage', 'locator', 'locators']
});

const screenshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_screen_capture',
    title: 'Take a screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: screenshotSchema,
    type: 'readOnly',
    advanced: {
      isEnhanced: true,
      enhancementNote: 'Enhanced with fullPage and locator/locators support for flexible vision mode capture'
    },
  },

  handle: async (context, params) => {
    const tab = await context.ensureTab();
    const options = {
      type: 'jpeg' as 'jpeg',
      quality: 50,
      scale: 'css' as 'css',
      fullPage: params.fullPage || false
    };

    const isMultipleLocators = params.locators && params.locators.length > 0;
    const isSingleLocator = params.locator;
    const screenshotType = params.fullPage ? 'full page' : (isSingleLocator ? 'element' : (isMultipleLocators ? 'multiple elements' : 'viewport'));

    let code: string[] = [];
    let action: () => Promise<{ content: { type: 'image'; data: string; mimeType: string }[] }>;

    if (isMultipleLocators) {
      code = [
        `// Take screenshots of multiple elements: ${params.locators!.join(', ')}`,
        ...params.locators!.map(loc => `await page.locator('${loc}').screenshot(${javascript.formatObject(options)});`)
      ];

      action = async () => {
        const screenshots = await Promise.all(
          params.locators!.map(loc => tab.page.locator(loc).screenshot(options))
        );
        return {
          content: screenshots.map(buffer => ({
            type: 'image' as 'image',
            data: buffer.toString('base64'),
            mimeType: 'image/jpeg'
          }))
        };
      };
    } else if (isSingleLocator) {
      code = [
        `// Take screenshot of element(s) by locator: ${params.locator}`,
        `const elements = await page.locator('${params.locator}').all();`,
        `const screenshots = await Promise.all(elements.map(el => el.screenshot(${javascript.formatObject(options)})));`
      ];

      action = async () => {
        const locator = tab.page.locator(params.locator!);
        const elements = await locator.all();

        if (elements.length === 0) {
          return {
            content: []
          };
        }

        const screenshots = await Promise.all(
            elements.map(element => element.screenshot(options))
        );

        return {
          content: screenshots.map(buffer => ({
            type: 'image' as 'image',
            data: buffer.toString('base64'),
            mimeType: 'image/jpeg'
          }))
        };
      };
    } else {
      code = [
        `// Take a screenshot of the ${screenshotType}`,
        `await page.screenshot(${javascript.formatObject(options)});`
      ];

      action = async () => {
        const buffer = await tab.page.screenshot(options);
        return {
          content: [{ type: 'image' as 'image', data: buffer.toString('base64'), mimeType: 'image/jpeg' }]
        };
      };
    }

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false
    };
  },
});

const moveMouse = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_screen_move_mouse',
    title: 'Move mouse',
    description: 'Move mouse to a given position',
    inputSchema: elementSchema.extend({
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const code = [
      `// Move mouse to (${params.x}, ${params.y})`,
      `await page.mouse.move(${params.x}, ${params.y});`,
    ];
    const action = () => tab.page.mouse.move(params.x, params.y);
    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false
    };
  },
});

const click = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_screen_click',
    title: 'Click',
    description: 'Click left mouse button',
    inputSchema: elementSchema.extend({
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const code = [
      `// Click mouse at coordinates (${params.x}, ${params.y})`,
      `await page.mouse.move(${params.x}, ${params.y});`,
      `await page.mouse.down();`,
      `await page.mouse.up();`,
    ];
    const action = async () => {
      await tab.page.mouse.move(params.x, params.y);
      await tab.page.mouse.down();
      await tab.page.mouse.up();
    };
    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: true,
    };
  },
});

const drag = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_screen_drag',
    title: 'Drag mouse',
    description: 'Drag left mouse button',
    inputSchema: elementSchema.extend({
      startX: z.number().describe('Start X coordinate'),
      startY: z.number().describe('Start Y coordinate'),
      endX: z.number().describe('End X coordinate'),
      endY: z.number().describe('End Y coordinate'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Drag mouse from (${params.startX}, ${params.startY}) to (${params.endX}, ${params.endY})`,
      `await page.mouse.move(${params.startX}, ${params.startY});`,
      `await page.mouse.down();`,
      `await page.mouse.move(${params.endX}, ${params.endY});`,
      `await page.mouse.up();`,
    ];

    const action = async () => {
      await tab.page.mouse.move(params.startX, params.startY);
      await tab.page.mouse.down();
      await tab.page.mouse.move(params.endX, params.endY);
      await tab.page.mouse.up();
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: true,
    };
  },
});

const type = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_screen_type',
    title: 'Type text',
    description: 'Type text',
    inputSchema: z.object({
      text: z.string().describe('Text to type into the element'),
      submit: z.boolean().optional().describe('Whether to submit entered text (press Enter after)'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Type ${params.text}`,
      `await page.keyboard.type('${params.text}');`,
    ];

    const action = async () => {
      await tab.page.keyboard.type(params.text);
      if (params.submit)
        await tab.page.keyboard.press('Enter');
    };

    if (params.submit) {
      code.push(`// Submit text`);
      code.push(`await page.keyboard.press('Enter');`);
    }

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: true,
    };
  },
});

export default [
  screenshot,
  moveMouse,
  click,
  drag,
  type,
];
