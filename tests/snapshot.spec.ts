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

test('browser_element_snapshot (single locator - single element)', async ({ client, server }) => {
  server.setContent('/single-element', `
    <title>Single Element</title>
    <body>
      <div id="content" class="container" data-test="main">
        <h1>Main Title</h1>
        <p>Some content here</p>
      </div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}single-element` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
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

  expect(result.content[0].text).toContain('```yaml');
  expect(result.content[0].text).toContain('- div #content .container:');
  expect(result.content[0].text).toContain('Main Title');
  expect(result.content[0].text).toContain('Some content here');
  expect(result.content[0].text).toContain('attributes:');
  expect(result.content[0].text).toContain('id: "content"');
  expect(result.content[0].text).toContain('class: "container"');
  expect(result.content[0].text).toContain('data-test: "main"');
});

test('browser_element_snapshot (single locator - multiple elements)', async ({ client, server }) => {
  server.setContent('/multiple-elements', `
    <title>Multiple Elements</title>
    <body>
      <div class="item" data-id="1">First item</div>
      <div class="item" data-id="2">Second item</div>
      <div class="item" data-id="3">Third item</div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
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

  expect(result.content[0].text).toContain('First item');
  expect(result.content[0].text).toContain('Second item');
  expect(result.content[0].text).toContain('Third item');
  expect(result.content[0].text).toContain('data-id: "1"');
  expect(result.content[0].text).toContain('data-id: "2"');
  expect(result.content[0].text).toContain('data-id: "3"');
});

test('browser_element_snapshot (multiple locators)', async ({ client, server }) => {
  server.setContent('/mixed-elements', `
    <title>Mixed Elements</title>
    <body>
      <h1 id="title" class="heading">Page Title</h1>
      <button class="btn primary" data-action="submit">Submit</button>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}mixed-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locators: ['#title', '.btn'] },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringMatching(/### Element 1 \(#title\):[\s\S]*### Element 2 \(\.btn\):/),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('- h1 #title .heading: Page Title');
  expect(result.content[0].text).toContain('- button .btn.primary: Submit');
  expect(result.content[0].text).toContain('id: "title"');
  expect(result.content[0].text).toContain('data-action: "submit"');
});

test('browser_element_snapshot (locator - no elements found)', async ({ client, server }) => {
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
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

test('browser_element_snapshot (hidden element)', async ({ client, server }) => {
  server.setContent('/hidden-element', `
    <title>Hidden Element</title>
    <body>
      <div id="visible">Visible content</div>
      <div id="hidden" style="display: none;">Hidden content</div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}hidden-element` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '#hidden' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('Element not visible'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });
});

test('browser_element_snapshot (complex nested elements)', async ({ client, server }) => {
  server.setContent('/nested-elements', `
    <title>Nested Elements</title>
    <body>
      <article class="post" data-post-id="123">
        <header>
          <h2>Article Title</h2>
          <time datetime="2024-01-01">January 1, 2024</time>
        </header>
        <div class="content">
          <p>Article content goes here.</p>
          <a href="/read-more">Read more</a>
        </div>
      </article>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}nested-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '.post' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (.post):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('- article .post:');
  expect(result.content[0].text).toContain('Article Title');
  expect(result.content[0].text).toContain('January 1, 2024');
  expect(result.content[0].text).toContain('Article content goes here.');
  expect(result.content[0].text).toContain('Read more');
  expect(result.content[0].text).toContain('data-post-id: "123"');
});
