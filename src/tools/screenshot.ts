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

import { defineTabTool } from './tool.js';
import * as javascript from '../javascript.js';
import { outputFile } from '../config.js';
import { generateLocator } from './utils.js';

import type * as playwright from 'playwright';

const screenshotSchema = z.object({
  raw: z.boolean().optional().describe('Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.'),
  filename: z.string().optional().describe('File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified.'),
  fullPage: z.boolean().optional().describe('Whether to take a screenshot of the full scrollable page. Cannot be combined with element/ref/locator parameters.'),
  locator: z.string().optional().describe('Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with element/ref/fullPage parameters.'),
  element: z.string().optional().describe('Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.'),
  ref: z.string().optional().describe('Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.'),
  format: z.enum(['png', 'jpeg']).optional().describe('Image format (defaults to png if raw is true, jpeg otherwise)'),
  quality: z.number().min(0).max(100).optional().describe('JPEG quality (0-100), defaults to 50 for JPEG format'),
  captureSnapshot: z.boolean().optional().describe('Whether to capture a page snapshot after taking the screenshot. Defaults to false.')
}).refine(data => {
  return !!data.element === !!data.ref;
}, {
  message: 'Both element and ref must be provided or neither.',
  path: ['ref', 'element']
}).refine(data => {
  return !(data.fullPage && (data.element || data.ref || data.locator));
}, {
  message: 'fullPage cannot be used with element screenshots.',
  path: ['fullPage']
}).refine(data => {
  return !(data.locator && (data.element || data.ref || data.fullPage));
}, {
  message: 'locator cannot be combined with element/ref/fullPage parameters.',
  path: ['locator']
});

const screenshot = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_take_screenshot',
    title: 'Take a screenshot',
    description: `Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.`,
    inputSchema: screenshotSchema,
    type: 'readOnly',
    advanced: {
      isEnhanced: true,
      enhancementNote: 'Enhanced with fullPage and locator support for flexible screenshot capture'
    },
  },

  handle: async (tab, params, response) => {
    // Determine file type: use format if provided, otherwise use raw flag
    const fileType = params.format || (params.raw ? 'png' : 'jpeg');

    // Generate filename if saving to file
    const fileName = params.filename ? await outputFile(tab.context.config, params.filename) :
      await outputFile(tab.context.config, `page-${new Date().toISOString()}.${fileType}`);

    // Set quality for JPEG
    const quality = fileType === 'jpeg' ? (params.quality || 50) : undefined;
    const options: playwright.PageScreenshotOptions = {
      type: fileType,
      quality,
      scale: 'css',
      path: fileName,
      ...(params.fullPage !== undefined && { fullPage: params.fullPage })
    };
    const isElementScreenshot = params.element && params.ref;
    const isLocatorScreenshot = params.locator;

    let screenshotType = 'viewport';
    if (isElementScreenshot)
      screenshotType = 'element';
    else if (isLocatorScreenshot)
      screenshotType = 'locator element(s)';
    else if (params.fullPage)
      screenshotType = 'full page';

    const screenshotTarget = isElementScreenshot ? params.element : (isLocatorScreenshot ? `element(s) by locator "${params.locator}"` : screenshotType);
    response.addCode(`// Screenshot ${screenshotTarget} and save it as ${fileName}`);

    // Only get snapshot when element screenshot is needed
    let locator = null;
    if (params.ref)
      locator = await tab.refLocator({ element: params.element || '', ref: params.ref });
    else if (params.locator)
      locator = tab.page.locator(params.locator);

    if (locator && params.locator) {
      response.addCode(`const elements = await page.locator('${params.locator}').all();`);
      response.addCode(`const screenshots = await Promise.all(elements.map(el => el.screenshot(${javascript.formatObject(options)})));`);
    } else if (locator) {
      response.addCode(`await ${await generateLocator(locator)}.screenshot(${javascript.formatObject(options)});`);
    } else {
      response.addCode(`await page.screenshot(${javascript.formatObject(options)});`);
    }

    if (params.captureSnapshot)
      response.setIncludeSnapshot();

    await tab.waitForCompletion(async () => {
      if (params.locator) {
        const locatorElement = tab.page.locator(params.locator);
        const elements = await locatorElement.all();

        if (elements.length === 0) {
          const screenshot = await tab.page.screenshot(options);
          response.addResult(`No elements found for locator "${params.locator}". Screenshot of full page taken (${screenshot.length} bytes, ${fileType.toUpperCase()})`);
          response.addImage({
            contentType: fileType === 'png' ? 'image/png' : 'image/jpeg',
            data: screenshot
          });
          return;
        }

        const screenshots = await Promise.all(
            elements.map(element => element.screenshot(options))
        );

        response.addResult(`Screenshot taken of ${screenshots.length} element(s) matching locator "${params.locator}" (${fileType.toUpperCase()})`);
        screenshots.forEach(screenshot => {
          response.addImage({
            contentType: fileType === 'png' ? 'image/png' : 'image/jpeg',
            data: screenshot
          });
        });
      } else {
        const buffer = locator ? await locator.screenshot(options) : await tab.page.screenshot(options);
        response.addResult(`Took the ${screenshotTarget} screenshot and saved it as ${fileName}`);
        response.addImage({
          contentType: fileType === 'png' ? 'image/png' : 'image/jpeg',
          data: buffer
        });
      }
    });
  }
});

export default [
  screenshot,
];
