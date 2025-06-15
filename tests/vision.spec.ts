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

import { test, expect } from './fixtures.js';

test('browser_screen_capture (viewport)', async ({ visionClient, server }) => {
  expect(await visionClient.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  expect(await visionClient.callTool({
    name: 'browser_screen_capture',
  })).toEqual({
    content: [
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_screen_capture (fullPage)', async ({ visionClient, server }) => {
  // Create a page with scrollable content
  server.setContent('/long-page', `
    <title>Long Page</title>
    <body>
      <div style="height: 2000px; background: linear-gradient(to bottom, red, blue);">
        <h1>Top of page</h1>
        <div style="position: absolute; bottom: 0;">Bottom of page</div>
      </div>
    </body>
  `, 'text/html');

  expect(await visionClient.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}long-page` },
  })).toContainTextContent(`Navigate to http://localhost`);

  expect(await visionClient.callTool({
    name: 'browser_screen_capture',
    arguments: { fullPage: true },
  })).toEqual({
    content: [
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_screen_capture (single locator - single element)', async ({ visionClient, server }) => {
  server.setContent('/single-button', `
    <title>Single Button</title>
    <body>
      <button id="test-btn">Click me</button>
    </body>
  `, 'text/html');

  expect(await visionClient.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}single-button` },
  })).toContainTextContent(`Navigate to http://localhost`);

  expect(await visionClient.callTool({
    name: 'browser_screen_capture',
    arguments: { locator: '#test-btn' },
  })).toEqual({
    content: [
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_screen_capture (single locator - multiple elements)', async ({ visionClient, server }) => {
  server.setContent('/multiple-buttons', `
    <title>Multiple Buttons</title>
    <body>
      <button class="btn">Button 1</button>
      <button class="btn">Button 2</button>
      <button class="btn">Button 3</button>
    </body>
  `, 'text/html');

  expect(await visionClient.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-buttons` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await visionClient.callTool({
    name: 'browser_screen_capture',
    arguments: { locator: '.btn' },
  });

  expect(result).toEqual({
    content: [
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_screen_capture (multiple locators)', async ({ visionClient, server }) => {
  server.setContent('/mixed-elements', `
    <title>Mixed Elements</title>
    <body>
      <h1 id="title">Page Title</h1>
      <p class="description">Page description</p>
    </body>
  `, 'text/html');

  expect(await visionClient.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}mixed-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await visionClient.callTool({
    name: 'browser_screen_capture',
    arguments: { locators: ['#title', '.description'] },
  });

  expect(result).toEqual({
    content: [
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_screen_capture (locator - no elements found)', async ({ visionClient, server }) => {
  expect(await visionClient.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await visionClient.callTool({
    name: 'browser_screen_capture',
    arguments: { locator: '.non-existent' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ]
  });
});
