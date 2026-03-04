// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  let store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter(); // not strictly needed but kept from template
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keys = [
      'global_settings',
      'conversions',
      'examples',
      'share_links',
      'comparison_sessions',
      'navigation_links'
    ];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // active_conversion_id and last_copied_text are optional; no need to pre-set
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getNowIso() {
    return new Date().toISOString();
  }

  // ---------------------- Global settings helpers ----------------------

  _getOrCreateGlobalSettings() {
    let settingsArr = this._getFromStorage('global_settings');
    let settings = settingsArr.find(s => s.id === 'default') || null;
    const now = this._getNowIso();
    if (!settings) {
      settings = {
        id: 'default',
        theme: 'light',
        default_indentation: 'two_spaces',
        default_quote_style: 'double_quotes',
        sort_object_keys_default: false,
        auto_convert_default: false,
        default_json_output_style: 'pretty',
        created_at: now,
        updated_at: now
      };
      settingsArr.push(settings);
      this._saveToStorage('global_settings', settingsArr);
    }
    return settings;
  }

  _applyGlobalSettingsToNewConversion(baseConversion) {
    const settings = this._getOrCreateGlobalSettings();
    const conv = Object.assign({}, baseConversion);
    if (!conv.json_output_style) {
      conv.json_output_style = settings.default_json_output_style || 'pretty';
    }
    if (!conv.indentation) {
      conv.indentation = settings.default_indentation || 'two_spaces';
    }
    if (!conv.quote_style) {
      conv.quote_style = settings.default_quote_style || 'double_quotes';
    }
    if (typeof conv.sort_object_keys !== 'boolean') {
      conv.sort_object_keys = !!settings.sort_object_keys_default;
    }
    if (typeof conv.auto_convert_enabled !== 'boolean') {
      conv.auto_convert_enabled = !!settings.auto_convert_default;
    }
    if (!conv.multi_document_handling) {
      conv.multi_document_handling = 'first_document';
    }
    return conv;
  }

  // ---------------------- Conversion helpers ----------------------

  _getOrCreateActiveConversion() {
    let conversions = this._getFromStorage('conversions');
    const activeId = localStorage.getItem('active_conversion_id');
    let conversion = activeId ? conversions.find(c => c.id === activeId) : null;

    if (!conversion) {
      const now = this._getNowIso();
      let baseConv = {
        id: this._generateId('conv'),
        title: 'Untitled conversion',
        source_yaml: '',
        json_output: '',
        json_output_style: null, // set by _applyGlobalSettingsToNewConversion
        indentation: null,
        quote_style: null,
        sort_object_keys: null,
        multi_document_handling: null,
        auto_convert_enabled: null,
        is_pinned: false,
        source_example_id: null,
        last_download_filename: '',
        created_at: now,
        updated_at: now,
        last_converted_at: null
      };
      baseConv = this._applyGlobalSettingsToNewConversion(baseConv);
      conversions.push(baseConv);
      this._saveToStorage('conversions', conversions);
      localStorage.setItem('active_conversion_id', baseConv.id);
      conversion = baseConv;
    }

    return conversion;
  }

  _saveConversionToHistory(conversion) {
    let conversions = this._getFromStorage('conversions');
    const index = conversions.findIndex(c => c.id === conversion.id);
    if (index >= 0) {
      conversions[index] = conversion;
    } else {
      conversions.push(conversion);
    }
    this._saveToStorage('conversions', conversions);
  }

  // ---------------------- YAML parsing & JSON formatting ----------------------

  _parseYamlAndGenerateJson(conversion) {
    const source = conversion.source_yaml || '';
    const trimmed = source.trim();
    if (!trimmed) {
      return {
        success: true,
        json_output: '',
        value: null,
        error_details: null
      };
    }

    let docs = null;

    // Try external YAML library if available
    try {
      let jsyaml = null;
      try {
        if (typeof globalThis !== 'undefined') {
          jsyaml = globalThis.jsyaml || globalThis.jsYaml || globalThis.jsYAML || globalThis.js_yaml || null;
        }
      } catch (e) {
        jsyaml = null;
      }
      if (!jsyaml && typeof require === 'function') {
        try {
          // eslint-disable-next-line global-require, import/no-extraneous-dependencies
          jsyaml = require('js-yaml');
        } catch (e) {
          jsyaml = null;
        }
      }
      if (jsyaml && (jsyaml.loadAll || jsyaml.load)) {
        docs = [];
        if (typeof jsyaml.loadAll === 'function') {
          jsyaml.loadAll(source, doc => {
            if (doc !== undefined) {
              docs.push(doc);
            }
          });
        } else if (typeof jsyaml.load === 'function') {
          const single = jsyaml.load(source);
          docs = [single];
        }
      }
    } catch (e) {
      docs = null;
    }

    if (!docs) {
      // Fallback to simple built-in parser
      try {
        docs = this._parseYamlDocumentsSimple(source);
      } catch (e) {
        return {
          success: false,
          json_output: '',
          value: null,
          error_details: {
            code: 'yaml_parse_error',
            line: e.line || null,
            column: e.column || null,
            detail: e.message || String(e)
          }
        };
      }
    }

    if (!Array.isArray(docs)) {
      docs = [docs];
    }

    let value;
    switch (conversion.multi_document_handling) {
      case 'json_array':
        value = docs;
        break;
      case 'separate_documents':
        value = docs;
        break;
      case 'first_document':
      default:
        value = docs[0] !== undefined ? docs[0] : null;
        break;
    }

    if (conversion.sort_object_keys) {
      value = this._sortObjectKeysRecursive(value);
    }

    const json_output = this._generateJsonFromValue(
      value,
      conversion.json_output_style,
      conversion.indentation,
      conversion.quote_style
    );

    return {
      success: true,
      json_output,
      value,
      error_details: null
    };
  }

  _parseYamlDocumentsSimple(source) {
    const lines = source.split(/\r?\n/);
    const docs = [];
    let currentLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^---\s*$/.test(line)) {
        if (currentLines.length > 0) {
          const docText = currentLines.join('\n');
          if (docText.trim().length > 0) {
            docs.push(this._parseSimpleYamlDocument(docText));
          }
          currentLines = [];
        } else {
          // consecutive ---; ignore empty doc
        }
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      const docText = currentLines.join('\n');
      if (docText.trim().length > 0) {
        docs.push(this._parseSimpleYamlDocument(docText));
      }
    }
    return docs;
  }

  _parseSimpleYamlDocument(text) {
    const lines = text.split(/\r?\n/);
    const root = {};

    // Stack of containers to handle nested objects and simple sequences.
    // Each frame: { indent, type: 'object' | 'array', container, lastKey? }
    const stack = [{ indent: 0, type: 'object', container: root, lastKey: null }];
    let prevIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const indentMatch = rawLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;

      // Pop stack frames when indentation decreases
      while (stack.length > 1 && indent < stack[stack.length - 1].indent) {
        stack.pop();
      }

      let parent = stack[stack.length - 1];

      // Handle sequence items: lines starting with "- "
      if (trimmed.startsWith('- ')) {
        const valueStr = trimmed.slice(2).trim();
        const value = this._parseYamlValue(valueStr);

        if (parent.type === 'array' && parent.indent === indent) {
          // Continue existing array at this indent level
          parent.container.push(value);
        } else {
          // Attach array to the nearest object frame's lastKey
          let objFrame = null;
          for (let j = stack.length - 1; j >= 0; j--) {
            if (stack[j].type === 'object') {
              objFrame = stack[j];
              break;
            }
          }

          if (!objFrame || !objFrame.lastKey) {
            const err = new Error('Unsupported YAML sequence syntax on line ' + (i + 1) + ': ' + rawLine);
            err.line = i + 1;
            throw err;
          }

          const key = objFrame.lastKey;
          if (!Array.isArray(objFrame.container[key])) {
            // Create array for this key (overwriting placeholder objects if any)
            objFrame.container[key] = [];
          }
          const arr = objFrame.container[key];

          const arrayFrame = { indent, type: 'array', container: arr };
          stack.push(arrayFrame);
          arr.push(value);
          parent = arrayFrame;
        }

        prevIndent = indent;
        continue;
      }

      // At this point we handle mapping lines: "key: value"
      // If indentation increased relative to previous non-empty line, and the
      // parent object's lastKey holds a plain object, descend into that object.
      if (
        indent > prevIndent &&
        parent.type === 'object' &&
        parent.lastKey &&
        parent.container[parent.lastKey] &&
        typeof parent.container[parent.lastKey] === 'object' &&
        !Array.isArray(parent.container[parent.lastKey])
      ) {
        const nested = parent.container[parent.lastKey];
        const nestedFrame = { indent, type: 'object', container: nested, lastKey: null };
        stack.push(nestedFrame);
        parent = nestedFrame;
      }

      const match = trimmed.match(/^([^:#]+):\s*(.*)$/);
      if (!match) {
        const err = new Error('Unsupported YAML syntax on line ' + (i + 1) + ': ' + rawLine);
        err.line = i + 1;
        throw err;
      }

      const key = match[1].trim();
      const valueStr = match[2].trim();
      let value;

      if (valueStr === '') {
        // Empty value: acts as a parent for nested mappings or sequences.
        // Use an object placeholder; for sequences this will be replaced by an array
        // when the first "- " item is encountered.
        value = {};
      } else {
        value = this._parseYamlValue(valueStr);
      }

      if (parent.type === 'array') {
        // Array of objects (not heavily used in tests, but support basic form)
        let obj = parent.container[parent.container.length - 1];
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          obj = {};
          parent.container.push(obj);
        }
        obj[key] = value;
      } else {
        parent.container[key] = value;
        parent.lastKey = key;
      }

      prevIndent = indent;
    }

    return root;
  }

  _parseYamlValue(valueStr) {
    if (valueStr === '') {
      return null;
    }

    // quoted string
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith('\'') && valueStr.endsWith('\''))) {
      return valueStr.substring(1, valueStr.length - 1);
    }

    // inline array: [a, b, c]
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      const inner = valueStr.substring(1, valueStr.length - 1).trim();
      if (!inner) {
        return [];
      }
      const parts = inner.split(',').map(p => p.trim());
      return parts.map(p => this._parseYamlValue(p));
    }

    // booleans
    if (/^(true|false)$/i.test(valueStr)) {
      return /^true$/i.test(valueStr);
    }

    // null
    if (/^(null|~)$/i.test(valueStr)) {
      return null;
    }

    // integers
    if (/^[+-]?\d+$/.test(valueStr)) {
      const n = parseInt(valueStr, 10);
      if (!isNaN(n)) {
        return n;
      }
    }

    // floats
    if (/^[+-]?\d*\.\d+$/.test(valueStr)) {
      const n = parseFloat(valueStr);
      if (!isNaN(n)) {
        return n;
      }
    }

    // default: string
    return valueStr;
  }

  _sortObjectKeysRecursive(value) {
    if (Array.isArray(value)) {
      return value.map(v => this._sortObjectKeysRecursive(v));
    }
    if (value && typeof value === 'object') {
      const sortedKeys = Object.keys(value).sort();
      const result = {};
      for (let i = 0; i < sortedKeys.length; i++) {
        const key = sortedKeys[i];
        result[key] = this._sortObjectKeysRecursive(value[key]);
      }
      return result;
    }
    return value;
  }

  _generateJsonFromValue(value, outputStyle, indentation, quoteStyle) {
    let indentStr;
    if (outputStyle === 'pretty') {
      switch (indentation) {
        case 'four_spaces':
          indentStr = '    ';
          break;
        case 'tab':
          indentStr = '\t';
          break;
        case 'none':
          indentStr = undefined; // fall back to minified
          break;
        case 'two_spaces':
        default:
          indentStr = '  ';
          break;
      }
    } else {
      indentStr = undefined;
    }

    let json;
    try {
      if (indentStr !== undefined) {
        json = JSON.stringify(value, null, indentStr);
      } else {
        json = JSON.stringify(value);
      }
    } catch (e) {
      json = '';
    }

    if (quoteStyle === 'single_quotes' && json) {
      json = json.replace(/"/g, '\'');
    }

    return json;
  }

  _estimateByteLength(str) {
    if (!str) {
      return 0;
    }
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code <= 0x7f) {
        bytes += 1;
      } else if (code <= 0x7ff) {
        bytes += 2;
      } else if (code <= 0xffff) {
        bytes += 3;
      } else {
        bytes += 4;
      }
    }
    return bytes;
  }

  // ---------------------- Clipboard helper ----------------------

  _copyToClipboard(text) {
    try {
      const toStore = text != null ? String(text) : '';
      localStorage.setItem('last_copied_text', toStore);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------------------- Share link helpers ----------------------

  _getShareBaseUrl() {
    let base;
    try {
      if (typeof globalThis !== 'undefined' && globalThis.location && globalThis.location.origin) {
        base = globalThis.location.origin;
      } else {
        base = 'https://example.com';
      }
    } catch (e) {
      base = 'https://example.com';
    }
    if (!base.endsWith('/')) {
      base += '/';
    }
    return base + 'share/';
  }

  _createOrReuseShareLink(conversionId) {
    const now = this._getNowIso();
    let shareLinks = this._getFromStorage('share_links');

    let candidates = shareLinks.filter(sl => sl.conversion_id === conversionId);
    if (candidates.length) {
      candidates.sort((a, b) => {
        const aCreated = a.created_at || '';
        const bCreated = b.created_at || '';
        if (aCreated === bCreated) return 0;
        return aCreated < bCreated ? 1 : -1; // newest first
      });
      const latest = candidates[0];
      if (!latest.expires_at || latest.expires_at > now) {
        latest.last_accessed_at = now;
        const idx = shareLinks.findIndex(sl => sl.id === latest.id);
        if (idx >= 0) {
          shareLinks[idx] = latest;
          this._saveToStorage('share_links', shareLinks);
        }
        return {
          success: true,
          share_link_id: latest.id,
          url: latest.url,
          expires_at: latest.expires_at || null,
          message: 'Reused existing share link'
        };
      }
    }

    const id = this._generateId('share');
    const url = this._getShareBaseUrl() + id;
    const newLink = {
      id,
      conversion_id: conversionId,
      url,
      created_at: now,
      expires_at: null,
      last_accessed_at: now
    };
    shareLinks.push(newLink);
    this._saveToStorage('share_links', shareLinks);

    return {
      success: true,
      share_link_id: id,
      url,
      expires_at: newLink.expires_at,
      message: 'Generated new share link'
    };
  }

  // ---------------------- Comparison helpers ----------------------

  _startComparisonSessionForConversion(conversion, value) {
    const pretty_json = this._generateJsonFromValue(
      value,
      'pretty',
      conversion.indentation,
      conversion.quote_style
    );
    const minified_json = this._generateJsonFromValue(
      value,
      'minified',
      conversion.indentation,
      conversion.quote_style
    );

    const sessions = this._getFromStorage('comparison_sessions');
    const id = this._generateId('cmp');
    const created_at = this._getNowIso();
    const session = {
      id,
      conversion_id: conversion.id,
      pretty_json,
      minified_json,
      selected_version: 'pretty',
      created_at,
      resolved: false
    };
    sessions.push(session);
    this._saveToStorage('comparison_sessions', sessions);

    return session;
  }

  // ---------------------- Utility helpers ----------------------

  _toTitleCase(str) {
    return str
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  _toHumanTimeDiff(isoString) {
    if (!isoString) return '';
    const then = new Date(isoString).getTime();
    const now = Date.now();
    if (!then || Number.isNaN(then)) return '';
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return diffSec + ' seconds ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + ' minutes ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + ' hours ago';
    const diffDay = Math.floor(diffHr / 24);
    return diffDay + ' days ago';
  }

  // ---------------------- Core interface implementations ----------------------
  // getConverterOptionMetadata

  getConverterOptionMetadata() {
    const indentation_options = [
      {
        value: 'two_spaces',
        label: '2 spaces',
        description: 'Indent JSON with 2 spaces per nesting level.'
      },
      {
        value: 'four_spaces',
        label: '4 spaces',
        description: 'Indent JSON with 4 spaces per nesting level.'
      },
      {
        value: 'tab',
        label: 'Tab',
        description: 'Indent JSON using tab characters.'
      },
      {
        value: 'none',
        label: 'No indentation',
        description: 'Produce JSON without indentation (single line).'
      }
    ];

    const json_output_style_options = [
      {
        value: 'pretty',
        label: 'Pretty printed',
        description: 'Multi-line JSON with indentation for readability.'
      },
      {
        value: 'minified',
        label: 'Minified',
        description: 'Single-line JSON with no extra whitespace.'
      }
    ];

    const quote_style_options = [
      {
        value: 'double_quotes',
        label: 'Double quotes',
        description: 'Use "double quotes" around JSON strings and object keys.'
      },
      {
        value: 'single_quotes',
        label: 'Single quotes',
        description: "Use 'single quotes' around JSON strings and object keys (JSON-like)."
      }
    ];

    const multi_document_handling_options = [
      {
        value: 'first_document',
        label: 'Use first document only',
        description: 'Parse only the first YAML document when multiple are present.'
      },
      {
        value: 'json_array',
        label: 'Combine into JSON array',
        description: 'Combine all YAML documents into a single JSON array.'
      },
      {
        value: 'separate_documents',
        label: 'Separate documents',
        description: 'Keep YAML documents separate in the resulting JSON structure.'
      }
    ];

    return {
      indentation_options,
      json_output_style_options,
      quote_style_options,
      multi_document_handling_options
    };
  }

  // getActiveConversionForDisplay

  getActiveConversionForDisplay() {
    const conversion = this._getOrCreateActiveConversion();
    const examples = this._getFromStorage('examples');
    const example = conversion.source_example_id
      ? examples.find(e => e.id === conversion.source_example_id) || null
      : null;

    const optionMeta = this.getConverterOptionMetadata();
    const indentationMeta = optionMeta.indentation_options.find(o => o.value === conversion.indentation);
    const jsonStyleMeta = optionMeta.json_output_style_options.find(o => o.value === conversion.json_output_style);
    const quoteStyleMeta = optionMeta.quote_style_options.find(o => o.value === conversion.quote_style);
    const multiDocMeta = optionMeta.multi_document_handling_options.find(o => o.value === conversion.multi_document_handling);

    const has_json_output = !!(conversion.json_output && conversion.json_output.length > 0);
    const last_converted_at_human = conversion.last_converted_at
      ? this._toHumanTimeDiff(conversion.last_converted_at)
      : '';

    return {
      id: conversion.id,
      title: conversion.title,
      source_yaml: conversion.source_yaml,
      json_output: conversion.json_output,
      json_output_style: conversion.json_output_style,
      indentation: conversion.indentation,
      quote_style: conversion.quote_style,
      sort_object_keys: conversion.sort_object_keys,
      multi_document_handling: conversion.multi_document_handling,
      auto_convert_enabled: conversion.auto_convert_enabled,
      is_pinned: conversion.is_pinned,
      source_example_id: conversion.source_example_id || null,
      last_download_filename: conversion.last_download_filename || '',
      created_at: conversion.created_at,
      updated_at: conversion.updated_at,
      last_converted_at: conversion.last_converted_at,
      indentation_label: indentationMeta ? indentationMeta.label : '',
      json_output_style_label: jsonStyleMeta ? jsonStyleMeta.label : '',
      quote_style_label: quoteStyleMeta ? quoteStyleMeta.label : '',
      multi_document_handling_label: multiDocMeta ? multiDocMeta.label : '',
      has_json_output,
      last_converted_at_human,
      // Foreign key resolution: include full example object
      source_example: example
    };
  }

  // updateActiveConversionYaml(sourceYaml)

  updateActiveConversionYaml(sourceYaml) {
    const conversion = this._getOrCreateActiveConversion();
    conversion.source_yaml = sourceYaml != null ? String(sourceYaml) : '';
    conversion.updated_at = this._getNowIso();
    this._saveConversionToHistory(conversion);

    let auto_convert_triggered = false;
    let message = 'YAML updated';

    if (conversion.auto_convert_enabled) {
      const result = this.convertActiveConversion();
      auto_convert_triggered = !!result.success;
      if (result.success) {
        message = 'YAML updated and auto-converted';
      } else {
        message =
          result.message ||
          'Auto-convert failed' +
            (result.error_details && result.error_details.detail
              ? ': ' + result.error_details.detail
              : '');
      }
    }

    // Instrumentation for task completion tracking (task_7: auto-convert triggered)
    try {
      if (auto_convert_triggered) {
        localStorage.setItem('task7_autoConvertTriggered', 'true');
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting main logic
    }

    return {
      success: true,
      auto_convert_triggered,
      message,
      conversion_summary: {
        id: conversion.id,
        title: conversion.title,
        source_yaml_length: conversion.source_yaml.length
      }
    };
  }

  // clearActiveConversion()

  clearActiveConversion() {
    // Preserve current conversion in history
    const existing = this._getOrCreateActiveConversion();
    existing.updated_at = this._getNowIso();
    this._saveConversionToHistory(existing);

    // Start a brand new blank conversion and make it active
    const now = this._getNowIso();
    let baseConv = {
      id: this._generateId('conv'),
      title: 'Untitled conversion',
      source_yaml: '',
      json_output: '',
      json_output_style: null,
      indentation: null,
      quote_style: null,
      sort_object_keys: null,
      multi_document_handling: null,
      auto_convert_enabled: null,
      is_pinned: false,
      source_example_id: null,
      last_download_filename: '',
      created_at: now,
      updated_at: now,
      last_converted_at: null
    };

    baseConv = this._applyGlobalSettingsToNewConversion(baseConv);

    const conversions = this._getFromStorage('conversions');
    conversions.push(baseConv);
    this._saveToStorage('conversions', conversions);
    localStorage.setItem('active_conversion_id', baseConv.id);

    return {
      success: true,
      message: 'Active conversion cleared',
      cleared_fields: {
        source_yaml_cleared: true,
        json_output_cleared: true
      }
    };
  }

  // updateActiveConversionOptions(indentation, jsonOutputStyle, quoteStyle, sortObjectKeys, multiDocumentHandling)

  updateActiveConversionOptions(
    indentation,
    jsonOutputStyle,
    quoteStyle,
    sortObjectKeys,
    multiDocumentHandling
  ) {
    const conversion = this._getOrCreateActiveConversion();
    const metadata = this.getConverterOptionMetadata();

    if (typeof indentation === 'string') {
      if (metadata.indentation_options.some(o => o.value === indentation)) {
        conversion.indentation = indentation;
      }
    }

    if (typeof jsonOutputStyle === 'string') {
      if (metadata.json_output_style_options.some(o => o.value === jsonOutputStyle)) {
        conversion.json_output_style = jsonOutputStyle;
      }
    }

    if (typeof quoteStyle === 'string') {
      if (metadata.quote_style_options.some(o => o.value === quoteStyle)) {
        conversion.quote_style = quoteStyle;
      }
    }

    if (typeof sortObjectKeys === 'boolean') {
      conversion.sort_object_keys = sortObjectKeys;
    }

    if (typeof multiDocumentHandling === 'string') {
      if (metadata.multi_document_handling_options.some(o => o.value === multiDocumentHandling)) {
        conversion.multi_document_handling = multiDocumentHandling;
      }
    }

    conversion.updated_at = this._getNowIso();
    this._saveConversionToHistory(conversion);

    return {
      success: true,
      message: 'Options updated',
      updated_options: {
        indentation: conversion.indentation,
        json_output_style: conversion.json_output_style,
        quote_style: conversion.quote_style,
        sort_object_keys: conversion.sort_object_keys,
        multi_document_handling: conversion.multi_document_handling
      }
    };
  }

  // toggleActiveConversionAutoConvert(enabled)

  toggleActiveConversionAutoConvert(enabled) {
    const conversion = this._getOrCreateActiveConversion();
    const was_auto_convert_enabled = !!conversion.auto_convert_enabled;
    conversion.auto_convert_enabled = !!enabled;
    conversion.updated_at = this._getNowIso();
    this._saveConversionToHistory(conversion);

    // Instrumentation for task completion tracking (task_7: auto-convert toggled off)
    try {
      if (enabled === false && was_auto_convert_enabled) {
        localStorage.setItem('task7_autoConvertToggledOff', 'true');
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting main logic
    }

    return {
      success: true,
      auto_convert_enabled: conversion.auto_convert_enabled,
      message: conversion.auto_convert_enabled ? 'Auto-convert enabled' : 'Auto-convert disabled'
    };
  }

  // convertActiveConversion()

  convertActiveConversion() {
    const conversion = this._getOrCreateActiveConversion();
    const now = this._getNowIso();
    const trimmed = (conversion.source_yaml || '').trim();

    if (!trimmed) {
      conversion.json_output = '';
      conversion.last_converted_at = now;
      conversion.updated_at = now;
      this._saveConversionToHistory(conversion);
      return {
        success: true,
        json_output: '',
        json_output_style: conversion.json_output_style,
        message: 'No YAML to convert',
        error_details: null,
        last_converted_at: conversion.last_converted_at
      };
    }

    const parseResult = this._parseYamlAndGenerateJson(conversion);
    if (!parseResult.success) {
      return {
        success: false,
        json_output: conversion.json_output || '',
        json_output_style: conversion.json_output_style,
        message: 'Failed to parse YAML',
        error_details:
          parseResult.error_details || {
            code: 'yaml_parse_error',
            line: null,
            column: null,
            detail: 'Failed to parse YAML'
          },
        last_converted_at: conversion.last_converted_at
      };
    }

    conversion.json_output = parseResult.json_output;
    conversion.last_converted_at = now;
    conversion.updated_at = now;
    this._saveConversionToHistory(conversion);

    return {
      success: true,
      json_output: conversion.json_output,
      json_output_style: conversion.json_output_style,
      message: 'Conversion successful',
      error_details: null,
      last_converted_at: conversion.last_converted_at
    };
  }

  // copyActiveConversionJsonToClipboard()

  copyActiveConversionJsonToClipboard() {
    const conversion = this._getOrCreateActiveConversion();
    const json = conversion.json_output || '';
    const ok = this._copyToClipboard(json);
    return {
      success: ok,
      json_length: json.length,
      message: ok ? 'JSON copied to clipboard' : 'Failed to copy JSON'
    };
  }

  // downloadActiveConversionJson(filename)

  downloadActiveConversionJson(filename) {
    const conversion = this._getOrCreateActiveConversion();
    const json = conversion.json_output || '';
    const safeFilename = filename || 'conversion.json';

    conversion.last_download_filename = safeFilename;
    conversion.updated_at = this._getNowIso();
    this._saveConversionToHistory(conversion);

    const bytes_written = this._estimateByteLength(json);

    return {
      success: !!json,
      filename: safeFilename,
      bytes_written,
      message: json ? 'Download simulated' : 'No JSON to download'
    };
  }

  // startPrettyVsMinifiedComparisonForActiveConversion()

  startPrettyVsMinifiedComparisonForActiveConversion() {
    const conversion = this._getOrCreateActiveConversion();
    const parseResult = this._parseYamlAndGenerateJson(conversion);

    if (!parseResult.success) {
      const created_at = this._getNowIso();
      return {
        comparison_session_id: null,
        pretty_json: '',
        minified_json: '',
        selected_version: 'pretty',
        created_at
      };
    }

    const session = this._startComparisonSessionForConversion(conversion, parseResult.value);

    return {
      comparison_session_id: session.id,
      pretty_json: session.pretty_json,
      minified_json: session.minified_json,
      selected_version: session.selected_version,
      created_at: session.created_at
    };
  }

  // applyPrettyVsMinifiedSelectionForActiveConversion(selectedVersion)

  applyPrettyVsMinifiedSelectionForActiveConversion(selectedVersion) {
    const conversion = this._getOrCreateActiveConversion();
    const sessions = this._getFromStorage('comparison_sessions');

    const openSessions = sessions.filter(
      s => s.conversion_id === conversion.id && !s.resolved
    );

    if (!openSessions.length) {
      return {
        success: false,
        applied_version: null,
        json_output: conversion.json_output || '',
        message: 'No active comparison session found'
      };
    }

    openSessions.sort((a, b) => {
      const aCreated = a.created_at || '';
      const bCreated = b.created_at || '';
      if (aCreated === bCreated) return 0;
      return aCreated < bCreated ? 1 : -1;
    });

    const session = openSessions[0];
    const version = selectedVersion === 'minified' ? 'minified' : 'pretty';
    const json_output = version === 'pretty' ? session.pretty_json : session.minified_json;

    session.selected_version = version;
    session.resolved = true;

    conversion.json_output = json_output;
    conversion.json_output_style = version;
    conversion.updated_at = this._getNowIso();

    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    }
    this._saveToStorage('comparison_sessions', sessions);
    this._saveConversionToHistory(conversion);

    return {
      success: true,
      applied_version: version,
      json_output,
      message: 'Applied ' + version + ' JSON from comparison'
    };
  }

  // generateShareableLinkForActiveConversion()

  generateShareableLinkForActiveConversion() {
    const conversion = this._getOrCreateActiveConversion();
    return this._createOrReuseShareLink(conversion.id);
  }

  // copyActiveConversionShareLinkToClipboard()

  copyActiveConversionShareLinkToClipboard() {
    const conversion = this._getOrCreateActiveConversion();
    const now = this._getNowIso();
    let shareLinks = this._getFromStorage('share_links');

    const related = shareLinks.filter(sl => sl.conversion_id === conversion.id);
    if (!related.length) {
      return {
        success: false,
        url: '',
        message: 'No share link found for this conversion'
      };
    }

    related.sort((a, b) => {
      const aCreated = a.created_at || '';
      const bCreated = b.created_at || '';
      if (aCreated === bCreated) return 0;
      return aCreated < bCreated ? 1 : -1;
    });

    const link = related[0];
    const ok = this._copyToClipboard(link.url);
    link.last_accessed_at = now;

    const idx = shareLinks.findIndex(sl => sl.id === link.id);
    if (idx >= 0) {
      shareLinks[idx] = link;
      this._saveToStorage('share_links', shareLinks);
    }

    return {
      success: ok,
      url: link.url,
      message: ok ? 'Share link copied to clipboard' : 'Failed to copy share link'
    };
  }

  // setActiveConversionPinned(isPinned)

  setActiveConversionPinned(isPinned) {
    const conversion = this._getOrCreateActiveConversion();
    conversion.is_pinned = !!isPinned;
    conversion.updated_at = this._getNowIso();
    this._saveConversionToHistory(conversion);

    return {
      success: true,
      is_pinned: conversion.is_pinned,
      message: conversion.is_pinned ? 'Conversion pinned' : 'Conversion unpinned'
    };
  }

  // getExamplesForDisplay(category)

  getExamplesForDisplay(category) {
    const examples = this._getFromStorage('examples');
    let filtered = examples;
    let applied = null;

    if (category) {
      filtered = examples.filter(ex => ex.category === category);
      applied = category;

      // Instrumentation for task completion tracking (task_6: example filter params)
      try {
        localStorage.setItem('task6_exampleFilterParams', JSON.stringify({ category: category }));
      } catch (e) {
        // Swallow instrumentation errors to avoid impacting main logic
      }
    }

    filtered = filtered.slice().sort((a, b) => {
      if (a.is_featured === b.is_featured) {
        const aTitle = a.title || '';
        const bTitle = b.title || '';
        return aTitle.localeCompare(bTitle);
      }
      return a.is_featured ? -1 : 1;
    });

    return {
      category_filter_applied: applied,
      examples: filtered
    };
  }

  // getExampleCategoryFilterOptions()

  getExampleCategoryFilterOptions() {
    const examples = this._getFromStorage('examples');
    const categories = ['general', 'shopping', 'profile', 'configuration', 'project', 'task'];

    const options = categories.map(value => {
      const label = this._toTitleCase(value.replace(/_/g, ' '));
      const description = 'Examples in the ' + label.toLowerCase() + ' category.';
      const example_count = examples.filter(ex => ex.category === value).length;
      return { value, label, description, example_count };
    });

    return { categories: options };
  }

  // loadExampleAsActiveConversion(exampleId)

  loadExampleAsActiveConversion(exampleId) {
    const examples = this._getFromStorage('examples');
    const ex = examples.find(e => e.id === exampleId);
    if (!ex) {
      return {
        success: false,
        conversion_id: null,
        title: '',
        source_yaml: '',
        source_example_title: '',
        applied_global_defaults: false,
        created_new_conversion: false,
        message: 'Example not found'
      };
    }

    const now = this._getNowIso();
    let baseConv = {
      id: this._generateId('conv'),
      title: ex.title || 'Example conversion',
      source_yaml: ex.yaml_content || '',
      json_output: '',
      json_output_style: null,
      indentation: null,
      quote_style: null,
      sort_object_keys: null,
      multi_document_handling: null,
      auto_convert_enabled: null,
      is_pinned: false,
      source_example_id: ex.id,
      last_download_filename: '',
      created_at: now,
      updated_at: now,
      last_converted_at: null
    };

    baseConv = this._applyGlobalSettingsToNewConversion(baseConv);

    const conversions = this._getFromStorage('conversions');
    conversions.push(baseConv);
    this._saveToStorage('conversions', conversions);
    localStorage.setItem('active_conversion_id', baseConv.id);

    return {
      success: true,
      conversion_id: baseConv.id,
      title: baseConv.title,
      source_yaml: baseConv.source_yaml,
      source_example_title: ex.title || '',
      applied_global_defaults: true,
      created_new_conversion: true,
      message: 'Example loaded into converter'
    };
  }

  // getGlobalSettingsForDisplay()

  getGlobalSettingsForDisplay() {
    const settings = this._getOrCreateGlobalSettings();
    const meta = this.getSettingsOptionMetadata();

    const themeMeta = meta.theme_options.find(o => o.value === settings.theme);
    const indentMeta = meta.indentation_options.find(o => o.value === settings.default_indentation);
    const quoteMeta = meta.quote_style_options.find(o => o.value === settings.default_quote_style);
    const jsonStyleMeta = meta.json_output_style_options.find(
      o => o.value === settings.default_json_output_style
    );

    return {
      id: settings.id,
      theme: settings.theme,
      default_indentation: settings.default_indentation,
      default_quote_style: settings.default_quote_style,
      sort_object_keys_default: settings.sort_object_keys_default,
      auto_convert_default: settings.auto_convert_default,
      default_json_output_style: settings.default_json_output_style,
      created_at: settings.created_at,
      updated_at: settings.updated_at,
      theme_label: themeMeta ? themeMeta.label : '',
      indentation_label: indentMeta ? indentMeta.label : '',
      quote_style_label: quoteMeta ? quoteMeta.label : '',
      default_json_output_style_label: jsonStyleMeta ? jsonStyleMeta.label : ''
    };
  }

  // getSettingsOptionMetadata()

  getSettingsOptionMetadata() {
    const converterMeta = this.getConverterOptionMetadata();

    const theme_options = [
      {
        value: 'light',
        label: 'Light',
        description: 'Always use the light theme.'
      },
      {
        value: 'dark',
        label: 'Dark',
        description: 'Always use the dark theme.'
      },
      {
        value: 'system',
        label: 'System',
        description: 'Match your operating system appearance settings.'
      }
    ];

    const auto_convert_description =
      'When enabled, YAML is converted to JSON automatically as you type in the editor.';

    return {
      theme_options,
      indentation_options: converterMeta.indentation_options,
      quote_style_options: converterMeta.quote_style_options,
      json_output_style_options: converterMeta.json_output_style_options,
      auto_convert_description
    };
  }

  // updateGlobalSettings(theme, defaultIndentation, defaultQuoteStyle, sortObjectKeysDefault, autoConvertDefault, defaultJsonOutputStyle)

  updateGlobalSettings(
    theme,
    defaultIndentation,
    defaultQuoteStyle,
    sortObjectKeysDefault,
    autoConvertDefault,
    defaultJsonOutputStyle
  ) {
    let settingsArr = this._getFromStorage('global_settings');
    let settings = settingsArr.find(s => s.id === 'default');
    if (!settings) {
      settings = this._getOrCreateGlobalSettings();
      settingsArr = this._getFromStorage('global_settings');
    }

    const meta = this.getSettingsOptionMetadata();

    if (typeof theme === 'string' && meta.theme_options.some(o => o.value === theme)) {
      settings.theme = theme;
    }

    if (
      typeof defaultIndentation === 'string' &&
      meta.indentation_options.some(o => o.value === defaultIndentation)
    ) {
      settings.default_indentation = defaultIndentation;
    }

    if (
      typeof defaultQuoteStyle === 'string' &&
      meta.quote_style_options.some(o => o.value === defaultQuoteStyle)
    ) {
      settings.default_quote_style = defaultQuoteStyle;
    }

    if (typeof sortObjectKeysDefault === 'boolean') {
      settings.sort_object_keys_default = sortObjectKeysDefault;
    }

    if (typeof autoConvertDefault === 'boolean') {
      settings.auto_convert_default = autoConvertDefault;
    }

    if (
      typeof defaultJsonOutputStyle === 'string' &&
      meta.json_output_style_options.some(o => o.value === defaultJsonOutputStyle)
    ) {
      settings.default_json_output_style = defaultJsonOutputStyle;
    }

    settings.updated_at = this._getNowIso();

    const idx = settingsArr.findIndex(s => s.id === settings.id);
    if (idx >= 0) {
      settingsArr[idx] = settings;
    } else {
      settingsArr.push(settings);
    }
    this._saveToStorage('global_settings', settingsArr);

    return {
      success: true,
      settings,
      message: 'Settings updated'
    };
  }

  // getConversionHistoryList(limit, offset)

  getConversionHistoryList(limit, offset) {
    const conversions = this._getFromStorage('conversions');
    const examples = this._getFromStorage('examples');

    const sorted = conversions.slice().sort((a, b) => {
      if (a.is_pinned === b.is_pinned) {
        const aCreated = a.created_at || '';
        const bCreated = b.created_at || '';
        if (aCreated === bCreated) return 0;
        // newest first
        return aCreated < bCreated ? 1 : -1;
      }
      return a.is_pinned ? -1 : 1;
    });

    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    const end =
      typeof limit === 'number' && limit > 0 ? Math.min(start + limit, sorted.length) : sorted.length;

    const slice = sorted.slice(start, end);
    const items = slice.map(conv => {
      const ex = conv.source_example_id
        ? examples.find(e => e.id === conv.source_example_id) || null
        : null;
      return {
        conversion_id: conv.id,
        title: conv.title,
        yaml_snippet_preview: (conv.source_yaml || '').substring(0, 120),
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        last_converted_at: conv.last_converted_at,
        is_pinned: !!conv.is_pinned,
        json_output_style: conv.json_output_style,
        source_example_title: ex ? ex.title : null
      };
    });

    return {
      items,
      total_count: conversions.length
    };
  }

  // openConversionFromHistory(conversionId)

  openConversionFromHistory(conversionId) {
    const conversions = this._getFromStorage('conversions');
    const conv = conversions.find(c => c.id === conversionId);
    if (!conv) {
      return {
        success: false,
        active_conversion_id: null,
        message: 'Conversion not found'
      };
    }
    localStorage.setItem('active_conversion_id', conv.id);
    return {
      success: true,
      active_conversion_id: conv.id,
      message: 'Conversion opened'
    };
  }

  // setConversionPinned(conversionId, isPinned)

  setConversionPinned(conversionId, isPinned) {
    const conversions = this._getFromStorage('conversions');
    const idx = conversions.findIndex(c => c.id === conversionId);
    if (idx === -1) {
      return {
        success: false,
        is_pinned: false,
        message: 'Conversion not found'
      };
    }
    conversions[idx].is_pinned = !!isPinned;
    conversions[idx].updated_at = this._getNowIso();
    this._saveToStorage('conversions', conversions);

    return {
      success: true,
      is_pinned: conversions[idx].is_pinned,
      message: conversions[idx].is_pinned ? 'Conversion pinned' : 'Conversion unpinned'
    };
  }

  // getHelpContent()

  getHelpContent() {
    const sections = [
      {
        id: 'basic_usage',
        title: 'Basic usage',
        slug: 'basic-usage',
        category: 'basic_usage',
        content_html:
          '<p>Type or paste YAML into the left editor, then click <strong>Convert to JSON</strong> to see the result on the right.</p>'
      },
      {
        id: 'formatting_options',
        title: 'Formatting options',
        slug: 'formatting-options',
        category: 'advanced_options',
        content_html:
          '<p>Use the indentation, quote style, output style, and multi-document controls to customize how JSON is generated from your YAML.</p>'
      },
      {
        id: 'history_and_sharing',
        title: 'History & sharing',
        slug: 'history-and-sharing',
        category: 'advanced_options',
        content_html:
          '<p>Every conversion is saved to history. You can reopen, pin, and generate shareable links for past conversions.</p>'
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        slug: 'troubleshooting',
        category: 'troubleshooting',
        content_html:
          '<p>If conversion fails, check the error details (line and column) and ensure your YAML syntax is valid.</p>'
      }
    ];

    return { sections };
  }

  // getAboutPageContent()

  getAboutPageContent() {
    const title = 'About the YAML to JSON Converter';
    const body_html =
      '<p>This tool helps you convert YAML into JSON quickly and safely, with a focus on readability, reproducibility, and transparent formatting options.</p>' +
      '<p>Use it to prepare configuration files, API payloads, test fixtures, and documentation examples.</p>';

    return { title, body_html };
  }

  // getPrivacyPolicyContent()

  getPrivacyPolicyContent() {
    const title = 'Privacy Policy';
    const sections = [
      {
        heading: 'Data storage',
        body_html:
          '<p>Conversion data, settings, and history are stored locally in your browser using localStorage. They are not sent to a server by this business-logic layer.</p>'
      },
      {
        heading: 'Share links',
        body_html:
          '<p>Share links are represented as records that reference a specific conversion. How these links are exposed publicly depends on the hosting application.</p>'
      }
    ];

    return { title, sections };
  }

  // getTermsOfUseContent()

  getTermsOfUseContent() {
    const title = 'Terms of Use';
    const sections = [
      {
        heading: 'Acceptable use',
        body_html:
          '<p>You are responsible for the YAML and JSON content you create with this tool. Do not use it to process unlawful or harmful data.</p>'
      },
      {
        heading: 'No warranty',
        body_html:
          '<p>This converter is provided as-is, without any warranty. Always review generated JSON before using it in production systems.</p>'
      }
    ];

    return { title, sections };
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}