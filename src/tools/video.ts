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

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { outputFile } from '../config.js';
import { defineTool } from './tool.js';

const getVideoPath = defineTool({
  capability: 'core',
  schema: {
    name: 'get_video_path',
    title: 'Get video path',
    description: 'Get the path to the video recording for the current or specified tab. Returns the video file path if recording is enabled.',
    inputSchema: z.object({
      tabIndex: z.number().min(1).optional().describe('Tab index (1-based). If not provided, uses the current tab.'),
    }),
    type: 'readOnly',
  },
  handle: async (context, params, response) => {
    const tab = params.tabIndex ? context.tabs()[params.tabIndex - 1] : context.currentTabOrDie();
    if (!tab)
      throw new Error(`Tab ${params.tabIndex} not found`);

    // Get video from the page
    const video = tab.page.video();
    if (!video)
      throw new Error('Video recording is not enabled for this tab. Enable video recording in the browser configuration.');


    const videoPath = await video.path();

    response.addCode(`// Getting video path for tab ${params.tabIndex || 'current'}`);
    response.addCode(`// Video path: ${videoPath}`);
    response.addResult(`Video recording path: ${videoPath}`);
  },
});

const saveVideo = defineTool({
  capability: 'core',
  schema: {
    name: 'save_video',
    title: 'Save video',
    description: 'Save the video recording for the current or specified tab to the output directory.',
    inputSchema: z.object({
      tabIndex: z.number().min(1).optional().describe('Tab index (1-based). If not provided, uses the current tab.'),
      filename: z.string().optional().describe('Custom filename for the saved video (without extension). If not provided, uses a default name.'),
    }),
    type: 'readOnly',
  },
  handle: async (context, params, response) => {
    const tab = params.tabIndex ? context.tabs()[params.tabIndex - 1] : context.currentTabOrDie();
    if (!tab)
      throw new Error(`Tab ${params.tabIndex} not found`);

    const video = tab.page.video();
    if (!video)
      throw new Error('Video recording is not enabled for this tab. Enable video recording in the browser configuration.');


    const originalPath = await video.path();
    const filename = params.filename || `video-${Date.now()}`;
    const outputPath = await outputFile(context.config, `${filename}.webm`);

    // Copy the video file to the output directory
    await fs.promises.copyFile(originalPath, outputPath);

    response.addCode(`// Saving video for tab ${params.tabIndex || 'current'}`);
    response.addCode(`// Saved to: ${outputPath}`);
    response.addResult(`Video saved to: ${outputPath}`);
  },
});

const listVideoFiles = defineTool({
  capability: 'core',
  schema: {
    name: 'list_video_files',
    title: 'List video files',
    description: 'List all video files in the output directory.',
    inputSchema: z.object({}),
    type: 'readOnly',
  },
  handle: async (context, params, response) => {
    const outputDir = context.config.outputDir;

    try {
      const files = await fs.promises.readdir(outputDir);
      const videoFiles = files.filter(file =>
        file.endsWith('.webm') || file.endsWith('.mp4') || file.endsWith('.avi')
      );

      if (videoFiles.length === 0) {
        response.addCode('// No video files found in output directory');
        response.addResult('No video files found in the output directory.');
        return;
      }

      const videoList = videoFiles.map((file, index) => {
        const fullPath = path.join(outputDir, file);
        return `${index + 1}. ${file} (${fullPath})`;
      }).join('\n');

      response.addCode(`// Found ${videoFiles.length} video file(s) in ${outputDir}`);
      videoFiles.forEach(file => response.addCode(`// - ${file}`));
      response.addResult(`Video files in output directory:\n${videoList}`);
    } catch (error) {
      response.addCode(`// Error reading output directory: ${error}`);
      response.addResult(`Error reading output directory: ${error}`);
    }
  },
});

export default [getVideoPath, saveVideo, listVideoFiles];
