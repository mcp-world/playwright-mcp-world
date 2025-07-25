# Playwright MCP World

## A Community-Driven Fork with Enhanced Features

This is a community-maintained fork of the [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) server that includes additional features and improvements requested by the community but not yet included in the original project.

### Why This Fork?

Our goal is to provide a feature-rich Playwright MCP server that includes capabilities the community needs but which may not align with the original project's scope or priorities. As noted in [this discussion](https://github.com/microsoft/playwright-mcp/pull/448#issuecomment-2892276410), some features may be better suited for community-maintained versions.

This fork serves as a testing ground for new features and a way to quickly deliver functionality that users need today.

### Merged Community Contributions

We've integrated features from several community forks:

- **[viktor-silakov/playwright-mcp-advanced](https://github.com/viktor-silakov/playwright-mcp-advanced)** - Enhanced screenshot tools, HTML extraction, and element snapshots
- **[nnamon/playwright-mcp](https://github.com/nnamon/playwright-mcp)** - JavaScript execution capabilities, Docker support, and improved build tooling
- **[Verto-FX/playwright-mcp](https://github.com/Verto-FX/playwright-mcp)** - Video recording capabilities (see [#546](https://github.com/microsoft/playwright-mcp/issues/546), [#547](https://github.com/microsoft/playwright-mcp/pull/547))

### About Playwright MCP

A Model Context Protocol (MCP) server that provides browser automation capabilities using [Playwright](https://playwright.dev). This server enables LLMs to interact with web pages through structured accessibility snapshots, bypassing the need for screenshots or visually-tuned models.

### Key Features

- **Fast and lightweight**. Uses Playwright's accessibility tree, not pixel-based input.
- **LLM-friendly**. No vision models needed, operates purely on structured data.
- **Deterministic tool application**. Avoids ambiguity common with screenshot-based approaches.

### 🚀 Advanced Features

This version includes additional tools not available in the original Playwright MCP:

- **`browser_evaluate`** - Execute JavaScript code in the browser context
- **`browser_take_screenshot`** - Enhanced screenshot tool with fullPage and locator support
- **`browser_get_html_content`** - Extract HTML content from pages or specific elements
- **`browser_get_outer_html`** - Get complete element HTML including the element tag
- **`browser_element_snapshot`** - Capture accessibility snapshots of specific elements by locator
- **`get_video_path`** - Get the path to video recordings for browser sessions
- **`save_video`** - Save video recordings to the output directory with custom filenames
- **`list_video_files`** - List all video files in the output directory

### ⚠️ Experimental Notice

This project is currently experimental and may be unstable due to the nature of integrating features from multiple community forks. If you encounter any bugs or issues, please [file an issue](https://github.com/mcp-world/playwright-mcp-world/issues) on GitHub to help us improve.

### Requirements
- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop, Goose or any other MCP client

### Local Development Setup

To use this version locally:

1. **Clone and build the project:**
   ```bash
   git clone https://github.com/mcp-world/playwright-mcp-world.git
   cd playwright-mcp-world
   npm install
   npm run build
   ```

2. **Configure your MCP client** to use the local build (see configuration examples below)

<!--
// Generate using:
node utils/generate-links.js
-->

### Getting started

First, install the Playwright MCP server with your client. 

#### Using npm:
```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest"
      ]
    }
  }
}
```

#### For this advanced version (local development):
```js
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "/path/to/playwright-mcp-world/lib/index.js"
      ]
    }
  }
}
```

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522playwright%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540mcp-world%252Fplaywright-mcp-world%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522playwright%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540mcp-world%252Fplaywright-mcp-world%2540latest%2522%255D%257D)


<details><summary><b>Install in VS Code</b></summary>

You can also install the Playwright MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"playwright","command":"npx","args":["@mcp-world/playwright-mcp-world@latest"]}'
```

After installation, the Playwright MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

#### For original Playwright MCP:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=playwright&config=eyJjb21tYW5kIjoibnB4IEBwbGF5d3JpZ2h0L21jcEBsYXRlc3QifQ%3D%3D)

Or install manually: Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, use `command` type with the command `npx @mcp-world/playwright-mcp-world`.

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest"
      ]
    }
  }
}
```

#### For this advanced version (local):

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Use the following configuration:

```js
{
  "mcpServers": {
    "playwright-advanced": {
      "command": "node",
      "args": [
        "/absolute/path/to/playwright-mcp-world/lib/index.js"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Follow Windsurf MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use following configuration:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Claude Desktop</b></summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user).

#### For original Playwright MCP:
```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest"
      ]
    }
  }
}
```

#### For this advanced version (local):
```js
{
  "mcpServers": {
    "playwright-advanced": {
      "command": "node",
      "args": [
        "/absolute/path/to/playwright-mcp-world/lib/index.js"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Claude Code</b></summary>

Use the Claude Code CLI to add the Playwright MCP server:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```
</details>

<details>
<summary><b>Install in Goose</b></summary>

#### Click the button to install:

[![Install in Goose](https://block.github.io/goose/img/extension-install-dark.svg)](https://block.github.io/goose/extension?cmd=npx&arg=%40playwright%2Fmcp%40latest&id=playwright&name=Playwright&description=Interact%20with%20web%20pages%20through%20structured%20accessibility%20snapshots%20using%20Playwright)

#### Or install manually:

Go to `Advanced settings` -> `Extensions` -> `Add custom extension`. Name to your liking, use type `STDIO`, and set the `command` to `npx @playwright/mcp`. Click "Add Extension".
</details>

<details>
<summary><b>Install in Qodo Gen</b></summary>

Open [Qodo Gen](https://docs.qodo.ai/qodo-documentation/qodo-gen) chat panel in VSCode or IntelliJ → Connect more tools → + Add new MCP → Paste the following configuration:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest"
      ]
    }
  }
}
```

Click <code>Save</code>.
</details>

<details>
<summary><b>Install in Gemini CLI</b></summary>

Follow the MCP install [guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md#configure-the-mcp-server-in-settingsjson), use following configuration:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```
</details>

### Configuration

Playwright MCP server supports following arguments. They can be provided in the JSON configuration above, as a part of the `"args"` list:

<!--- Options generated by update-readme.ts -->

```
> npx @mcp-world/playwright-mcp-world@latest --help
  --allowed-origins <origins>  semicolon-separated list of origins to allow the
                               browser to request. Default is to allow all.
  --blocked-origins <origins>  semicolon-separated list of origins to block the
                               browser from requesting. Blocklist is evaluated
                               before allowlist. If used without the allowlist,
                               requests not matching the blocklist are still
                               allowed.
  --block-service-workers      block service workers
  --browser <browser>          browser or chrome channel to use, possible
                               values: chrome, firefox, webkit, msedge.
  --browser-agent <endpoint>   Use browser agent (experimental).
  --caps <caps>                comma-separated list of capabilities to enable,
                               possible values: tabs, pdf, history, wait, files,
                               install. Default is all.
  --cdp-endpoint <endpoint>    CDP endpoint to connect to.
  --config <path>              path to the configuration file.
  --device <device>            device to emulate, for example: "iPhone 15"
  --executable-path <path>     path to the browser executable.
  --headless                   run browser in headless mode, headed by default
  --host <host>                host to bind server to. Default is localhost. Use
                               0.0.0.0 to bind to all interfaces.
  --ignore-https-errors        ignore https errors
  --isolated                   keep the browser profile in memory, do not save
                               it to disk.
  --image-responses <mode>     whether to send image responses to the client.
                               Can be "allow", "omit", or "auto". Defaults to
                               "auto", which sends images if the client can
                               display them.
  --no-sandbox                 disable the sandbox for all process types that
                               are normally sandboxed.
  --output-dir <path>          path to the directory for output files.
  --port <port>                port to listen on for SSE transport.
  --proxy-bypass <bypass>      comma-separated domains to bypass proxy, for
                               example ".com,chromium.org,.domain.com"
  --proxy-server <proxy>       specify proxy server, for example
                               "http://myproxy:3128" or "socks5://myproxy:8080"
  --record-video <mode>        record video mode: "off", "on",
                               "retain-on-failure", or "on-first-retry"
  --record-video-size <size>   video size in pixels, for example "800,600"
  --save-trace                 Whether to save the Playwright Trace of the
                               session into the output directory.
  --storage-state <path>       path to the storage state file for isolated
                               sessions.
  --user-agent <ua string>     specify user agent string
  --user-data-dir <path>       path to the user data directory. If not
                               specified, a temporary directory will be created.
  --viewport-size <size>       specify browser viewport size in pixels, for
                               example "1280, 720"
  --vision                     Run server that uses screenshots (Aria snapshots
                               are used by default)
```

<!--- End of options generated section -->

### User profile

You can run Playwright MCP with persistent profile like a regular browser (default), or in the isolated contexts for the testing sessions.

**Persistent profile**

All the logged in information will be stored in the persistent profile, you can delete it between sessions if you'd like to clear the offline state.
Persistent profile is located at the following locations and you can override it with the `--user-data-dir` argument.

```bash
# Windows
%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-profile

# macOS
- ~/Library/Caches/ms-playwright/mcp-{channel}-profile

# Linux
- ~/.cache/ms-playwright/mcp-{channel}-profile
```

**Isolated**

In the isolated mode, each session is started in the isolated profile. Every time you ask MCP to close the browser,
the session is closed and all the storage state for this session is lost. You can provide initial storage state
to the browser via the config's `contextOptions` or via the `--storage-state` argument. Learn more about the storage
state [here](https://playwright.dev/docs/auth).

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest",
        "--isolated",
        "--storage-state={path/to/storage.json}"
      ]
    }
  }
}
```

### Configuration file

The Playwright MCP server can be configured using a JSON configuration file. You can specify the configuration file
using the `--config` command line option:

```bash
npx @mcp-world/playwright-mcp-world@latest --config path/to/config.json
```

<details>
<summary>Configuration file schema</summary>

```typescript
{
  // Browser configuration
  browser?: {
    // Browser type to use (chromium, firefox, or webkit)
    browserName?: 'chromium' | 'firefox' | 'webkit';

    // Keep the browser profile in memory, do not save it to disk.
    isolated?: boolean;

    // Path to user data directory for browser profile persistence
    userDataDir?: string;

    // Browser launch options (see Playwright docs)
    // @see https://playwright.dev/docs/api/class-browsertype#browser-type-launch
    launchOptions?: {
      channel?: string;        // Browser channel (e.g. 'chrome')
      headless?: boolean;      // Run in headless mode
      executablePath?: string; // Path to browser executable
      // ... other Playwright launch options
    };

    // Browser context options
    // @see https://playwright.dev/docs/api/class-browser#browser-new-context
    contextOptions?: {
      viewport?: { width: number, height: number };
      // ... other Playwright context options
    };

    // Video recording configuration
    // @see https://playwright.dev/docs/videos
    recordVideo?: {
      mode: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
      size?: { width: number, height: number };
    };

    // CDP endpoint for connecting to existing browser
    cdpEndpoint?: string;

    // Remote Playwright server endpoint
    remoteEndpoint?: string;
  },

  // Server configuration
  server?: {
    port?: number;  // Port to listen on
    host?: string;  // Host to bind to (default: localhost)
  },

  // List of enabled capabilities
  capabilities?: Array<
    'core' |    // Core browser automation
    'tabs' |    // Tab management
    'pdf' |     // PDF generation
    'history' | // Browser history
    'wait' |    // Wait utilities
    'files' |   // File handling
    'install' | // Browser installation
    'testing'   // Testing
  >;

  // Enable vision mode (screenshots instead of accessibility snapshots)
  vision?: boolean;

  // Directory for output files
  outputDir?: string;

  // Network configuration
  network?: {
    // List of origins to allow the browser to request. Default is to allow all. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
    allowedOrigins?: string[];

    // List of origins to block the browser to request. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
    blockedOrigins?: string[];
  };
 
  /**
   * Do not send image responses to the client.
   */
  noImageResponses?: boolean;
}
```
</details>

### Standalone MCP server

When running headed browser on system w/o display or from worker processes of the IDEs,
run the MCP server from environment with the DISPLAY and pass the `--port` flag to enable SSE transport.

```bash
npx @mcp-world/playwright-mcp-world@latest --port 8931
```

And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/sse"
    }
  }
}
```

<details>
<summary><b>Docker</b></summary>

**NOTE:** The Docker implementation only supports headless chromium at the moment.

```js
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "--pull=always", "playwright-mcp"]
    }
  }
}
```

You can build the Docker image yourself.

```
docker build -t playwright-mcp .
```
</details>

<details>
<summary><b>Programmatic usage</b></summary>

```js
import http from 'http';

import { createConnection } from '@mcp-world/playwright-mcp-world';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

http.createServer(async (req, res) => {
  // ...

  // Creates a headless Playwright MCP server with SSE transport
  const connection = await createConnection({ browser: { launchOptions: { headless: true } } });
  const transport = new SSEServerTransport('/messages', res);
  await connection.sever.connect(transport);

  // ...
});
```
</details>


### Tools

The tools are available in two modes:

1. **Snapshot Mode** (default): Uses accessibility snapshots for better performance and reliability
2. **Vision Mode**: Uses screenshots for visual-based interactions

To use Vision Mode, add the `--vision` flag when starting the server:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@mcp-world/playwright-mcp-world@latest",
        "--vision"
      ]
    }
  }
}
```

Vision Mode works best with the computer use models that are able to interact with elements using
X Y coordinate space, based on the provided screenshot.

**Note:** All HTML content extraction tools (`browser_get_html_content`, `browser_get_outer_html`) are also available in Vision Mode, providing the same functionality regardless of the mode used.

<!--- Tools generated by update-readme.ts -->

<details>
<summary><b>Interactions</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_snapshot**
  - Title: Page snapshot
  - Description: Capture accessibility snapshot of the current page, this is better than screenshot
  - Parameters:
    - `truncateSnapshot` (boolean, optional): Whether to truncate large snapshots at 20000 tokens. Defaults to true.
    - `page` (number, optional): Page number to retrieve when snapshot is truncated. Defaults to 1.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_element_snapshot** 🆕
  - Title: Element snapshot
  - Description: Capture accessibility snapshot of specific elements by locator(s). Better than screenshot for specific elements.
  - **Enhancement**: Capture structured accessibility data for specific elements using locators
  - Parameters:
    - `locator` (string, optional): Playwright locator string to capture accessibility snapshot of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to capture accessibility snapshots of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_click**
  - Title: Click
  - Description: Perform click on a web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_drag**
  - Title: Drag mouse
  - Description: Perform drag and drop between two elements
  - Parameters:
    - `startElement` (string): Human-readable source element description used to obtain the permission to interact with the element
    - `startRef` (string): Exact source element reference from the page snapshot
    - `endElement` (string): Human-readable target element description used to obtain the permission to interact with the element
    - `endRef` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_hover**
  - Title: Hover mouse
  - Description: Hover over element on page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_type**
  - Title: Type text
  - Description: Type text into editable element
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
    - `slowly` (boolean, optional): Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_select_option**
  - Title: Select option
  - Description: Select an option in a dropdown
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `values` (array): Array of values to select in the dropdown. This can be a single value or multiple values.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_press_key**
  - Title: Press a key
  - Description: Press a key on the keyboard
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_wait_for**
  - Title: Wait for
  - Description: Wait for text to appear or disappear or a specified time to pass
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_file_upload**
  - Title: Upload files
  - Description: Upload one or multiple files
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_handle_dialog**
  - Title: Handle a dialog
  - Description: Handle a dialog
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

</details>

<details>
<summary><b>Navigation</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_navigate**
  - Title: Navigate to a URL
  - Description: Navigate to a URL
  - Parameters:
    - `url` (string): The URL to navigate to
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_navigate_back**
  - Title: Go back
  - Description: Go back to the previous page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_navigate_forward**
  - Title: Go forward
  - Description: Go forward to the next page
  - Parameters: None
  - Read-only: **true**

</details>

<details>
<summary><b>Resources</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_take_screenshot** ⭐
  - Title: Take a screenshot
  - Description: Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.
  - **Enhancement**: Enhanced with fullPage and locator support for flexible screenshot capture
  - Parameters:
    - `raw` (boolean, optional): Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.
    - `filename` (string, optional): File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified.
    - `fullPage` (boolean, optional): Whether to take a screenshot of the full scrollable page. Cannot be combined with element/ref/locator parameters.
    - `locator` (string, optional): Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with element/ref/fullPage parameters.
    - `element` (string, optional): Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.
    - `ref` (string, optional): Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.
    - `format` (string, optional): Image format (defaults to png if raw is true, jpeg otherwise)
    - `quality` (number, optional): JPEG quality (0-100), defaults to 50 for JPEG format
    - `captureSnapshot` (boolean, optional): Whether to capture a page snapshot after taking the screenshot. Defaults to false.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_pdf_save**
  - Title: Save as PDF
  - Description: Save page as PDF
  - Parameters:
    - `filename` (string, optional): File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **get_video_path**
  - Title: Get video path
  - Description: Get the path to the video recording for the current or specified tab. Returns the video file path if recording is enabled.
  - Parameters:
    - `tabIndex` (number, optional): Tab index (1-based). If not provided, uses the current tab.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **save_video**
  - Title: Save video
  - Description: Save the video recording for the current or specified tab to the output directory.
  - Parameters:
    - `tabIndex` (number, optional): Tab index (1-based). If not provided, uses the current tab.
    - `filename` (string, optional): Custom filename for the saved video (without extension). If not provided, uses a default name.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **list_video_files**
  - Title: List video files
  - Description: List all video files in the output directory.
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_network_requests**
  - Title: List network requests
  - Description: Returns all network requests since loading the page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_console_messages**
  - Title: Get console messages
  - Description: Returns all console messages
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_html_content** 🆕
  - Title: Get HTML content
  - Description: Get HTML content of the current page or specific elements. Returns full page HTML by default, or HTML of specific elements when locator(s) provided.
  - **Enhancement**: Extract HTML content from page or specific elements with flexible locator support
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_outer_html** 🆕
  - Title: Get outer HTML content
  - Description: Get outer HTML content of specific elements (includes the element tag itself). Requires locator(s) to be specified.
  - **Enhancement**: Get complete element HTML including the element tag itself
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get outer HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get outer HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

</details>

<details>
<summary><b>Utilities</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_install**
  - Title: Install the browser specified in the config
  - Description: Install the browser specified in the config. Call this if you get an error about the browser not being installed.
  - Parameters: None
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_evaluate**
  - Title: Execute JavaScript
  - Description: Execute JavaScript code in the browser context and return the result
  - Parameters:
    - `expression` (string): JavaScript expression or function to evaluate
    - `args` (array, optional): Arguments to pass to the function (must be serializable)
    - `awaitPromise` (boolean, optional): Whether to wait for promises to resolve
    - `timeout` (number, optional): Maximum execution time in milliseconds
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_close**
  - Title: Close browser
  - Description: Close the page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_resize**
  - Title: Resize browser window
  - Description: Resize the browser window
  - Parameters:
    - `width` (number): Width of the browser window
    - `height` (number): Height of the browser window
  - Read-only: **true**

</details>

<details>
<summary><b>Tabs</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_list**
  - Title: List tabs
  - Description: List browser tabs
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_new**
  - Title: Open a new tab
  - Description: Open a new tab
  - Parameters:
    - `url` (string, optional): The URL to navigate to in the new tab. If not provided, the new tab will be blank.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_select**
  - Title: Select a tab
  - Description: Select a tab by index
  - Parameters:
    - `index` (number): The index of the tab to select
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_close**
  - Title: Close a tab
  - Description: Close a tab
  - Parameters:
    - `index` (number, optional): The index of the tab to close. Closes current tab if not provided.
  - Read-only: **false**

</details>

<details>
<summary><b>Testing</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_generate_playwright_test**
  - Title: Generate a Playwright test
  - Description: Generate a Playwright test for given scenario
  - Parameters:
    - `name` (string): The name of the test
    - `description` (string): The description of the test
    - `steps` (array): The steps of the test
  - Read-only: **true**

</details>

<details>
<summary><b>Vision mode</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_capture** ⭐
  - Title: Take a screenshot
  - Description: Take a screenshot of the current page
  - **Enhancement**: Enhanced with fullPage and locator/locators support for flexible vision mode capture
  - Parameters:
    - `fullPage` (boolean, optional): Whether to take a screenshot of the full scrollable page. Cannot be combined with locator/locators parameters.
    - `locator` (string, optional): Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with fullPage/locators parameters.
    - `locators` (array, optional): Array of Playwright locator strings to screenshot multiple elements. Cannot be combined with fullPage/locator parameters.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_move_mouse**
  - Title: Move mouse
  - Description: Move mouse to a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_click**
  - Title: Click
  - Description: Click left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_drag**
  - Title: Drag mouse
  - Description: Drag left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `startX` (number): Start X coordinate
    - `startY` (number): Start Y coordinate
    - `endX` (number): End X coordinate
    - `endY` (number): End Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_type**
  - Title: Type text
  - Description: Type text
  - Parameters:
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_press_key**
  - Title: Press a key
  - Description: Press a key on the keyboard
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_wait_for**
  - Title: Wait for
  - Description: Wait for text to appear or disappear or a specified time to pass
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_file_upload**
  - Title: Upload files
  - Description: Upload one or multiple files
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_handle_dialog**
  - Title: Handle a dialog
  - Description: Handle a dialog
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_html_content** 🆕
  - Title: Get HTML content
  - Description: Get HTML content of the current page or specific elements. Returns full page HTML by default, or HTML of specific elements when locator(s) provided.
  - **Enhancement**: Extract HTML content from page or specific elements with flexible locator support
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_outer_html** 🆕
  - Title: Get outer HTML content
  - Description: Get outer HTML content of specific elements (includes the element tag itself). Requires locator(s) to be specified.
  - **Enhancement**: Get complete element HTML including the element tag itself
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get outer HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get outer HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

</details>


<!--- End of tools generated section -->
