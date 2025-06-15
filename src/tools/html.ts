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

const htmlContentSchema = z.object({
  locator: z.string().optional().describe('Playwright locator string to get HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.'),
  locators: z.array(z.string()).optional().describe('Array of Playwright locator strings to get HTML content of multiple elements. Cannot be combined with locator parameter.'),
}).refine(data => {
  const paramCount = [data.locator, data.locators].filter(Boolean).length;
  return paramCount <= 1;
}, {
  message: 'Only one of locator or locators can be specified.',
  path: ['locator', 'locators']
});

const htmlContent = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_get_html_content',
    title: 'Get HTML content',
    description: `Get HTML content of the current page or specific elements. Returns full page HTML by default, or HTML of specific elements when locator(s) provided.`,
    inputSchema: htmlContentSchema,
    type: 'readOnly',
    advanced: {
      isNew: true,
      enhancementNote: 'Extract HTML content from page or specific elements with flexible locator support'
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
        `// Get HTML content of multiple elements: ${params.locators!.join(', ')}`,
        ...params.locators!.map(loc => `const html_${params.locators!.indexOf(loc)} = await page.locator('${loc}').innerHTML();`)
      ];

      action = async () => {
        const htmlContents = await Promise.all(
          params.locators!.map(async (loc, index) => {
            try {
              const html = await tab.page.locator(loc).innerHTML();
              return `### Element ${index + 1} (${loc}):\n\`\`\`html\n${html}\n\`\`\``;
            } catch (error) {
              return `### Element ${index + 1} (${loc}):\nError: ${(error as Error).message}`;
            }
          })
        );
        return {
          content: [{
            type: 'text' as 'text',
            text: htmlContents.join('\n\n')
          }]
        };
      };
    } else if (isSingleLocator) {
      code = [
        `// Get HTML content of element(s) by locator: ${params.locator}`,
        `const elements = await page.locator('${params.locator}').all();`,
        `const htmlContents = await Promise.all(elements.map(el => el.innerHTML()));`
      ];

      action = async () => {
        try {
          const locator = tab.page.locator(params.locator!);
          const elements = await locator.all();

          if (elements.length === 0) {
            return {
              content: [{
                type: 'text' as 'text',
                text: `### Element HTML (${params.locator}):\nNo elements found with this locator`
              }]
            };
          }

          const htmlContents = await Promise.all(
              elements.map(async (element, index) => {
                try {
                  const html = await element.innerHTML();
                  return `### Element ${index + 1} (${params.locator}):\n\`\`\`html\n${html}\n\`\`\``;
                } catch (error) {
                  return `### Element ${index + 1} (${params.locator}):\nError: ${(error as Error).message}`;
                }
              })
          );

          return {
            content: [{
              type: 'text' as 'text',
              text: htmlContents.join('\n\n')
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as 'text',
              text: `### Element HTML (${params.locator}):\nError: ${(error as Error).message}`
            }]
          };
        }
      };
    } else {
      code = [
        `// Get full page HTML content`,
        `const html = await page.content();`
      ];

      action = async () => {
        const html = await tab.page.content();
        return {
          content: [{
            type: 'text' as 'text',
            text: `### Full Page HTML:\n\`\`\`html\n${html}\n\`\`\``
          }]
        };
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

const outerHtmlContent = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_get_outer_html',
    title: 'Get outer HTML content',
    description: `Get outer HTML content of specific elements (includes the element tag itself). Requires locator(s) to be specified.`,
    inputSchema: z.object({
      locator: z.string().optional().describe('Playwright locator string to get outer HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.'),
      locators: z.array(z.string()).optional().describe('Array of Playwright locator strings to get outer HTML content of multiple elements. Cannot be combined with locator parameter.'),
    }).refine(data => {
      const paramCount = [data.locator, data.locators].filter(Boolean).length;
      return paramCount === 1;
    }, {
      message: 'Either locator or locators must be specified.',
      path: ['locator', 'locators']
    }),
    type: 'readOnly',
    advanced: {
      isNew: true,
      enhancementNote: 'Get complete element HTML including the element tag itself'
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
        `// Get outer HTML content of multiple elements: ${params.locators!.join(', ')}`,
        ...params.locators!.map(loc => `const outerHtml_${params.locators!.indexOf(loc)} = await page.locator('${loc}').evaluate(el => el.outerHTML);`)
      ];

      action = async () => {
        const htmlContents = await Promise.all(
          params.locators!.map(async (loc, index) => {
            try {
              const html = await tab.page.locator(loc).evaluate((el: Element) => el.outerHTML);
              return `### Element ${index + 1} (${loc}):\n\`\`\`html\n${html}\n\`\`\``;
            } catch (error) {
              return `### Element ${index + 1} (${loc}):\nError: ${(error as Error).message}`;
            }
          })
        );
        return {
          content: [{
            type: 'text' as 'text',
            text: htmlContents.join('\n\n')
          }]
        };
      };
    } else if (isSingleLocator) {
      code = [
        `// Get outer HTML content of element(s) by locator: ${params.locator}`,
        `const elements = await page.locator('${params.locator}').all();`,
        `const htmlContents = await Promise.all(elements.map(el => el.evaluate(el => el.outerHTML)));`
      ];

      action = async () => {
        try {
          const locator = tab.page.locator(params.locator!);
          const elements = await locator.all();

          if (elements.length === 0) {
            return {
              content: [{
                type: 'text' as 'text',
                text: `### Element Outer HTML (${params.locator}):\nNo elements found with this locator`
              }]
            };
          }

          const htmlContents = await Promise.all(
              elements.map(async (element, index) => {
                try {
                  const html = await element.evaluate((el: Element) => el.outerHTML);
                  return `### Element ${index + 1} (${params.locator}):\n\`\`\`html\n${html}\n\`\`\``;
                } catch (error) {
                  return `### Element ${index + 1} (${params.locator}):\nError: ${(error as Error).message}`;
                }
              })
          );

          return {
            content: [{
              type: 'text' as 'text',
              text: htmlContents.join('\n\n')
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as 'text',
              text: `### Element Outer HTML (${params.locator}):\nError: ${(error as Error).message}`
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

export default [
  htmlContent,
  outerHtmlContent,
];
