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

import fs from 'fs';

import { test, expect } from './fixtures.js';

test('browser_take_screenshot (viewport)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
  });
  
  // Check that we have the expected content structure
  expect(result.content).toHaveLength(3);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken \(\d+ bytes, JPEG\)/)
  });
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'text',
    text: expect.stringContaining('Ran Playwright code:')
  });
});

test('browser_take_screenshot (element)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`[ref=e1]`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: {
      element: 'hello button',
      ref: 'e1',
    },
  });
  
  expect(result.content).toHaveLength(3);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken \(\d+ bytes, JPEG\)/)
  });
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'text',
    text: expect.stringContaining(`getByText('Hello, world!').screenshot`)
  });
});

test('--output-dir should work', async ({ startClient, server }, testInfo) => {
  const outputDir = testInfo.outputPath('output');
  const { client } = await startClient({
    config: { outputDir },
  });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  await client.callTool({
    name: 'browser_take_screenshot',
  });

  expect(fs.existsSync(outputDir)).toBeTruthy();
  const files = [...fs.readdirSync(outputDir)].filter(f => f.endsWith('.jpeg'));
  expect(files).toHaveLength(1);
  expect(files[0]).toMatch(/^page-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.jpeg$/);
});

for (const raw of [undefined, true]) {
  test(`browser_take_screenshot (raw: ${raw})`, async ({ startClient, server }, testInfo) => {
    const outputDir = testInfo.outputPath('output');
    const ext = raw ? 'png' : 'jpeg';
    const { client } = await startClient({
      config: { outputDir },
    });
    expect(await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    })).toContainTextContent(`Navigate to http://localhost`);

    const result = await client.callTool({
      name: 'browser_take_screenshot',
      arguments: { raw },
    });
    
    expect(result.content).toHaveLength(3);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: expect.stringMatching(new RegExp(`Screenshot taken \\(\\d+ bytes, ${ext.toUpperCase()}\\)`))
    });
    expect(result.content[1]).toEqual({
      type: 'image',
      data: expect.any(String),
      mimeType: `image/${ext}`,
    });
    expect(result.content[2]).toEqual({
      type: 'text',
      text: expect.stringContaining('Ran Playwright code:')
    });

    const files = [...fs.readdirSync(outputDir)].filter(f => f.endsWith(`.${ext}`));

    expect(fs.existsSync(outputDir)).toBeTruthy();
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(
        new RegExp(`^page-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z\\.${ext}$`)
    );
  });

}

test('browser_take_screenshot (filename: "output.jpeg")', async ({ startClient, server }, testInfo) => {
  const outputDir = testInfo.outputPath('output');
  const { client } = await startClient({
    config: { outputDir },
  });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: {
      filename: 'output.jpeg',
    },
  });
  
  expect(result.content).toHaveLength(3);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken \(\d+ bytes, JPEG\)/)
  });
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'text',
    text: expect.stringContaining('output.jpeg')
  });

  const files = [...fs.readdirSync(outputDir)].filter(f => f.endsWith('.jpeg'));

  expect(fs.existsSync(outputDir)).toBeTruthy();
  expect(files).toHaveLength(1);
  expect(files[0]).toMatch(/^output\.jpeg$/);
});

test('browser_take_screenshot (imageResponses=omit)', async ({ startClient, server }, testInfo) => {
  const outputDir = testInfo.outputPath('output');
  const { client } = await startClient({
    config: {
      outputDir,
      imageResponses: 'omit',
    },
  });

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  await client.callTool({
    name: 'browser_take_screenshot',
  });

  const result = await client.callTool({
    name: 'browser_take_screenshot',
  });
  
  // When imageResponses is 'omit', we should only get text content
  expect(result.content).toHaveLength(2);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken \(\d+ bytes, JPEG\)/)
  });
  expect(result.content[1]).toEqual({
    type: 'text',
    text: expect.stringContaining('Ran Playwright code:')
  });
});

test('browser_take_screenshot (fullPage)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });

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

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}long-page` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: { fullPage: true },
  });
  
  expect(result.content).toHaveLength(3);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken \(\d+ bytes, JPEG\)/)
  });
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'text',
    text: expect.stringContaining('fullPage: true')
  });
});

test('browser_take_screenshot (locator - single element)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });

  server.setContent('/single-button', `
    <title>Single Button</title>
    <body>
      <button id="test-btn">Click me</button>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}single-button` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: { locator: '#test-btn' },
  });
  
  expect(result.content).toHaveLength(3);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken of 1 element\(s\) matching locator "#test-btn" \(JPEG\)/)
  });
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'text',
    text: expect.stringContaining('locator(\'#test-btn\')')
  });
});

test('browser_take_screenshot (locator - multiple elements)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });

  server.setContent('/multiple-buttons', `
    <title>Multiple Buttons</title>
    <body>
      <button class="btn">Button 1</button>
      <button class="btn">Button 2</button>
      <button class="btn">Button 3</button>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-buttons` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: { locator: '.btn' },
  });

  // Should have text + 3 images + code text = 5 elements
  expect(result.content).toHaveLength(5);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringMatching(/Screenshot taken of 3 element\(s\) matching locator "\.btn" \(JPEG\)/)
  });
  // Three images
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[3]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[4]).toEqual({
    type: 'text',
    text: expect.stringContaining("locator('.btn')")
  });
});

test('browser_take_screenshot (locator - no elements found)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: { locator: '.non-existent' },
  });
  
  expect(result.content).toHaveLength(3);
  expect(result.content[0]).toEqual({
    type: 'text',
    text: expect.stringContaining('No elements found for locator ".non-existent". Screenshot of full page taken')
  });
  expect(result.content[1]).toEqual({
    type: 'image',
    data: expect.any(String),
    mimeType: 'image/jpeg',
  });
  expect(result.content[2]).toEqual({
    type: 'text',
    text: expect.stringContaining("locator('.non-existent')")
  });
});

test('browser_take_screenshot (fullPage: true)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`Navigate to http://localhost`);

  expect(await client.callTool({
    name: 'browser_take_screenshot',
    arguments: { fullPage: true },
  })).toEqual({
    content: [
      {
        data: expect.any(String),
        mimeType: 'image/jpeg',
        type: 'image',
      },
      {
        text: expect.stringContaining(`Screenshot full page and save it as`),
        type: 'text',
      },
    ],
  });
});

test('browser_take_screenshot (fullPage with element should error)', async ({ startClient, server }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toContainTextContent(`[ref=e1]`);

  const result = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: {
      fullPage: true,
      element: 'hello button',
      ref: 'e1',
    },
  });

  expect(result.isError).toBe(true);
  expect(result.content?.[0]?.text).toContain('fullPage cannot be used with element screenshots');
});
