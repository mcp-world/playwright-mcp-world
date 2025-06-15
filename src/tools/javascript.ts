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
import { callOnPageNoTrace } from './utils.js';

const evaluate = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_evaluate',
    title: 'Execute JavaScript',
    description: 'Execute JavaScript code in the browser context and return the result',
    inputSchema: z.object({
      expression: z.string().describe('JavaScript expression or function to evaluate'),
      args: z.array(z.any()).default([]).describe('Arguments to pass to the function (must be serializable)'),
      awaitPromise: z.boolean().default(true).describe('Whether to wait for promises to resolve'),
      timeout: z.number().default(30000).describe('Maximum execution time in milliseconds'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = await context.ensureTab();
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
    const code = [
      `// Execute JavaScript in the browser context`,
      params.args.length > 0 
        ? `await page.evaluate(${params.awaitPromise ? 'async ' : ''}(${params.args.map((_, i) => `arg${i}`).join(', ')}) => {`
        : `await page.evaluate(${params.awaitPromise ? 'async ' : ''}() => {`,
      `  ${params.expression.split('\n').join('\n  ')}`,
      params.args.length > 0
        ? `}, ${params.args.map(arg => JSON.stringify(arg)).join(', ')});`
        : `});`,
    ];

    const action = async () => {
      try {
        const result = await callOnPageNoTrace(tab.page, async (page) => {
          // Create a promise that rejects after timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Evaluation timed out after ${params.timeout}ms`)), params.timeout);
          });
          
          // Create the evaluation promise
          const evaluatePromise = page.evaluate(async ({ expression, args, awaitPromise }) => {
            const startEvalTime = Date.now();
            try {
              // Create function from expression
              let fn: Function;
              if (expression.includes('return') || expression.includes('=>') || expression.includes('function')) {
                // It's likely a function definition
                fn = new Function(...args.map((_, i) => `arg${i}`), expression);
              } else {
                // It's an expression, wrap it in a return statement
                fn = new Function(...args.map((_, i) => `arg${i}`), `return ${expression}`);
              }
              
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
          }, { expression: params.expression, args: params.args, awaitPromise: params.awaitPromise });
          
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
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                result: null,
                type: 'error',
                console: consoleMessages,
                error: result.error,
                executionTime: totalExecutionTime
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              result: result.result,
              type: result.type,
              console: consoleMessages,
              executionTime: totalExecutionTime
            }, null, 2),
          }],
        };
      } catch (error) {
        // Remove console handler
        tab.page.off('console', consoleHandler);
        
        const totalExecutionTime = Date.now() - startTime;
        
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              result: null,
              type: 'error',
              console: consoleMessages,
              error: error instanceof Error ? error.message : String(error),
              executionTime: totalExecutionTime
            }, null, 2),
          }],
        };
      }
    };

    return {
      code,
      action,
      captureSnapshot: true,
      waitForNetwork: false,
    };
  },
});

export default [evaluate];