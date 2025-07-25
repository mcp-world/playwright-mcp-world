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

// Support both old and new parameters simultaneously
const evaluateSchema = z.object({
  // New format parameters
  expression: z.string().optional().describe('JavaScript expression or function to evaluate'),
  args: z.array(z.any()).default([]).describe('Arguments to pass to the function (must be serializable)'),
  awaitPromise: z.boolean().default(true).describe('Whether to wait for promises to resolve'),
  timeout: z.number().default(30000).describe('Maximum execution time in milliseconds'),
  
  // Old format parameters
  function: z.string().optional().describe('() => { /* code */ } or (element) => { /* code */ } when element is provided'),
  element: z.string().optional().describe('Human-readable element description used to obtain permission to interact with the element'),
  ref: z.string().optional().describe('Exact target element reference from the page snapshot'),
}).refine(data => data.expression || data.function, {
  message: 'Either expression or function must be provided',
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
    
    // Use function parameter if expression is not provided
    const expression = params.expression || params.function;
    if (!expression) {
      throw new Error('Either expression or function must be provided');
    }
    
    // Handle element evaluation (old format)
    if (params.ref && params.element) {
      response.setIncludeSnapshot();
      
      const locator = await tab.refLocator({ ref: params.ref, element: params.element });
      response.addCode(`await page.${await generateLocator(locator)}.evaluate(${javascript.quote(expression)});`);

      await tab.waitForCompletion(async () => {
        const result = await (locator as any)._evaluateFunction(expression);
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
    if (params.args.length > 0) {
      response.addCode(`await page.evaluate(${params.awaitPromise ? 'async ' : ''}(${params.args.map((_, i) => `arg${i}`).join(', ')}) => {`);
    } else {
      response.addCode(`await page.evaluate(${params.awaitPromise ? 'async ' : ''}() => {`);
    }
    response.addCode(`  ${expression.split('\n').join('\n  ')}`);
    if (params.args.length > 0) {
      response.addCode(`}, ${params.args.map(arg => JSON.stringify(arg)).join(', ')});`);
    } else {
      response.addCode(`});`);
    }

    await tab.waitForCompletion(async () => {
      try {
        // If using old format without timeout features, use simple evaluation
        if (params.function && !params.expression) {
          const result = await callOnPageNoTrace(tab.page, async (page) => {
            return await (page as any)._evaluateFunction(expression);
          });
          
          tab.page.off('console', consoleHandler);
          response.addResult(JSON.stringify(result, null, 2) || 'undefined');
          return;
        }
        
        // Use enhanced evaluation with timeout and error handling
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
          }, { expression, args: params.args, awaitPromise: params.awaitPromise });
          
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
          response.addResult(JSON.stringify({
            result: null,
            type: 'error',
            console: consoleMessages,
            error: result.error,
            executionTime: totalExecutionTime
          }, null, 2));
        } else {
          response.addResult(JSON.stringify({
            result: result.result,
            type: result.type,
            console: consoleMessages,
            executionTime: totalExecutionTime
          }, null, 2));
        }
      } catch (error) {
        // Remove console handler
        tab.page.off('console', consoleHandler);
        
        const totalExecutionTime = Date.now() - startTime;
        
        response.addResult(JSON.stringify({
          result: null,
          type: 'error',
          console: consoleMessages,
          error: error instanceof Error ? error.message : String(error),
          executionTime: totalExecutionTime
        }, null, 2));
      }
    });

    response.setIncludeSnapshot();
  },
});

export default [evaluate];