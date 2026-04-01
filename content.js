/**
 * Content script: scans the page for time mentions and adds conversion tooltips.
 */
(function () {
  'use strict';

  if (window.__timeConverterLoaded) return;
  window.__timeConverterLoaded = true;

  const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Build regex parts from timezone maps
  const tzAbbrs = Object.keys(TIMEZONE_MAP)
    .filter(k => !k.includes(' '))
    .sort((a, b) => b.length - a.length)
    .join('|');

  const tzFullNames = Object.keys(TIMEZONE_MAP)
    .filter(k => k.includes(' '))
    .sort((a, b) => b.length - a.length)
    .map(k => k.replace(/\s+/g, '\\s+'))
    .join('|');

  const cityNames = Object.keys(CITY_TIMEZONE_MAP)
    .sort((a, b) => b.length - a.length)
    .map(k => k.replace(/\s+/g, '\\s+'))
    .join('|');

  /**
   * Main regex to match time expressions.
   * Groups:
   *   1: hour
   *   2: minutes (optional, with colon)
   *   3: AM/PM
   *   4: timezone abbreviation OR full name OR city + "time"
   */
  const TIME_PATTERN = new RegExp(
    '\\b' +
    '(1[0-2]|0?[1-9])' +             // hour (1-12)
    '(?:\\s*[:：]\\s*(\\d{2}))?' +     // optional :minutes
    '\\s*' +
    '([AaPp][Mm]?)' +                  // AM/PM (allow single A/P)
    '\\s+' +
    '(?:' +
      '(' + tzFullNames + '|' + tzAbbrs + ')' +  // tz abbreviation or full name
      '|' +
      '(' + cityNames + ')\\s+[Tt]ime' +         // city + "time"
    ')' +
    '(?![\\w])',                        // not followed by word char
    'gi'
  );

  /**
   * Also match "HH:MM TZ" in 24-hour format.
   */
  const TIME_24H_PATTERN = new RegExp(
    '\\b' +
    '([01]?\\d|2[0-3])' +             // hour (0-23)
    '\\s*[:：]\\s*' +
    '(\\d{2})' +                       // minutes
    '\\s+' +
    '(?:' +
      '(' + tzFullNames + '|' + tzAbbrs + ')' +
      '|' +
      '(' + cityNames + ')\\s+[Tt]ime' +
    ')' +
    '(?![\\w])',
    'gi'
  );

  // Relative date keywords regex
  const RELATIVE_DATE_PATTERN = /\b(today|tonight|this\s+(?:evening|afternoon|morning)|tomorrow(?:\s+(?:night|evening|morning|afternoon))?|yesterday|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;

  const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  /**
   * Find the nearest <time datetime="..."> element by walking up the DOM.
   * On X/Twitter, tweets are wrapped in <article> elements containing a <time>.
   */
  function findPostTimestamp(element) {
    let current = element;
    for (let i = 0; i < 15 && current && current !== document.body; i++) {
      const timeEl = current.querySelector && current.querySelector('time[datetime]');
      if (timeEl) {
        const d = new Date(timeEl.getAttribute('datetime'));
        if (!isNaN(d.getTime())) return d;
      }
      if (current.tagName === 'ARTICLE') {
        // On X, don't go above the article boundary
        break;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Get surrounding text content for relative date word detection.
   * Walks up to the nearest block-level ancestor to capture context like
   * "Tomorrow night at 9PM ET" even if split across DOM nodes.
   */
  function getSurroundingText(textNode) {
    let el = textNode.parentElement;
    // Walk up to a reasonable container (max 5 levels)
    for (let i = 0; i < 5 && el; i++) {
      const text = el.textContent || '';
      if (text.length > 20) return text.slice(0, 500);
      el = el.parentElement;
    }
    return textNode.textContent || '';
  }

  /**
   * Parse relative date words and resolve them against the post timestamp
   * in the SOURCE timezone (not UTC, not local).
   *
   * Example: post at UTC 2026-03-31T23:48 → in ET (EDT, UTC-4) = March 31
   *          "Tomorrow" → March 31 + 1 = April 1 (in ET)
   *
   * Returns { year, month, day } in the source timezone, or null.
   */
  function parseRelativeDateWord(text, postDate, sourceTzIana) {
    const match = RELATIVE_DATE_PATTERN.exec(text);
    if (!match) return null;

    const keyword = match[1].toLowerCase().replace(/\s+/g, ' ');

    // Get the post's calendar date in the SOURCE timezone
    const postDateStr = postDate.toLocaleDateString('en-CA', { timeZone: sourceTzIana });
    const [pYear, pMonth, pDay] = postDateStr.split('-').map(Number);

    // Create a date object for arithmetic (using UTC to avoid local TZ interference)
    const baseDate = new Date(Date.UTC(pYear, pMonth - 1, pDay));

    let dayOffset = 0;

    if (keyword === 'today' || keyword === 'tonight' ||
        keyword.startsWith('this ')) {
      dayOffset = 0;
    } else if (keyword.startsWith('tomorrow')) {
      dayOffset = 1;
    } else if (keyword === 'yesterday') {
      dayOffset = -1;
    } else if (keyword.startsWith('next ')) {
      const targetDay = keyword.split(' ')[1];
      const targetIdx = WEEKDAY_NAMES.indexOf(targetDay);
      if (targetIdx === -1) return null;
      const currentIdx = baseDate.getUTCDay();
      dayOffset = ((targetIdx - currentIdx + 7) % 7) || 7; // always 1-7 days forward
    } else {
      return null;
    }

    baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);

    return {
      year: baseDate.getUTCFullYear(),
      month: baseDate.getUTCMonth() + 1,
      day: baseDate.getUTCDate(),
    };
  }

  /**
   * Convert a detected time to the user's local timezone.
   * Uses the Intl API which internally uses the IANA timezone database,
   * so DST is handled correctly based on the actual date.
   *
   * @param {string} hour
   * @param {string} minute
   * @param {string|null} ampm
   * @param {string} sourceTzIana - IANA timezone of the source time
   * @param {{year:number, month:number, day:number}|null} eventDate - resolved event date in source TZ
   */
  function convertTime(hour, minute, ampm, sourceTzIana, eventDate) {
    let h = parseInt(hour, 10);
    const m = parseInt(minute || '0', 10);

    if (ampm !== null) {
      const ap = ampm.toUpperCase();
      if ((ap === 'PM' || ap === 'P') && h !== 12) h += 12;
      if ((ap === 'AM' || ap === 'A') && h === 12) h = 0;
    }

    let bestDate = null;

    if (eventDate) {
      // We have a resolved event date — use it directly
      const isoStr = `${eventDate.year}-${String(eventDate.month).padStart(2, '0')}-${String(eventDate.day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      bestDate = findUTCForLocalTime(isoStr, sourceTzIana);
    } else {
      // Fallback: try today, tomorrow, yesterday relative to now
      const now = new Date();
      const candidates = [0, 1, -1];

      for (const dayOffset of candidates) {
        const d = new Date(now);
        d.setDate(d.getDate() + dayOffset);

        const dateStr = d.toLocaleDateString('en-CA', { timeZone: sourceTzIana });
        const [year, month, day] = dateStr.split('-').map(Number);

        const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

        const utcDate = findUTCForLocalTime(isoStr, sourceTzIana);
        if (utcDate && dayOffset === 0) {
          bestDate = utcDate;
          break;
        }
        if (!bestDate && utcDate) bestDate = utcDate;
      }
    }

    if (!bestDate) return null;

    // Format in local timezone
    const localFormatted = bestDate.toLocaleTimeString('en-US', {
      timeZone: LOCAL_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Get the local date string for badge display
    const localDateStr = bestDate.toLocaleDateString('en-US', {
      timeZone: LOCAL_TZ,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Get the local timezone abbreviation
    const localTzAbbr = getTimezoneAbbr(LOCAL_TZ, bestDate);

    // Check if source is in DST
    const isDST = isInDST(sourceTzIana, bestDate);

    return {
      localTime: localFormatted,
      localTzAbbr,
      localTz: LOCAL_TZ,
      localDateStr,
      isDST,
      utcDate: bestDate,
    };
  }

  /**
   * Find the UTC Date that corresponds to a given local time string in a timezone.
   * This properly handles DST transitions.
   */
  function findUTCForLocalTime(localISOStr, timezone) {
    // Use binary search approach: guess UTC, check what local time it maps to
    const guess = new Date(localISOStr + 'Z');
    const maxIter = 5;

    let current = guess;
    for (let i = 0; i < maxIter; i++) {
      const localStr = current.toLocaleString('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).replace(',', '');

      // Parse the formatted local time
      const match = localStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (!match) return current;

      const actualLocal = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
      const target = new Date(localISOStr + 'Z');
      const diff = target - actualLocal;

      if (Math.abs(diff) < 60000) return current; // within 1 minute
      current = new Date(current.getTime() + diff);
    }

    return current;
  }

  /**
   * Determine if a timezone is currently observing DST at the given date.
   */
  function isInDST(timezone, date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);

    const janOffset = getTimezoneOffset(timezone, jan);
    const julOffset = getTimezoneOffset(timezone, jul);

    if (janOffset === julOffset) return false; // no DST in this timezone

    const currentOffset = getTimezoneOffset(timezone, date);
    const standardOffset = Math.max(janOffset, julOffset); // standard time has larger offset (more negative)
    return currentOffset !== standardOffset;
  }

  function getTimezoneOffset(timezone, date) {
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
    return (new Date(utcStr) - new Date(tzStr)) / 60000;
  }

  function getTimezoneAbbr(timezone, date) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      }).formatToParts(date);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart ? tzPart.value : '';
    } catch {
      return '';
    }
  }

  function resolveTimezone(tzStr) {
    if (!tzStr) return null;
    const upper = tzStr.toUpperCase().replace(/\s+/g, ' ').trim();
    return TIMEZONE_MAP[upper] || CITY_TIMEZONE_MAP[upper] || null;
  }

  /**
   * Check if two IANA timezones are effectively the same right now
   * (same UTC offset), so we can skip showing the badge.
   */
  function isSameTimezone(tz1, tz2) {
    if (tz1 === tz2) return true;
    const now = new Date();
    return getTimezoneOffset(tz1, now) === getTimezoneOffset(tz2, now);
  }

  // --- DOM scanning and annotation ---

  const PROCESSED_ATTR = 'data-tz-converted';
  const TOOLTIP_CLASS = 'tz-converter-tooltip';
  const WRAPPER_CLASS = 'tz-converter-wrapper';

  function processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || text.length < 4) return;

    const parent = textNode.parentElement;
    if (!parent) return;
    if (parent.closest(`.${WRAPPER_CLASS}`)) return;
    if (parent.hasAttribute(PROCESSED_ATTR)) return;
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
        parent.tagName === 'TEXTAREA' || parent.tagName === 'INPUT' ||
        parent.tagName === 'NOSCRIPT' || parent.isContentEditable) return;

    const matches = [];

    // 12-hour format
    let match;
    TIME_PATTERN.lastIndex = 0;
    while ((match = TIME_PATTERN.exec(text)) !== null) {
      const tzKey = match[4] || match[5];
      const ianaZone = resolveTimezone(tzKey);
      if (!ianaZone) continue;
      if (isSameTimezone(ianaZone, LOCAL_TZ)) continue;

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        fullMatch: match[0],
        hour: match[1],
        minute: match[2] || '00',
        ampm: match[3],
        ianaZone,
      });
    }

    // 24-hour format
    TIME_24H_PATTERN.lastIndex = 0;
    while ((match = TIME_24H_PATTERN.exec(text)) !== null) {
      const tzKey = match[3] || match[4];
      const ianaZone = resolveTimezone(tzKey);
      if (!ianaZone) continue;
      if (isSameTimezone(ianaZone, LOCAL_TZ)) continue;

      // Check overlap with existing matches
      const overlaps = matches.some(m =>
        match.index < m.end && match.index + match[0].length > m.start
      );
      if (overlaps) continue;

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        fullMatch: match[0],
        hour: match[1],
        minute: match[2],
        ampm: null, // 24h format
        ianaZone,
      });
    }

    if (matches.length === 0) return;

    // Sort by position
    matches.sort((a, b) => a.start - b.start);

    // --- Date inference ---
    // Extract post timestamp from nearby <time> element (e.g. on X/Twitter)
    const postTimestamp = findPostTimestamp(textNode.parentElement);
    // Get surrounding text to search for relative date words ("tomorrow", etc.)
    const surroundingText = postTimestamp ? getSurroundingText(textNode) : '';

    for (const m of matches) {
      let eventDate = null;
      if (postTimestamp) {
        // Try to find a relative date word and resolve it in the SOURCE timezone
        eventDate = parseRelativeDateWord(surroundingText, postTimestamp, m.ianaZone);
        if (!eventDate) {
          // No relative word — use the post's date in source TZ as fallback
          const dateStr = postTimestamp.toLocaleDateString('en-CA', { timeZone: m.ianaZone });
          const [year, month, day] = dateStr.split('-').map(Number);
          eventDate = { year, month, day };
        }
      }
      m.eventDate = eventDate;
    }

    // Today's date in local timezone (for deciding whether to show date in badge)
    const todayLocal = new Date().toLocaleDateString('en-CA', { timeZone: LOCAL_TZ });

    // Build replacement fragment
    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    for (const m of matches) {
      // Text before match
      if (m.start > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, m.start)));
      }

      const result = convertTime(m.hour, m.minute, m.ampm, m.ianaZone, m.eventDate);
      if (result) {
        const wrapper = document.createElement('span');
        wrapper.className = WRAPPER_CLASS;
        wrapper.setAttribute(PROCESSED_ATTR, '1');

        const original = document.createElement('span');
        original.textContent = m.fullMatch;
        original.className = 'tz-converter-original';
        wrapper.appendChild(original);

        const badge = document.createElement('span');
        badge.className = TOOLTIP_CLASS;

        const dstNote = result.isDST ? ' (DST)' : '';
        // Show date only when the event is not today in the user's local timezone
        const eventLocal = result.utcDate.toLocaleDateString('en-CA', { timeZone: LOCAL_TZ });
        const dateSuffix = (eventLocal !== todayLocal) ? ` ${result.localDateStr}` : '';
        badge.textContent = `${result.localTime} ${result.localTzAbbr}${dateSuffix}`;
        badge.title = `Converted from ${m.ianaZone}${dstNote} to ${result.localTz}\nYour local time: ${result.localTime} ${result.localTzAbbr}${dateSuffix}`;

        wrapper.appendChild(badge);
        frag.appendChild(wrapper);
      } else {
        frag.appendChild(document.createTextNode(m.fullMatch));
      }

      lastIndex = m.end;
    }

    // Remaining text
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.replaceWith(frag);
  }

  function scanNode(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(`.${WRAPPER_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    for (const node of nodes) {
      try {
        processTextNode(node);
      } catch (e) {
        // silently ignore individual node errors
      }
    }
  }

  // Initial scan
  scanNode(document.body);

  // Observe dynamic content (SPA like X/Twitter)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanNode(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          try { processTextNode(node); } catch {}
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
