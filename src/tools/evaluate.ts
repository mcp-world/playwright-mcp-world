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
import { callOnPageNoTrace, generateLocator } from './utils.js';
import * as javascript from '../javascript.js';

const evaluateSchema = z.object({
  function: z.string().describe('JavaScript function to evaluate: () => { /* code */ } or (element) => { /* code */ } when element is provided'),
  element: z.string().optional().describe('Human-readable element description used to obtain permission to interact with the element'),
  ref: z.string().optional().describe('Exact target element reference from the page snapshot'),
  args: z.array(z.any()).optional().default([]).describe('Arguments to pass to the function (must be serializable)'),
  awaitPromise: z.boolean().optional().default(true).describe('Whether to wait for promises to resolve'),
  timeout: z.number().optional().default(30000).describe('Maximum execution time in milliseconds'),
});

const evaluate = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_evaluate',
    title: 'Execute JavaScript',
    description: 'Execute JavaScript code in the browser context and return the result',
    inputSchema: evaluateSchema,
    type: 'destructive',
  },

  handle: async (context, params, response) => {
    const tab = await context.ensureTab();
    
    // Handle element evaluation
    if (params.ref && params.element) {
      response.setIncludeSnapshot();
      
      const locator = await tab.refLocator({ ref: params.ref, element: params.element });
      response.addCode(`await page.${await generateLocator(locator)}.evaluate(${javascript.quote(params.function)});`);

      await tab.waitForCompletion(async () => {
        const result = await callOnPageNoTrace(tab.page, async (page) => {
          // Create a promise that rejects after timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Evaluation timed out after ${params.timeout}ms`)), params.timeout);
          });
          
          // Evaluate on element
          const evaluatePromise = (locator as any)._evaluateFunction(params.function);
          
          // Race between timeout and evaluation
          return await Promise.race([evaluatePromise, timeoutPromise]);
        });
        
        response.addResult(JSON.stringify(result, null, 2) || 'undefined');
      });
      
      return;
    }
    
    // Handle page evaluation with enhanced features
    const startTime = Date.now();
    
    // Store console messages during execution
    const consoleMessages: string[] = [];
    
    // Set up console listener
    const consoleHandler = (msg: any) => {
      const text = msg.text();
      if (text) {
        consoleMessages.push(text);
      }
    };
    
    tab.page.on('console', consoleHandler);
    
    // Generate code for Playwright test
    response.addCode(`// Execute JavaScript in the browser context`);
    response.addCode(`await page.evaluate(${javascript.quote(params.function)});`);

    await tab.waitForCompletion(async () => {
      try {
        const result = await callOnPageNoTrace(tab.page, async (page) => {
          // Create a promise that rejects after timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Evaluation timed out after ${params.timeout}ms`)), params.timeout);
          });
          
          // Create the evaluation promise
          const evaluatePromise = page.evaluate(async ({ functionStr, args, awaitPromise }) => {
            const startEvalTime = Date.now();
            try {
              // Create function from string
              const fn = new Function(`return ${functionStr}`)();
              
              // Execute the function
              let result = fn(...args);
              
              // Await promise if requested
              if (awaitPromise && result && typeof result.then === 'function') {
                result = await result;
              }
              
              // Determine the type of the result
              let type: string = typeof result;
              if (result === null) type = 'null';
              else if (Array.isArray(result)) type = 'array';
              else if (result instanceof Date) type = 'date';
              else if (result instanceof RegExp) type = 'regexp';
              else if (result instanceof Error) type = 'error';
              
              // Try to serialize the result
              let serializedResult: string;
              if (result === undefined) {
                serializedResult = 'undefined';
              } else if (result === null) {
                serializedResult = 'null';
              } else if (typeof result === 'function') {
                serializedResult = result.toString();
              } else if (result instanceof Error) {
                serializedResult = JSON.stringify({
                  name: result.name,
                  message: result.message,
                  stack: result.stack
                }, null, 2);
              } else {
                try {
                  serializedResult = JSON.stringify(result, null, 2);
                } catch (e) {
                  serializedResult = String(result);
                }
              }
              
              return {
                success: true as const,
                result: serializedResult,
                type,
                executionTime: Date.now() - startEvalTime
              };
            } catch (error) {
              return {
                success: false as const,
                error: error instanceof Error ? error.message : String(error),
                type: 'error',
                executionTime: Date.now() - startEvalTime
              };
            }
          }, { functionStr: params.function, args: params.args || [], awaitPromise: params.awaitPromise });
          
          // Race between timeout and evaluation
          return await Promise.race([evaluatePromise, timeoutPromise]) as { 
            success: boolean; 
            result?: string; 
            error?: string; 
            type: string; 
            executionTime: number 
          };
        });
        
        // Remove console handler
        tab.page.off('console', consoleHandler);
        
        const totalExecutionTime = Date.now() - startTime;
        
        if (!result.success) {
          throw new Error(result.error);
        } else {
          response.addResult(result.result || '');
        }
      } catch (error) {
        // Remove console handler
        tab.page.off('console', consoleHandler);
        
        throw error;
      }
    });

    response.setIncludeSnapshot();
  },
});

export default [evaluate];