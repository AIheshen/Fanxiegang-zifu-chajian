(function() {
  // Create panel elements
  const panel = document.createElement('div');
  panel.id = 'path-converter-panel';
  panel.innerHTML = `
    <div id="panel-header">
      <span>路径转换器</span>
      <button id="collapse-btn">−</button>
    </div>
    <div id="panel-content">
      <textarea id="input-path" placeholder="请输入路径..."></textarea>
      <div id="button-row-1">
        <button id="convert-btn">斜杠</button>
        <button id="quote-btn">引号</button>
        <button id="reverse-btn">反输</button>
        <button id="replace-tail-btn">换尾</button>
        <button id="group-tail-btn">群尾</button>
        <button id="out-btn">OUT</button>
      </div>
      <div id="button-row-2">
        <button id="copy-btn">复制全部</button>
      </div>
      <div id="output"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const header = document.getElementById('panel-header');
  const collapseBtn = document.getElementById('collapse-btn');
  const content = document.getElementById('panel-content');
  const input = document.getElementById('input-path');
  const convertBtn = document.getElementById('convert-btn');
  const quoteBtn = document.getElementById('quote-btn');
  const reverseBtn = document.getElementById('reverse-btn');
  const replaceTailBtn = document.getElementById('replace-tail-btn');
  const groupTailBtn = document.getElementById('group-tail-btn');
  const outBtn = document.getElementById('out-btn');
  const copyBtn = document.getElementById('copy-btn');
  const output = document.getElementById('output');

  // Load saved state
  chrome.storage.local.get(['panelPos', 'isCollapsed'], (data) => {
    if (data.panelPos) {
      panel.style.left = data.panelPos.x + 'px';
      panel.style.top = data.panelPos.y + 'px';
    } else {
      // Default position
      panel.style.left = '20px';
      panel.style.top = '20px';
    }
    if (data.isCollapsed) {
      content.style.display = 'none';
      collapseBtn.textContent = '+';
    }
  });

  // Draggable functionality with smooth animation
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    isDragging = true;
    panel.style.transition = 'none'; // Disable transition during drag
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      // Boundary check
      currentX = Math.max(0, Math.min(currentX, window.innerWidth - panel.offsetWidth));
      currentY = Math.max(0, Math.min(currentY, window.innerHeight - panel.offsetHeight));
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.style.transition = 'all 0.2s ease'; // Re-enable smooth transition
      chrome.storage.local.set({
        panelPos: { x: currentX, y: currentY }
      });
    }
  });

  // Collapse/expand functionality
  collapseBtn.addEventListener('click', () => {
    const isCollapsed = content.style.display === 'none';
    content.style.display = isCollapsed ? 'block' : 'none';
    collapseBtn.textContent = isCollapsed ? '−' : '+';
    chrome.storage.local.set({ isCollapsed: !isCollapsed }, () => {
      // Ensure position persists after collapse/expand
      chrome.storage.local.get(['panelPos'], (data) => {
        if (data.panelPos) {
          panel.style.left = data.panelPos.x + 'px';
          panel.style.top = data.panelPos.y + 'px';
        }
      });
    });
  });

  // Convert path (remove quotes, replace backslashes with forward slashes)
  convertBtn.addEventListener('click', () => {
    output.innerHTML = '';
    let text = input.value.trim();
    // Remove outer quotes
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1);
    }
    // Replace backslashes with forward slashes
    text = text.replace(/\\/g, '/');
    output.textContent = text;
  });

  // Add quotes to each line, output as single line with commas
  quoteBtn.addEventListener('click', () => {
    output.innerHTML = '';
    let text = input.value;
    // Split input by lines and process non-empty lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    // Add quotes to each line
    const quotedLines = lines.map(line => {
      // Remove existing outer quotes
      if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
        line = line.slice(1, -1);
      }
      return `"${line}"`;
    });
    // Join all lines with commas
    output.textContent = quotedLines.join(',');
  });

  // Reverse output: replace suffix and add quotes with custom centered prompt
  reverseBtn.addEventListener('click', () => {
    // Create custom prompt
    const promptContainer = document.createElement('div');
    promptContainer.id = 'custom-prompt';
    promptContainer.innerHTML = `
      <div id="prompt-content">
        <input type="text" id="suffix-input" placeholder="请输入要替换成的后缀">
        <div id="prompt-buttons">
          <button id="prompt-confirm">确认</button>
          <button id="prompt-cancel">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(promptContainer);

    const suffixInput = document.getElementById('suffix-input');
    const confirmBtn = document.getElementById('prompt-confirm');
    const cancelBtn = document.getElementById('prompt-cancel');

    // Handle confirm
    confirmBtn.addEventListener('click', () => {
      output.innerHTML = '';
      const suffix = suffixInput.value.trim();
      if (suffix) {
        let text = input.value;
        // Split input by lines and process non-empty lines
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        // Replace suffix and add quotes
        const reversedLines = lines.map(line => {
          // Remove existing outer quotes
          if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
            line = line.slice(1, -1);
          }
          // Replace suffix (e.g., .in to .out)
          const lastDotIndex = line.lastIndexOf('.');
          if (lastDotIndex !== -1) {
            line = line.substring(0, lastDotIndex) + '.' + suffix;
          }
          return `"${line}"`;
        });
        // Join all lines with commas
        output.textContent = reversedLines.join(',');
      }
      document.body.removeChild(promptContainer);
    });

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(promptContainer);
    });
  });

  // Replace tail: replace the content after the last slash with multiple tails from prompt
  replaceTailBtn.addEventListener('click', () => {
    // Create custom prompt with textarea for multiple lines
    const promptContainer = document.createElement('div');
    promptContainer.id = 'custom-prompt';
    promptContainer.innerHTML = `
      <div id="prompt-content">
        <textarea id="tails-input" placeholder="请输入尾缀，每行一个..."></textarea>
        <div id="prompt-buttons">
          <button id="prompt-confirm">确认</button>
          <button id="prompt-cancel">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(promptContainer);

    const tailsInput = document.getElementById('tails-input');
    const confirmBtn = document.getElementById('prompt-confirm');
    const cancelBtn = document.getElementById('prompt-cancel');

    // Handle confirm
    confirmBtn.addEventListener('click', () => {
      const tailsText = tailsInput.value.trim();
      if (tailsText) {
        let prefix = input.value.trim();
        // Remove outer quotes if present
        if ((prefix.startsWith('"') && prefix.endsWith('"')) || (prefix.startsWith("'") && prefix.endsWith("'"))) {
          prefix = prefix.slice(1, -1);
        }
        // Replace backslashes with forward slashes for consistency
        prefix = prefix.replace(/\\/g, '/');
        // Find the last slash index
        const lastSlashIndex = prefix.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          const basePath = prefix.substring(0, lastSlashIndex + 1);
          // Split tails by lines, trim, filter empty
          const tails = tailsText.split('\n').map(line => line.trim()).filter(line => line);
          // Clear output
          output.innerHTML = '';
          // Generate each line with copy button
          tails.forEach(tail => {
            const newPath = basePath + tail;
            const lineDiv = document.createElement('div');
            lineDiv.className = 'output-line';
            lineDiv.innerHTML = `
              <span class="output-text">${newPath}</span>
              <button class="copy-line-btn">复制</button>
            `;
            output.appendChild(lineDiv);
            // Add click event to copy button
            const copyLineBtn = lineDiv.querySelector('.copy-line-btn');
            copyLineBtn.addEventListener('click', () => {
              navigator.clipboard.writeText(newPath).then(() => {
                copyLineBtn.textContent = '已复制!';
                setTimeout(() => { copyLineBtn.textContent = '复制'; }, 1000);
              });
            });
          });
        }
      }
      document.body.removeChild(promptContainer);
    });

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(promptContainer);
    });
  });

  // Group tail: append multiple tails to unique prefixes from input
  groupTailBtn.addEventListener('click', () => {
    // Create custom prompt with textarea for multiple lines
    const promptContainer = document.createElement('div');
    promptContainer.id = 'custom-prompt';
    promptContainer.innerHTML = `
      <div id="prompt-content">
        <textarea id="tails-input" placeholder="请输入尾缀，每行一个..."></textarea>
        <div id="prompt-buttons">
          <button id="prompt-confirm">确认</button>
          <button id="prompt-cancel">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(promptContainer);

    const tailsInput = document.getElementById('tails-input');
    const confirmBtn = document.getElementById('prompt-confirm');
    const cancelBtn = document.getElementById('prompt-cancel');

    // Handle confirm
    confirmBtn.addEventListener('click', () => {
      const tailsText = tailsInput.value.trim();
      if (tailsText) {
        let text = input.value;
        // Split input by lines and process non-empty lines
        const prefixes = text.split('\n').map(line => {
          line = line.trim();
          // Remove outer quotes
          if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
            line = line.slice(1, -1);
          }
          // Replace backslashes with forward slashes
          line = line.replace(/\\/g, '/');
          // Ensure ends with /
          if (!line.endsWith('/')) {
            line += '/';
          }
          return line;
        }).filter(line => line);

        // Get unique prefixes
        const uniquePrefixes = [...new Set(prefixes)];

        // Split tails by lines, trim, filter empty
        const tails = tailsText.split('\n').map(line => line.trim()).filter(line => line);

        // Clear output
        output.innerHTML = '';

        // Generate each combination: for each tail, append to each unique prefix
        tails.forEach(tail => {
          uniquePrefixes.forEach(uniquePrefix => {
            const newPath = uniquePrefix + tail;
            const lineDiv = document.createElement('div');
            lineDiv.className = 'output-line';
            lineDiv.innerHTML = `
              <span class="output-text">${newPath}</span>
              <button class="copy-line-btn">复制</button>
            `;
            output.appendChild(lineDiv);
            // Add click event to copy button
            const copyLineBtn = lineDiv.querySelector('.copy-line-btn');
            copyLineBtn.addEventListener('click', () => {
              navigator.clipboard.writeText(newPath).then(() => {
                copyLineBtn.textContent = '已复制!';
                setTimeout(() => { copyLineBtn.textContent = '复制'; }, 1000);
              });
            });
          });
        });
      }
      document.body.removeChild(promptContainer);
    });

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(promptContainer);
    });
  });

  // OUT button: generate quoted comma-separated in and out versions
  outBtn.addEventListener('click', () => {
    let text = input.value;
    // Split input by lines and process non-empty lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    // Process lines: remove quotes if present
    const processedLines = lines.map(line => {
      if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
        line = line.slice(1, -1);
      }
      return line;
    });

    // Generate in version: quoted, comma-separated
    const inVersion = processedLines.map(line => `"${line}"`).join(',');

    // Generate out version: replace 'in' with 'out', quoted, comma-separated
    const outProcessed = processedLines.map(line => line.replace(/in/g, 'out'));
    const outVersion = outProcessed.map(line => `"${line}"`).join(',');

    // Clear output
    output.innerHTML = '';

    // Create in section
    const inDiv = document.createElement('div');
    inDiv.className = 'output-section';
    inDiv.innerHTML = `
      <span class="output-text">IN: ${inVersion}</span>
      <button class="copy-section-btn">复制</button>
    `;
    output.appendChild(inDiv);
    const copyInBtn = inDiv.querySelector('.copy-section-btn');
    copyInBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(inVersion).then(() => {
        copyInBtn.textContent = '已复制!';
        setTimeout(() => { copyInBtn.textContent = '复制'; }, 1000);
      });
    });

    // Create out section
    const outDiv = document.createElement('div');
    outDiv.className = 'output-section';
    outDiv.innerHTML = `
      <span class="output-text">OUT: ${outVersion}</span>
      <button class="copy-section-btn">复制</button>
    `;
    output.appendChild(outDiv);
    const copyOutBtn = outDiv.querySelector('.copy-section-btn');
    copyOutBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(outVersion).then(() => {
        copyOutBtn.textContent = '已复制!';
        setTimeout(() => { copyOutBtn.textContent = '复制'; }, 1000);
      });
    });
  });

  // Copy all to clipboard (copies all text content in output)
  copyBtn.addEventListener('click', () => {
    const text = output.textContent.trim();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '已复制!';
        setTimeout(() => { copyBtn.textContent = '复制全部'; }, 1000);
      });
    }
  });

  // Ensure position persists on page refresh
  window.addEventListener('beforeunload', () => {
    chrome.storage.local.set({
      panelPos: { x: currentX, y: currentY }
    });
  });
})();