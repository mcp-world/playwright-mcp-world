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

test('browser_get_html_content (full page)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/test-page', `
    <title>Test Page</title>
    <body>
      <h1>Main Title</h1>
      <p>Some content</p>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}test-page` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_html_content',
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Full Page HTML:'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('<title>Test Page</title>');
  expect(result.content[0].text).toContain('<h1>Main Title</h1>');
});

test('browser_get_html_content (single locator - single element)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/single-element', `
    <title>Single Element</title>
    <body>
      <div id="content">
        <h1>Title</h1>
        <p>Paragraph</p>
      </div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}single-element` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_html_content',
    arguments: { locator: '#content' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (#content):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('<h1>Title</h1>');
  expect(result.content[0].text).toContain('<p>Paragraph</p>');
});

test('browser_get_html_content (single locator - multiple elements)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/multiple-elements', `
    <title>Multiple Elements</title>
    <body>
      <div class="item">Item 1 content</div>
      <div class="item">Item 2 content</div>
      <div class="item">Item 3 content</div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_html_content',
    arguments: { locator: '.item' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringMatching(/### Element 1 \(\.item\):[\s\S]*### Element 2 \(\.item\):[\s\S]*### Element 3 \(\.item\):/),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('Item 1 content');
  expect(result.content[0].text).toContain('Item 2 content');
  expect(result.content[0].text).toContain('Item 3 content');
});

test('browser_get_html_content (multiple locators)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/mixed-elements', `
    <title>Mixed Elements</title>
    <body>
      <h1 id="title">Page Title</h1>
      <p class="description">Page description</p>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}mixed-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_html_content',
    arguments: { locators: ['#title', '.description'] },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringMatching(/### Element 1 \(#title\):[\s\S]*### Element 2 \(\.description\):/),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('Page Title');
  expect(result.content[0].text).toContain('Page description');
});

test('browser_get_html_content (locator - no elements found)', async ({ startClient, server }) => {
  const { client } = await startClient();

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_html_content',
    arguments: { locator: '.non-existent' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('No elements found with this locator'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_get_outer_html (single locator - single element)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/outer-html-test', `
    <title>Outer HTML Test</title>
    <body>
      <div id="wrapper" class="container">
        <span>Content</span>
      </div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}outer-html-test` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_outer_html',
    arguments: { locator: '#wrapper' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (#wrapper):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('<div id="wrapper" class="container">');
  expect(result.content[0].text).toContain('<span>Content</span>');
  expect(result.content[0].text).toContain('</div>');
});

test('browser_get_outer_html (single locator - multiple elements)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/multiple-outer-html', `
    <title>Multiple Outer HTML</title>
    <body>
      <button class="btn" data-id="1">Button 1</button>
      <button class="btn" data-id="2">Button 2</button>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-outer-html` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_outer_html',
    arguments: { locator: '.btn' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringMatching(/### Element 1 \(\.btn\):[\s\S]*### Element 2 \(\.btn\):/),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('data-id="1"');
  expect(result.content[0].text).toContain('data-id="2"');
  expect(result.content[0].text).toContain('Button 1');
  expect(result.content[0].text).toContain('Button 2');
});

test('browser_get_outer_html (multiple locators)', async ({ startClient, server }) => {
  const { client } = await startClient();

  server.setContent('/mixed-outer-html', `
    <title>Mixed Outer HTML</title>
    <body>
      <h1 id="heading">Main Heading</h1>
      <article class="content">Article content</article>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}mixed-outer-html` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_get_outer_html',
    arguments: { locators: ['#heading', '.content'] },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringMatching(/### Element 1 \(#heading\):[\s\S]*### Element 2 \(\.content\):/),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('<h1 id="heading">Main Heading</h1>');
  expect(result.content[0].text).toContain('<article class="content">Article content</article>');
});
